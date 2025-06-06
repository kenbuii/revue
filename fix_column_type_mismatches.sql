-- FIX COLUMN TYPE MISMATCHES
-- Fix return types to match actual table structure

BEGIN;

-- ==========================================
-- 1. FIX FEED FUNCTIONS WITH CORRECT TYPES
-- ==========================================

-- Fix get_for_you_feed to use TEXT for media_item_id (not UUID)
DROP FUNCTION IF EXISTS public.get_for_you_feed(INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.get_for_you_feed(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_item_id TEXT,  -- Changed from UUID to TEXT
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

-- Fix get_user_posts to use TEXT for media_item_id
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
    media_item_id TEXT,  -- Changed from UUID to TEXT
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

-- Fix get_user_liked_posts to use TEXT for media_item_id
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
    media_item_id TEXT,  -- Changed from UUID to TEXT
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

-- ==========================================
-- 2. FIX NOTIFICATIONS FUNCTION
-- ==========================================

-- Fix or recreate the notifications function with proper column references
DROP FUNCTION IF EXISTS public.get_user_notifications(UUID, INTEGER, INTEGER, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    related_post_id UUID,
    related_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        COALESCE(n.is_read, false) as is_read,
        n.created_at,
        n.related_post_id,
        n.related_user_id
    FROM public.notifications n
    WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR NOT COALESCE(n.is_read, false))
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ==========================================
-- 3. UPDATE CREATE_POST TO USE TEXT FOR MEDIA_ITEM_ID
-- ==========================================

-- Update create_post function to accept TEXT media_item_id
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, UUID, INTEGER, BOOLEAN, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.create_post(
    p_user_id UUID,
    p_content TEXT,
    p_media_item_id TEXT DEFAULT NULL,  -- Changed from UUID to TEXT
    p_rating INTEGER DEFAULT NULL,
    p_contains_spoilers BOOLEAN DEFAULT false,
    p_visibility TEXT DEFAULT 'public'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    post_id UUID;
    result JSONB;
BEGIN
    -- Insert new post using actual column names
    INSERT INTO public.posts (
        user_id,
        content,
        media_item_id,
        rating,
        contains_spoilers,
        visibility,
        like_count,
        comment_count,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_content,
        p_media_item_id,
        p_rating,
        p_contains_spoilers,
        p_visibility,
        0, -- Initialize counters
        0,
        NOW(),
        NOW()
    )
    RETURNING id INTO post_id;

    result := jsonb_build_object(
        'success', true,
        'post_id', post_id,
        'message', 'Post created successfully'
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
$$;

-- ==========================================
-- 4. GRANT PERMISSIONS
-- ==========================================

GRANT EXECUTE ON FUNCTION public.get_for_you_feed(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_for_you_feed(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_posts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_posts(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_liked_posts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post(UUID, TEXT, TEXT, INTEGER, BOOLEAN, TEXT) TO authenticated;

COMMIT;

SELECT 'COLUMN TYPE MISMATCHES FIXED!' as status; 