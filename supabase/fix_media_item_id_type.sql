-- Fix media_item_id type mismatch
BEGIN;

-- Drop existing foreign key constraint if it exists
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_item_id_fkey;

-- Change media_item_id column to TEXT
ALTER TABLE posts ALTER COLUMN media_item_id TYPE TEXT USING media_item_id::TEXT;

-- Add back the foreign key constraint
ALTER TABLE posts ADD CONSTRAINT posts_media_item_id_fkey 
FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE SET NULL;

-- Update create_post function to use TEXT
CREATE OR REPLACE FUNCTION public.create_post(
    p_user_id UUID,
    p_content TEXT,
    p_media_item_id TEXT DEFAULT NULL,
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

COMMIT; 