-- =======================================
-- FIX USER LIKED POSTS FUNCTION
-- Fix column reference from up.id to up.user_id
-- =======================================

-- Function: Fix get_user_liked_posts with correct column references
CREATE OR REPLACE FUNCTION get_user_liked_posts(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id UUID,
    content TEXT,
    media_item_id TEXT,
    post_title TEXT,
    rating INTEGER,
    post_created_at TIMESTAMPTZ,
    liked_at TIMESTAMPTZ,
    -- User profile fields (post author)
    author_username TEXT,
    author_display_name TEXT,
    author_avatar_url TEXT,
    -- Media fields
    media_title TEXT,
    media_type TEXT,
    media_author TEXT,
    media_cover_url TEXT,
    media_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as post_id,
        p.content,
        p.media_item_id,
        p.title as post_title,
        p.rating,
        p.created_at as post_created_at,
        pl.created_at as liked_at,
        -- User profile fields (post author) - FIXED: using up.user_id instead of up.id
        up.username as author_username,
        COALESCE(up.display_name, up.username) as author_display_name,
        up.avatar_url as author_avatar_url,
        -- Media fields
        mi.title as media_title,
        mi.media_type,
        mi.author as media_author,
        mi.cover_image_url as media_cover_url,
        mi.description as media_description
    FROM post_likes pl
    INNER JOIN posts p ON pl.post_id = p.id
    INNER JOIN user_profiles up ON p.user_id = up.user_id  -- FIXED: This was the issue
    LEFT JOIN media_items mi ON p.media_item_id = mi.id
    WHERE pl.user_id = p_user_id
    ORDER BY pl.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_liked_posts(UUID, INTEGER, INTEGER) TO anon, authenticated;

SELECT 'Fixed get_user_liked_posts function successfully!' as result; 