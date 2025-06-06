-- =======================================
-- FIX COMMENTS SYSTEM COMPLETELY
-- Step 1: Resolve overloading conflicts and missing columns
-- =======================================

-- Step 1: Drop all existing conflicting comment functions
DROP FUNCTION IF EXISTS get_post_comments(UUID);
DROP FUNCTION IF EXISTS get_post_comments(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_post_comments(p_post_id UUID);
DROP FUNCTION IF EXISTS get_post_comments(p_post_id UUID, p_limit INTEGER, p_offset INTEGER);
DROP FUNCTION IF EXISTS create_comment(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS create_comment(p_post_id UUID, p_content TEXT, p_parent_comment_id UUID);
DROP FUNCTION IF EXISTS toggle_comment_like(UUID);

-- Step 2: Add missing columns to comments table if they don't exist
DO $$ 
BEGIN 
    -- Add like_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='comments' AND column_name='like_count') THEN
        ALTER TABLE comments ADD COLUMN like_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='comments' AND column_name='updated_at') THEN
        ALTER TABLE comments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 3: Create comment_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Step 4: Create trigger function for comment like count updates
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        UPDATE comments 
        SET like_count = like_count + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
        UPDATE comments 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger for comment like count
DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER comment_likes_count_trigger
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Step 6: Create single canonical get_post_comments function
CREATE OR REPLACE FUNCTION get_post_comments(p_post_id UUID)
RETURNS TABLE (
    id UUID,
    content TEXT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    parent_comment_id UUID,
    like_count INTEGER,
    is_liked_by_user BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.user_id,
        up.username,
        up.display_name,
        up.avatar_url,
        c.parent_comment_id,
        COALESCE(c.like_count, 0) as like_count,
        CASE 
            WHEN current_user_id IS NOT NULL THEN 
                EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = current_user_id)
            ELSE false 
        END as is_liked_by_user,
        c.created_at,
        COALESCE(c.updated_at, c.created_at) as updated_at
    FROM comments c
    INNER JOIN user_profiles up ON c.user_id = up.user_id
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create single canonical create_comment function
CREATE OR REPLACE FUNCTION create_comment(
    p_post_id UUID,
    p_content TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    new_comment_id UUID;
    comment_result JSONB;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Validate input
    IF p_content IS NULL OR LENGTH(TRIM(p_content)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comment content cannot be empty');
    END IF;

    -- Create the comment
    INSERT INTO comments (post_id, user_id, content, parent_comment_id, like_count, created_at, updated_at)
    VALUES (p_post_id, current_user_id, TRIM(p_content), p_parent_comment_id, 0, NOW(), NOW())
    RETURNING id INTO new_comment_id;

    -- Get the created comment with user details
    SELECT jsonb_build_object(
        'success', true,
        'comment', jsonb_build_object(
            'id', c.id,
            'content', c.content,
            'user_id', c.user_id,
            'username', up.username,
            'display_name', up.display_name,
            'avatar_url', up.avatar_url,
            'parent_comment_id', c.parent_comment_id,
            'like_count', c.like_count,
            'is_liked_by_user', false,
            'created_at', c.created_at,
            'updated_at', c.updated_at
        )
    ) INTO comment_result
    FROM comments c
    INNER JOIN user_profiles up ON c.user_id = up.user_id
    WHERE c.id = new_comment_id;

    RETURN comment_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create single canonical toggle_comment_like function
CREATE OR REPLACE FUNCTION toggle_comment_like(p_comment_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    new_like_count INTEGER;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Check if like exists
    SELECT EXISTS(
        SELECT 1 FROM comment_likes 
        WHERE comment_id = p_comment_id AND user_id = current_user_id
    ) INTO like_exists;

    IF like_exists THEN
        -- Unlike: remove like
        DELETE FROM comment_likes 
        WHERE comment_id = p_comment_id AND user_id = current_user_id;
    ELSE
        -- Like: add like
        INSERT INTO comment_likes (comment_id, user_id, created_at)
        VALUES (p_comment_id, current_user_id, NOW());
    END IF;

    -- Get updated like count
    SELECT COALESCE(like_count, 0) INTO new_like_count
    FROM comments
    WHERE id = p_comment_id;

    RETURN jsonb_build_object(
        'success', true,
        'isLiked', NOT like_exists,
        'likeCount', new_like_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION get_post_comments(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_comment(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_comment_like(UUID) TO authenticated;

-- Step 10: Update existing comments to have proper like_count (data migration)
UPDATE comments SET like_count = COALESCE(like_count, 0) WHERE like_count IS NULL;
UPDATE comments SET updated_at = COALESCE(updated_at, created_at) WHERE updated_at IS NULL;

SELECT 'Comments system fixed completely!' as result; 