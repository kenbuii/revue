-- Revue Database Schema - Comprehensive Edition
-- This file is idempotent and can be run multiple times safely
-- It handles all database setup including tables, triggers, functions, and policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    email_hash TEXT, -- For privacy-friendly contact matching
    onboarding_completed BOOLEAN DEFAULT FALSE,
    contact_sync_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'email_hash') THEN
        ALTER TABLE user_profiles ADD COLUMN email_hash TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'contact_sync_enabled') THEN
        ALTER TABLE user_profiles ADD COLUMN contact_sync_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- User media preferences table
CREATE TABLE IF NOT EXISTS user_media_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    media_id TEXT NOT NULL, -- From external APIs (tmdb_movie_123, book_456, etc.)
    title TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'book')),
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT NOT NULL CHECK (source IN ('tmdb', 'google_books', 'popular')),
    original_api_id TEXT, -- Original ID from external API
    added_during_onboarding BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, media_id)
);

-- User bookmarks table
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL, -- ID of the bookmarked post/media
    media_id TEXT, -- Reference to media being reviewed
    media_title TEXT NOT NULL,
    media_type TEXT, -- 'movie', 'tv', 'book', etc.
    media_cover TEXT, -- Cover image URL
    post_title TEXT, -- Title of the review/post
    post_content TEXT, -- Content of the review/post
    post_author_name TEXT, -- Name of the post author
    post_author_avatar TEXT, -- Avatar of the post author
    post_date TIMESTAMP WITH TIME ZONE,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- User connections/friendships table
CREATE TABLE IF NOT EXISTS user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    connection_type TEXT DEFAULT 'friend' CHECK (connection_type IN ('friend', 'follow', 'block')),
    discovered_via TEXT DEFAULT 'contacts' CHECK (discovered_via IN ('contacts', 'search', 'mutual', 'invite')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Contact invitations table (for users not yet on platform)
CREATE TABLE IF NOT EXISTS contact_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL, -- Hashed email for privacy
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(inviter_id, email_hash)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_hash ON user_profiles(email_hash);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_user_id ON user_media_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_media_type ON user_media_preferences(media_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_friend_id ON user_connections(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_bookmarked_at ON user_bookmarks(bookmarked_at);
CREATE INDEX IF NOT EXISTS idx_contact_invitations_email_hash ON contact_invitations(email_hash);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile when auth user is created
-- Drop existing versions to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        username, 
        display_name,
        email_hash,
        onboarding_completed,
        contact_sync_enabled
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'email_hash', encode(digest(NEW.email, 'sha256'), 'hex')),
        FALSE,
        FALSE
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail auth creation
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop ALL conflicting versions of save_user_onboarding_data
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_username TEXT, p_display_name TEXT, p_avatar_url TEXT, p_onboarding_completed BOOLEAN, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_avatar_url TEXT, p_contact_sync_enabled BOOLEAN, p_display_name TEXT, p_media_preferences JSONB, p_onboarding_completed BOOLEAN);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_display_name TEXT, p_avatar_url TEXT, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB, p_onboarding_completed BOOLEAN);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_display_name TEXT, p_avatar_url TEXT, p_onboarding_completed BOOLEAN, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB);

-- Create the SINGLE, definitive version of save_user_onboarding_data
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_media_preferences JSONB DEFAULT '[]'::JSONB,
    p_onboarding_completed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
BEGIN
    -- Update user profile
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Clear existing media preferences if we're updating them
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        DELETE FROM user_media_preferences WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        INSERT INTO user_media_preferences (
            user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
        )
        SELECT 
            p_user_id,
            (item->>'media_id')::TEXT,
            (item->>'title')::TEXT,
            (item->>'media_type')::TEXT,
            (item->>'year')::TEXT,
            (item->>'image_url')::TEXT,
            (item->>'description')::TEXT,
            (item->>'source')::TEXT,
            (item->>'original_api_id')::TEXT,
            TRUE
        FROM jsonb_array_elements(p_media_preferences) AS item
        WHERE (item->>'media_id') IS NOT NULL;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for finding users by email hash (for contact sync)
CREATE OR REPLACE FUNCTION public.find_users_by_email_hash(p_email_hashes TEXT[])
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.username,
        up.display_name,
        up.avatar_url
    FROM user_profiles up
    WHERE up.email_hash = ANY(p_email_hashes)
    AND up.onboarding_completed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's media preferences
