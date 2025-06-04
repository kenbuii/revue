-- =======================================
-- COMPLETE SCHEMA WITH FUNCTIONS
-- Combines modern table structure + essential functions
-- =======================================

BEGIN;

-- Drop all existing tables and functions
DROP TABLE IF EXISTS list_items CASCADE;
DROP TABLE IF EXISTS user_lists CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS user_bookmarks CASCADE;
DROP TABLE IF EXISTS user_media_preferences CASCADE;
DROP TABLE IF EXISTS user_connections CASCADE;
DROP TABLE IF EXISTS contact_invitations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS media_items CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS find_users_by_email_hash(TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS get_user_media_preferences(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_bookmarks(UUID) CASCADE;
DROP FUNCTION IF EXISTS save_user_onboarding_data(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB) CASCADE;
DROP FUNCTION IF EXISTS add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS remove_bookmark(UUID, TEXT) CASCADE;

-- ==========================================
-- CREATE CORE TABLES
-- ==========================================

-- Media items table
CREATE TABLE media_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    media_type TEXT DEFAULT 'book' CHECK (media_type IN ('book', 'movie', 'tv_show', 'podcast', 'audiobook')),
    author TEXT DEFAULT '',
    description TEXT DEFAULT '',
    cover_image_url TEXT DEFAULT '',
    publication_date DATE,
    isbn TEXT DEFAULT '',
    average_rating DECIMAL(3,1) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    popularity_score DECIMAL(8,2) DEFAULT 0,
    external_id TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    email_hash TEXT, -- For privacy-friendly contact matching
    onboarding_completed BOOLEAN DEFAULT false,
    contact_sync_enabled BOOLEAN DEFAULT false,
    media_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User media preferences table (from original schema)
CREATE TABLE user_media_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
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

-- User connections/friendships table (from original schema)
CREATE TABLE user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    friend_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    connection_type TEXT DEFAULT 'friend' CHECK (connection_type IN ('friend', 'follow', 'block')),
    discovered_via TEXT DEFAULT 'contacts' CHECK (discovered_via IN ('contacts', 'search', 'mutual', 'invite')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- User bookmarks table (from original schema)
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    media_id TEXT DEFAULT NULL,
    media_title TEXT DEFAULT '',
    media_type TEXT DEFAULT NULL,
    media_cover TEXT DEFAULT NULL,
    post_title TEXT DEFAULT NULL,
    post_content TEXT DEFAULT NULL,
    post_author_name TEXT DEFAULT '',
    post_author_avatar TEXT DEFAULT NULL,
    post_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, post_id)
);

-- Contact invitations table (from original schema)
CREATE TABLE contact_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    email_hash TEXT NOT NULL,
    invitation_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(inviter_id, email_hash)
);

-- Modern social tables
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_item_id TEXT REFERENCES media_items(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    contains_spoilers BOOLEAN DEFAULT false,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- ==========================================
-- CREATE INDEXES
-- ==========================================
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_email_hash ON user_profiles(email_hash);
CREATE INDEX idx_user_media_preferences_user_id ON user_media_preferences(user_id);
CREATE INDEX idx_user_media_preferences_media_type ON user_media_preferences(media_type);
CREATE INDEX idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX idx_user_connections_friend_id ON user_connections(friend_id);
CREATE INDEX idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_bookmarked_at ON user_bookmarks(bookmarked_at);
CREATE INDEX idx_contact_invitations_email_hash ON contact_invitations(email_hash);
CREATE INDEX idx_media_items_title ON media_items(title);
CREATE INDEX idx_media_items_media_type ON media_items(media_type);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- ==========================================
-- CREATE ESSENTIAL FUNCTIONS
-- ==========================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id, 
        username, 
        display_name,
        email_hash
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'email_hash', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
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
        up.user_id,
        up.username,
        up.display_name,
        up.avatar_url
    FROM user_profiles up
    WHERE up.email_hash = ANY(email_hashes)
    AND up.onboarding_completed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get user's media preferences
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
    ORDER BY ump.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get user's bookmarks
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

-- RPC function to save user onboarding data
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
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
    WHERE user_id = p_user_id;

    -- Handle media preferences if provided
    IF p_media_preferences IS NOT NULL THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
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
                p_user_id,
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

-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_media_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- CREATE RLS POLICIES
-- ==========================================

-- Users can read their own profile and public profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public profiles" ON user_profiles
    FOR SELECT USING (onboarding_completed = TRUE);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own media preferences
CREATE POLICY "Users can manage own media preferences" ON user_media_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Users can view media preferences of completed profiles
CREATE POLICY "Users can view public media preferences" ON user_media_preferences
    FOR SELECT USING (
        user_id IN (
            SELECT user_id FROM user_profiles 
            WHERE onboarding_completed = TRUE
        )
    );

-- Media items policies  
CREATE POLICY "Anyone can view media items" ON media_items FOR SELECT USING (true);

-- Users can manage their own bookmarks
CREATE POLICY "Users can view their own bookmarks" ON user_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "Users can view public posts" ON posts FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Other policies
CREATE POLICY "Users can view post likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own post likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON user_follows FOR ALL USING (auth.uid() = follower_id);

COMMIT;

-- Success message
SELECT 'Complete Schema with Functions loaded successfully! 🎉' as status,
       'All tables, functions, and RLS policies created' as details; 