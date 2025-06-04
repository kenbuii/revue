-- RESTORE PHASE 2 FUNCTIONS FOR PHASE 3 TESTING
-- ===============================================
-- Restores all functions needed for Phase 3 UI components

BEGIN;

-- Function 1: get_post_comments (Fixed version)
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
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
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
    JOIN user_profiles up ON c.user_id = up.id
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: create_comment
CREATE OR REPLACE FUNCTION create_comment(
    post_id UUID,
    content TEXT,
    parent_comment_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    new_comment_id UUID;
    result JSON;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Authentication required');
    END IF;
    
    IF content IS NULL OR LENGTH(TRIM(content)) = 0 THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Comment content cannot be empty');
    END IF;
    
    -- Insert the comment
    INSERT INTO comments (post_id, user_id, content, parent_comment_id)
    VALUES (post_id, current_user_id, TRIM(content), parent_comment_id)
    RETURNING id INTO new_comment_id;
    
    -- Return success with new comment ID
    result := JSON_BUILD_OBJECT(
        'success', true, 
        'comment_id', new_comment_id::TEXT,
        'message', 'Comment created successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: get_post_likes (Fixed version)
CREATE OR REPLACE FUNCTION get_post_likes(p_post_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    liked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.user_id,
        up.username,
        up.display_name,
        up.avatar_url,
        pl.created_at as liked_at
    FROM post_likes pl
    JOIN user_profiles up ON pl.user_id = up.id
    WHERE pl.post_id = p_post_id
    ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: toggle_post_like
CREATE OR REPLACE FUNCTION toggle_post_like(post_id UUID)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    result JSON;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Authentication required');
    END IF;
    
    -- Check if like already exists
    SELECT EXISTS(
        SELECT 1 FROM post_likes 
        WHERE post_likes.post_id = toggle_post_like.post_id 
        AND user_id = current_user_id
    ) INTO like_exists;
    
    IF like_exists THEN
        -- Remove like
        DELETE FROM post_likes 
        WHERE post_likes.post_id = toggle_post_like.post_id 
        AND user_id = current_user_id;
        
        result := JSON_BUILD_OBJECT(
            'success', true, 
            'action', 'unliked',
            'is_liked', false
        );
    ELSE
        -- Add like
        INSERT INTO post_likes (post_id, user_id, created_at)
        VALUES (toggle_post_like.post_id, current_user_id, NOW());
        
        result := JSON_BUILD_OBJECT(
            'success', true, 
            'action', 'liked',
            'is_liked', true
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: toggle_comment_like
CREATE OR REPLACE FUNCTION toggle_comment_like(comment_id UUID)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    new_like_count INTEGER;
    result JSON;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Authentication required');
    END IF;
    
    -- Check if like already exists
    SELECT EXISTS(
        SELECT 1 FROM comment_likes 
        WHERE comment_likes.comment_id = toggle_comment_like.comment_id 
        AND user_id = current_user_id
    ) INTO like_exists;
    
    IF like_exists THEN
        -- Remove like
        DELETE FROM comment_likes 
        WHERE comment_likes.comment_id = toggle_comment_like.comment_id 
        AND user_id = current_user_id;
        
        -- Update comment like count
        UPDATE comments 
        SET like_count = like_count - 1 
        WHERE id = toggle_comment_like.comment_id
        RETURNING like_count INTO new_like_count;
        
        result := JSON_BUILD_OBJECT(
            'success', true, 
            'action', 'unliked',
            'isLiked', false,
            'likeCount', new_like_count
        );
    ELSE
        -- Add like
        INSERT INTO comment_likes (comment_id, user_id, created_at)
        VALUES (toggle_comment_like.comment_id, current_user_id, NOW());
        
        -- Update comment like count
        UPDATE comments 
        SET like_count = like_count + 1 
        WHERE id = toggle_comment_like.comment_id
        RETURNING like_count INTO new_like_count;
        
        result := JSON_BUILD_OBJECT(
            'success', true, 
            'action', 'liked',
            'isLiked', true,
            'likeCount', new_like_count
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

SELECT 'All Phase 2 functions restored successfully! 🎉' as status,
       'Phase 3 UI components now have full database support' as message; 