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

-- Drop existing policies if they exist (to allow re-running schema)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own media preferences" ON user_media_preferences;
DROP POLICY IF EXISTS "Users can view public media preferences" ON user_media_preferences;
DROP POLICY IF EXISTS "Users can manage own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can view their own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can manage their own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON user_bookmarks;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON user_bookmarks;
DROP POLICY IF EXISTS "Users can view their own contact invitations" ON contact_invitations;
DROP POLICY IF EXISTS "Users can manage their own contact invitations" ON contact_invitations;
DROP POLICY IF EXISTS "Users can manage own invitations" ON contact_invitations;

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
CREATE POLICY "Users can view their own connections" ON user_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own connections" ON user_connections FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own bookmarks
CREATE POLICY "Users can view their own bookmarks" ON user_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own bookmarks" ON user_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Contact invitations policies
CREATE POLICY "Users can view their own contact invitations" ON contact_invitations FOR SELECT USING (auth.uid() = inviter_id);
CREATE POLICY "Users can manage their own contact invitations" ON contact_invitations FOR ALL USING (auth.uid() = inviter_id);

-- ============================================================================
-- COMMUNITY MEDIA FEATURES EXTENSION
-- Tables and functions for media community stats and reviews
-- ============================================================================

-- Central media items table for consistent media metadata
CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY, -- Consistent media_id (e.g., "tmdb_movie_123", "book_456")
    title TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'book')),
    year TEXT,
    image_url TEXT,
    description TEXT,
    author TEXT, -- For books
    director TEXT, -- For movies/TV
    genre TEXT,
    source TEXT NOT NULL CHECK (source IN ('tmdb', 'google_books', 'popular')),
    original_api_id TEXT, -- Original ID from external API
    metadata JSONB, -- Additional metadata as needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts/Reviews table for user-generated content about media
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    media_id TEXT REFERENCES media_items(id),
    title TEXT, -- Optional post title
    content TEXT NOT NULL,
    rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10), -- 0.0 to 10.0 rating
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video')),
    tags TEXT[], -- Array of tags
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reading status tracking (extends user_media_preferences)
-- Add status column to existing user_media_preferences if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_media_preferences' AND column_name = 'status'
    ) THEN
        ALTER TABLE user_media_preferences 
        ADD COLUMN status TEXT DEFAULT 'reading' CHECK (status IN ('reading', 'want_to_read', 'completed', 'dropped', 'on_hold'));
    END IF;
END $$;

