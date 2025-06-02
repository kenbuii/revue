-- Revue Database Schema
-- This file contains all the database tables and functions needed for user profiles and preferences

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Contact invitations table (for users not yet on platform)
CREATE TABLE IF NOT EXISTS contact_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL, -- Hashed email for privacy
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(inviter_id, email_hash)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_hash ON user_profiles(email_hash);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_user_id ON user_media_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_media_type ON user_media_preferences(media_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_friend_id ON user_connections(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_bookmarked_at ON user_bookmarks(bookmarked_at);
CREATE INDEX IF NOT EXISTS idx_contact_invitations_email_hash ON contact_invitations(email_hash);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        username, 
        display_name,
        email_hash
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'email_hash', encode(digest(NEW.email, 'sha256'), 'hex'))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC function for finding users by email hash (for contact sync)
CREATE OR REPLACE FUNCTION public.find_users_by_email_hash(email_hashes TEXT[])
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
    WHERE up.email_hash = ANY(email_hashes)
    AND up.onboarding_completed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get user's media preferences
CREATE OR REPLACE FUNCTION public.get_user_media_preferences(target_user_id UUID)
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
    WHERE ump.user_id = target_user_id
    ORDER BY ump.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get user's bookmarks
CREATE OR REPLACE FUNCTION public.get_user_bookmarks(target_user_id UUID)
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
    WHERE ub.user_id = target_user_id
    ORDER BY ub.bookmarked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to add a bookmark
CREATE OR REPLACE FUNCTION public.add_bookmark(
    target_user_id UUID,
    p_post_id TEXT,
    p_media_id TEXT DEFAULT NULL,
    p_media_title TEXT DEFAULT '',
    p_media_type TEXT DEFAULT NULL,
    p_media_cover TEXT DEFAULT NULL,
    p_post_title TEXT DEFAULT NULL,
    p_post_content TEXT DEFAULT NULL,
    p_post_author_name TEXT DEFAULT '',
    p_post_author_avatar TEXT DEFAULT NULL,
    p_post_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO user_bookmarks (
        user_id,
        post_id,
        media_id,
        media_title,
        media_type,
        media_cover,
        post_title,
        post_content,
        post_author_name,
        post_author_avatar,
        post_date
    ) VALUES (
        target_user_id,
        p_post_id,
        p_media_id,
        p_media_title,
        p_media_type,
        p_media_cover,
        p_post_title,
        p_post_content,
        p_post_author_name,
        p_post_author_avatar,
        p_post_date
    ) ON CONFLICT (user_id, post_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'bookmarked_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to remove a bookmark
CREATE OR REPLACE FUNCTION public.remove_bookmark(
    target_user_id UUID,
    p_post_id TEXT
)
RETURNS JSONB AS $$
BEGIN
    DELETE FROM user_bookmarks 
    WHERE user_id = target_user_id AND post_id = p_post_id;

    RETURN jsonb_build_object('success', true, 'removed_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to save user onboarding data
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    target_user_id UUID,
    p_username TEXT DEFAULT NULL,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_onboarding_completed BOOLEAN DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT NULL,
    p_media_preferences JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    media_item JSONB;
BEGIN
    -- Update user profile
    UPDATE user_profiles SET
        username = COALESCE(p_username, username),
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        onboarding_completed = COALESCE(p_onboarding_completed, onboarding_completed),
        contact_sync_enabled = COALESCE(p_contact_sync_enabled, contact_sync_enabled),
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Handle media preferences if provided
    IF p_media_preferences IS NOT NULL THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = target_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        FOR media_item IN SELECT * FROM jsonb_array_elements(p_media_preferences)
        LOOP
            INSERT INTO user_media_preferences (
                user_id,
                media_id,
                title,
                media_type,
                year,
                image_url,
                description,
                source,
                original_api_id,
                added_during_onboarding
            ) VALUES (
                target_user_id,
                media_item->>'id',
                media_item->>'title',
                media_item->>'type',
                media_item->>'year',
                media_item->>'image',
                media_item->>'description',
                media_item->>'source',
                media_item->>'originalId',
                TRUE
            ) ON CONFLICT (user_id, media_id) DO UPDATE SET
                title = EXCLUDED.title,
                media_type = EXCLUDED.media_type,
                year = EXCLUDED.year,
                image_url = EXCLUDED.image_url,
                description = EXCLUDED.description,
                source = EXCLUDED.source,
                original_api_id = EXCLUDED.original_api_id;
        END LOOP;
    END IF;

    result := jsonb_build_object('success', true, 'updated_at', NOW());
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_media_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_invitations ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and public profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON user_profiles
    FOR SELECT USING (onboarding_completed = TRUE);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can manage their own media preferences
CREATE POLICY "Users can manage own media preferences" ON user_media_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Users can view media preferences of completed profiles
CREATE POLICY "Users can view public media preferences" ON user_media_preferences
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM user_profiles 
            WHERE onboarding_completed = TRUE
        )
    );

-- Users can manage their own connections
CREATE POLICY "Users can manage own connections" ON user_connections
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can manage their own invitations
CREATE POLICY "Users can manage own invitations" ON contact_invitations
    FOR ALL USING (auth.uid() = inviter_id);

-- Users can manage their own connections
CREATE POLICY "Users can view their own connections" ON user_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own connections" ON user_connections FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own bookmarks
CREATE POLICY "Users can view their own bookmarks" ON user_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Contact invitations policies
CREATE POLICY "Users can view their own contact invitations" ON contact_invitations FOR SELECT USING (auth.uid() = inviter_id);
CREATE POLICY "Users can manage their own contact invitations" ON contact_invitations FOR ALL USING (auth.uid() = inviter_id); 