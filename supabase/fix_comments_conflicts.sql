-- =======================================
-- FIX COMMENTS FUNCTION CONFLICTS
-- Remove duplicates and ensure consistent signatures
-- =======================================

-- Step 1: Drop any existing conflicting versions
DROP FUNCTION IF EXISTS create_comment(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS create_comment(p_post_id UUID, p_content TEXT, p_parent_comment_id UUID);
DROP FUNCTION IF EXISTS get_post_comments(UUID);
DROP FUNCTION IF EXISTS get_post_comments(p_post_id UUID);

-- Step 2: Create canonical versions with consistent naming

-- Function 1: Get post comments (fixed column reference)
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
        c.like_count,
        CASE 
            WHEN current_user_id IS NOT NULL THEN 
                EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = current_user_id)
            ELSE false 
        END as is_liked_by_user,
        c.created_at,
        c.updated_at
    FROM comments c
    INNER JOIN user_profiles up ON c.user_id = up.user_id  -- FIXED: use user_id not id
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Create comment (consistent JSONB return)
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
    INSERT INTO comments (post_id, user_id, content, parent_comment_id)
    VALUES (p_post_id, current_user_id, TRIM(p_content), p_parent_comment_id)
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
    INNER JOIN user_profiles up ON c.user_id = up.user_id  -- FIXED: use user_id not id
    WHERE c.id = new_comment_id;

    RETURN comment_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Toggle comment like (ensure exists)
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
    SELECT like_count INTO new_like_count
    FROM comments
    WHERE id = p_comment_id;

    RETURN jsonb_build_object(
        'success', true,
        'isLiked', NOT like_exists,
        'likeCount', COALESCE(new_like_count, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_post_comments(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_comment(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_comment_like(UUID) TO authenticated;

SELECT 'Comments function conflicts fixed!' as result; 