CREATE OR REPLACE FUNCTION public.get_user_media_preferences(p_user_id UUID)
RETURNS TABLE (
    media_id TEXT,
    title TEXT,
    media_type TEXT,
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ump.media_id,
        ump.title,
        ump.media_type,
        ump.year,
        ump.image_url,
        ump.description,
        ump.source
    FROM user_media_preferences ump
    WHERE ump.user_id = p_user_id
    ORDER BY ump.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's bookmarks
CREATE OR REPLACE FUNCTION public.get_user_bookmarks(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    post_id TEXT,
    media_id TEXT,
    media_title TEXT,
    media_type TEXT,
    media_cover TEXT,
    post_title TEXT,
    post_content TEXT,
    post_author_name TEXT,
    post_author_avatar TEXT,
    post_date TIMESTAMP WITH TIME ZONE,
    bookmarked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.post_id,
        ub.media_id,
        ub.media_title,
        ub.media_type,
        ub.media_cover,
        ub.post_title,
        ub.post_content,
        ub.post_author_name,
        ub.post_author_avatar,
        ub.post_date,
        ub.bookmarked_at
    FROM user_bookmarks ub
    WHERE ub.user_id = p_user_id
    ORDER BY ub.bookmarked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a bookmark
CREATE OR REPLACE FUNCTION public.add_bookmark(
    p_user_id UUID,
    p_post_id TEXT,
    p_media_id TEXT,
    p_media_title TEXT,
    p_media_type TEXT DEFAULT NULL,
    p_media_cover TEXT DEFAULT NULL,
    p_post_title TEXT DEFAULT NULL,
    p_post_content TEXT DEFAULT NULL,
    p_post_author_name TEXT DEFAULT NULL,
    p_post_author_avatar TEXT DEFAULT NULL,
    p_post_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO user_bookmarks (
        user_id, post_id, media_id, media_title, media_type, media_cover,
        post_title, post_content, post_author_name, post_author_avatar, post_date
    )
    VALUES (
        p_user_id, p_post_id, p_media_id, p_media_title, p_media_type, p_media_cover,
        p_post_title, p_post_content, p_post_author_name, p_post_author_avatar, p_post_date
    )
    ON CONFLICT (user_id, post_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'message', 'Bookmark added');
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a bookmark
CREATE OR REPLACE FUNCTION public.remove_bookmark(p_user_id UUID, p_post_id TEXT)
RETURNS JSONB AS $$
BEGIN
    DELETE FROM user_bookmarks WHERE user_id = p_user_id AND post_id = p_post_id;
    RETURN jsonb_build_object('success', true, 'message', 'Bookmark removed');
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile when auth user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_media_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow trigger to insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view profiles" ON user_profiles
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for user_media_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_media_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_media_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_media_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_media_preferences;

CREATE POLICY "Users can view own preferences" ON user_media_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_media_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_media_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_media_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_bookmarks
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON user_bookmarks;

CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_connections
DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;

CREATE POLICY "Users can view own connections" ON user_connections
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for contact_invitations
DROP POLICY IF EXISTS "Users can manage own invitations" ON contact_invitations;

CREATE POLICY "Users can manage own invitations" ON contact_invitations
    FOR ALL USING (auth.uid() = inviter_id);

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant table permissions
GRANT ALL ON user_profiles TO anon, authenticated;
GRANT ALL ON user_media_preferences TO anon, authenticated;
GRANT ALL ON user_bookmarks TO anon, authenticated;
GRANT ALL ON user_connections TO anon, authenticated;
GRANT ALL ON contact_invitations TO anon, authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, TEXT, BOOLEAN, JSONB, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO anon, authenticated;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Revue database schema applied successfully!';
    RAISE NOTICE '🎯 Features enabled:';
    RAISE NOTICE '  - User profile creation trigger';
    RAISE NOTICE '  - Onboarding data storage';
    RAISE NOTICE '  - Media preferences management';
    RAISE NOTICE '  - Bookmark system';
    RAISE NOTICE '  - Contact sync foundation';
    RAISE NOTICE '  - Row Level Security policies';
    RAISE NOTICE '🚀 Your app should now work perfectly for user registration!';
END $$; 