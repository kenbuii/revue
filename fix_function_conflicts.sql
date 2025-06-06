-- FIX FUNCTION CONFLICTS
-- Clean up duplicate/conflicting function signatures

BEGIN;

-- ==========================================
-- 1. DROP ALL CONFLICTING FUNCTIONS
-- ==========================================

-- Drop all versions of create_post
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, TEXT, INTEGER, BOOLEAN, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, UUID, INTEGER, BOOLEAN, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, TEXT, INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, UUID, INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT) CASCADE;

-- Drop any other potentially conflicting functions
DROP FUNCTION IF EXISTS public.like_post(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.unlike_post(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_comment(UUID, UUID, TEXT) CASCADE;

-- ==========================================
-- 2. CREATE CANONICAL FUNCTIONS
-- ==========================================

-- CREATE POST FUNCTION (canonical version with UUID media_item_id)
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

-- LIKE POST FUNCTION
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
-- 3. GRANT PERMISSIONS
-- ==========================================

GRANT EXECUTE ON FUNCTION public.create_post(UUID, TEXT, UUID, INTEGER, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.like_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlike_post(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_comment(UUID, UUID, TEXT) TO authenticated;

COMMIT;

SELECT 'FUNCTION CONFLICTS RESOLVED!' as status; 