-- Post likes table for tracking who liked what
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Post comments table
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- For nested comments
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_items_media_type ON media_items(media_type);
CREATE INDEX IF NOT EXISTS idx_media_items_source ON media_items(source);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_media_id ON posts(media_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_rating ON posts(rating);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_status ON user_media_preferences(status);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_media_id ON user_media_preferences(media_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_media_items_updated_at 
    BEFORE UPDATE ON media_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at 
    BEFORE UPDATE ON post_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMUNITY STATISTICS AND DISCOVERY FUNCTIONS
-- ============================================================================

-- Function to get comprehensive media community stats
CREATE OR REPLACE FUNCTION public.get_media_community_stats(p_media_id TEXT)
RETURNS JSONB AS $$
DECLARE
    total_revues INTEGER;
    avg_rating DECIMAL(3,1);
    reading_count INTEGER;
    want_to_read_count INTEGER;
    completed_count INTEGER;
    result JSONB;
BEGIN
    -- Count total reviews for this media
    SELECT COUNT(*) INTO total_revues
    FROM posts 
    WHERE media_id = p_media_id AND is_public = TRUE;

    -- Calculate average rating
    SELECT ROUND(AVG(rating)::numeric, 1) INTO avg_rating
    FROM posts 
    WHERE media_id = p_media_id AND rating IS NOT NULL AND is_public = TRUE;

    -- Count users currently reading
    SELECT COUNT(*) INTO reading_count
    FROM user_media_preferences 
    WHERE media_id = p_media_id AND status = 'reading';

    -- Count users who want to read (from bookmarks + want_to_read status)
    SELECT COUNT(DISTINCT user_id) INTO want_to_read_count
    FROM (
        SELECT user_id FROM user_bookmarks WHERE media_id = p_media_id
        UNION
        SELECT user_id FROM user_media_preferences WHERE media_id = p_media_id AND status = 'want_to_read'
    ) combined;

    -- Count users who completed
    SELECT COUNT(*) INTO completed_count
    FROM user_media_preferences 
    WHERE media_id = p_media_id AND status = 'completed';

    result := jsonb_build_object(
        'totalRevues', COALESCE(total_revues, 0),
        'averageRating', COALESCE(avg_rating, 0),
        'readingCount', COALESCE(reading_count, 0),
        'wantToReadCount', COALESCE(want_to_read_count, 0),
        'completedCount', COALESCE(completed_count, 0)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent reviews for a media item
CREATE OR REPLACE FUNCTION public.get_media_recent_revues(
    p_media_id TEXT, 
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT,
    content TEXT,
    rating DECIMAL(3,1),
    like_count INTEGER,
    comment_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        COALESCE(up.display_name, up.username) as user_name,
        up.username as user_username,
        up.avatar_url as user_avatar,
        p.content,
        p.rating,
        p.like_count,
        p.comment_count,
        p.created_at
    FROM posts p
    JOIN user_profiles up ON p.user_id = up.id
    WHERE p.media_id = p_media_id 
        AND p.is_public = TRUE
        AND up.onboarding_completed = TRUE
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who are reading a specific media
CREATE OR REPLACE FUNCTION public.get_media_readers(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT,
    status TEXT,
    started_reading TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ump.user_id,
        COALESCE(up.display_name, up.username) as user_name,
        up.username as user_username,
        up.avatar_url as user_avatar,
        ump.status,
        ump.created_at as started_reading
    FROM user_media_preferences ump
    JOIN user_profiles up ON ump.user_id = up.id
    WHERE ump.media_id = p_media_id 
        AND ump.status = 'reading'
        AND up.onboarding_completed = TRUE
    ORDER BY ump.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who want to read a specific media
CREATE OR REPLACE FUNCTION public.get_media_want_to_readers(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT,
    source TEXT, -- 'bookmark' or 'preference'
    added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (combined.user_id)
        combined.user_id,
        combined.user_name,
        combined.user_username,
        combined.user_avatar,
        combined.source,
        combined.added_at
    FROM (
        -- From bookmarks
        SELECT 
            ub.user_id,
            COALESCE(up.display_name, up.username) as user_name,
            up.username as user_username,
            up.avatar_url as user_avatar,
            'bookmark'::TEXT as source,
            ub.bookmarked_at as added_at
        FROM user_bookmarks ub
        JOIN user_profiles up ON ub.user_id = up.id
        WHERE ub.media_id = p_media_id 
            AND up.onboarding_completed = TRUE

        UNION

        -- From preferences with want_to_read status
        SELECT 
            ump.user_id,
            COALESCE(up.display_name, up.username) as user_name,
            up.username as user_username,
            up.avatar_url as user_avatar,
            'preference'::TEXT as source,
            ump.created_at as added_at
        FROM user_media_preferences ump
        JOIN user_profiles up ON ump.user_id = up.id
        WHERE ump.media_id = p_media_id 
            AND ump.status = 'want_to_read'
            AND up.onboarding_completed = TRUE
    ) combined
    ORDER BY combined.user_id, combined.added_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who revued a specific media
CREATE OR REPLACE FUNCTION public.get_media_revuers(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT,
    post_id UUID,
    content_snippet TEXT,
    rating DECIMAL(3,1),
    revued_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        COALESCE(up.display_name, up.username) as user_name,
        up.username as user_username,
        up.avatar_url as user_avatar,
        p.id as post_id,
        LEFT(p.content, 100) as content_snippet,
        p.rating,
        p.created_at as revued_at
    FROM posts p
    JOIN user_profiles up ON p.user_id = up.id
    WHERE p.media_id = p_media_id 
        AND p.is_public = TRUE
        AND up.onboarding_completed = TRUE
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Media items policies (readable by all, manageable by system)
CREATE POLICY "Anyone can view media items" ON media_items FOR SELECT USING (true);
CREATE POLICY "System can manage media items" ON media_items FOR ALL USING (auth.role() = 'service_role');

-- Posts policies
CREATE POLICY "Users can view public posts" ON posts FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can view own posts" ON posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own posts" ON posts FOR ALL USING (auth.uid() = user_id);

-- Post likes policies
CREATE POLICY "Users can view post likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

-- Post comments policies
CREATE POLICY "Users can view comments on public posts" ON post_comments 
    FOR SELECT USING (
        post_id IN (SELECT id FROM posts WHERE is_public = TRUE)
    );
CREATE POLICY "Users can manage own comments" ON post_comments FOR ALL USING (auth.uid() = user_id); 