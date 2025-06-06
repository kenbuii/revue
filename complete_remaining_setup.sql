-- COMPLETE REMAINING SETUP
-- Run this after fix_function_conflicts.sql

BEGIN;

-- ==========================================
-- 1. CREATE LIKES TABLE (if not exists)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one like per user per post
    UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for likes (with proper checks)
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'likes' 
        AND policyname = 'Users can view all likes'
    ) THEN
        CREATE POLICY "Users can view all likes" ON public.likes FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'likes' 
        AND policyname = 'Users can manage their own likes'
    ) THEN
        CREATE POLICY "Users can manage their own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- ==========================================
-- 2. CREATE FEED FUNCTIONS
-- ==========================================

-- Fix get_for_you_feed to use actual columns and return data
DROP FUNCTION IF EXISTS public.get_for_you_feed(INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.get_for_you_feed(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_item_id UUID,
    rating INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    contains_spoilers BOOLEAN,
    visibility TEXT,
    created_at TIMESTAMPTZ,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.media_item_id,
        p.rating,
        p.like_count,
        p.comment_count,
        p.contains_spoilers,
        p.visibility,
        p.created_at,
        up.username,
        up.display_name,
        up.avatar_url
    FROM public.posts p
    LEFT JOIN public.user_profiles up ON p.user_id = up.user_id
    WHERE p.visibility = 'public'
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Fix get_user_posts to use actual columns
DROP FUNCTION IF EXISTS public.get_user_posts(UUID, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_posts(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_item_id UUID,
    rating INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    contains_spoilers BOOLEAN,
    visibility TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.media_item_id,
        p.rating,
        p.like_count,
        p.comment_count,
        p.contains_spoilers,
        p.visibility,
        p.created_at
    FROM public.posts p
    WHERE p.user_id = p_user_id
    AND (p.visibility = 'public' OR p.user_id = p_user_id) -- Show all own posts
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Fix get_user_liked_posts to return actual liked posts
DROP FUNCTION IF EXISTS public.get_user_liked_posts(UUID, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_liked_posts(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_item_id UUID,
    rating INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    created_at TIMESTAMPTZ,
    liked_at TIMESTAMPTZ,
    post_username TEXT,
    post_display_name TEXT,
    post_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.media_item_id,
        p.rating,
        p.like_count,
        p.comment_count,
        p.created_at,
        l.created_at as liked_at,
        up.username as post_username,
        up.display_name as post_display_name,
        up.avatar_url as post_avatar_url
    FROM public.likes l
    JOIN public.posts p ON l.post_id = p.id
    LEFT JOIN public.user_profiles up ON p.user_id = up.user_id
    WHERE l.user_id = p_user_id
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Get comments for a post
DROP FUNCTION IF EXISTS public.get_post_comments(UUID, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.get_post_comments(
    p_post_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    post_id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.post_id,
        c.content,
        c.created_at,
        up.username,
        up.display_name,
        up.avatar_url
    FROM public.comments c
    LEFT JOIN public.user_profiles up ON c.user_id = up.user_id
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ==========================================
-- 3. GRANT PERMISSIONS
-- ==========================================

-- Grant permissions for likes table
GRANT ALL ON public.likes TO authenticated;
GRANT ALL ON public.likes TO anon;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION public.get_for_you_feed(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_for_you_feed(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_posts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_posts(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_liked_posts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID, INTEGER, INTEGER) TO anon;

COMMIT;

SELECT 'SETUP COMPLETE!' as status; 