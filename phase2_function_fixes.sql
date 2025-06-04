-- PHASE 2 FUNCTION FIXES
-- Fix column alias issues found during testing

BEGIN;

-- Fix get_post_comments function - column alias issue
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
    JOIN user_profiles up ON c.user_id = up.id  -- Fixed: use 'id' instead of 'user_id'
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_post_likes function - column alias issue
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
    JOIN user_profiles up ON pl.user_id = up.id  -- Fixed: use 'id' instead of 'user_id'
    WHERE pl.post_id = p_post_id
    ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

SELECT 'Phase 2 function fixes applied successfully! 🎉' as status; 