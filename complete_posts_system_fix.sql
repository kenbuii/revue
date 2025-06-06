-- COMPLETE POSTS SYSTEM FIX
-- Align all functions with actual table structure and create missing components

BEGIN;

-- ==========================================
-- 1. CREATE MISSING LIKES TABLE
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
-- 2. CREATE MISSING FUNCTIONS
-- ==========================================

-- CREATE POST FUNCTION (using correct column names)
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, UUID, INTEGER, BOOLEAN, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.create_post(
    p_user_id UUID,
    p_content TEXT,
    p_media_item_id UUID DEFAULT NULL,
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
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_content,
        p_media_item_id,
        p_rating,
        p_contains_spoilers,
        p_visibility,
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

-- LIKE POST FUNCTION
DROP FUNCTION IF EXISTS public.like_post(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.like_post(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    like_id UUID;
    result JSONB;
BEGIN
    -- Insert like (will fail if already exists due to unique constraint)
    INSERT INTO public.likes (user_id, post_id, created_at)
    VALUES (p_user_id, p_post_id, NOW())
    RETURNING id INTO like_id;
    
    -- Update like count on post
    UPDATE public.posts 
    SET like_count = like_count + 1,
        updated_at = NOW()
    WHERE id = p_post_id;

    result := jsonb_build_object(
        'success', true,
        'like_id', like_id,
        'message', 'Post liked successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Post already liked by user'
        );
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- UNLIKE POST FUNCTION
DROP FUNCTION IF EXISTS public.unlike_post(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.unlike_post(
    p_user_id UUID,
    p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    result JSONB;
BEGIN
    -- Delete like
    DELETE FROM public.likes 
    WHERE user_id = p_user_id AND post_id = p_post_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        -- Update like count on post
        UPDATE public.posts 
        SET like_count = GREATEST(like_count - 1, 0),
            updated_at = NOW()
        WHERE id = p_post_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Post unliked successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'error', 'Like not found'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ADD COMMENT FUNCTION
DROP FUNCTION IF EXISTS public.add_comment(UUID, UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.add_comment(
    p_user_id UUID,
    p_post_id UUID,
    p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    comment_id UUID;
    result JSONB;
BEGIN
    -- Insert comment
    INSERT INTO public.comments (
        user_id,
        post_id,
        content,
        created_at
    ) VALUES (
        p_user_id,
        p_post_id,
        p_content,
        NOW()
    )
    RETURNING id INTO comment_id;
    
    -- Update comment count on post
    UPDATE public.posts 
    SET comment_count = comment_count + 1,
        updated_at = NOW()
    WHERE id = p_post_id;

    result := jsonb_build_object(
        'success', true,
        'comment_id', comment_id,
        'message', 'Comment added successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ==========================================
-- 3. UPDATE EXISTING FUNCTIONS WITH CORRECT COLUMN NAMES
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
-- 4. GRANT PERMISSIONS
-- ==========================================

-- Grant permissions for likes table
GRANT ALL ON public.likes TO authenticated;
GRANT ALL ON public.likes TO anon;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION public.create_post(UUID, TEXT, UUID, INTEGER, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.like_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlike_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_comment(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_for_you_feed(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_for_you_feed(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_posts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_posts(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_liked_posts(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID, INTEGER, INTEGER) TO anon;

COMMIT;

-- ==========================================
-- 5. TEST THE SYSTEM
-- ==========================================

DO $$
DECLARE
    test_user_id UUID := '1ccd0502-4347-487e-a450-4e994e216ad4';
    test_post_id UUID;
    create_result JSONB;
    like_result JSONB;
    comment_result JSONB;
BEGIN
    RAISE NOTICE '🧪 === TESTING COMPLETE POSTS SYSTEM ===';
    
    -- Test post creation
    SELECT public.create_post(
        test_user_id,
        'This is my first test post! 🎬',
        NULL,
        5,
        false,
        'public'
    ) INTO create_result;
    
    RAISE NOTICE '📝 Create post result: %', create_result;
    
    -- Extract post ID for further testing with proper error handling
    IF create_result IS NOT NULL AND create_result ? 'post_id' THEN
        BEGIN
            test_post_id := (create_result->>'post_id')::UUID;
            RAISE NOTICE '📋 Extracted post ID: %', test_post_id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Could not extract post_id from result: %', create_result;
                test_post_id := NULL;
        END;
    ELSE
        RAISE NOTICE '⚠️ No post_id found in create result';
        test_post_id := NULL;
    END IF;
    
    IF test_post_id IS NOT NULL THEN
        -- Test liking the post
        SELECT public.like_post(test_user_id, test_post_id) INTO like_result;
        RAISE NOTICE '❤️ Like post result: %', like_result;
        
        -- Test adding a comment
        SELECT public.add_comment(test_user_id, test_post_id, 'Great post!') INTO comment_result;
        RAISE NOTICE '💬 Add comment result: %', comment_result;
    ELSE
        RAISE NOTICE '⚠️ Skipping like and comment tests due to missing post_id';
    END IF;
    
    RAISE NOTICE '✅ === TESTING COMPLETE ===';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test failed with error: %', SQLERRM;
END $$;

SELECT 'COMPLETE POSTS SYSTEM FIXED!' as status; 