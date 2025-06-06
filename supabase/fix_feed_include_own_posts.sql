-- =======================================
-- FIX: Include Own Posts in Feed
-- Update RPC functions to show user's own posts
-- =======================================

-- Update get_for_you_feed to include own posts
CREATE OR REPLACE FUNCTION get_for_you_feed(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_include_media_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_item_id TEXT,
    title TEXT,
    rating INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    visibility TEXT,
    is_public BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- User profile fields
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN,
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
        p.id,
        p.user_id,
        p.content,
        p.media_item_id,
        p.title,
        p.rating,
        p.like_count,
        p.comment_count,
        p.visibility,
        p.is_public,
        p.created_at,
        p.updated_at,
        -- User profile fields
        up.username,
        COALESCE(up.display_name, up.username) as display_name,
        up.avatar_url,
        up.onboarding_completed,
        -- Media fields
        mi.title as media_title,
        mi.media_type,
        mi.author as media_author,
        mi.cover_image_url as media_cover_url,
        mi.description as media_description
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.user_id
    LEFT JOIN media_items mi ON p.media_item_id = mi.id
    WHERE 
        p.visibility = 'public' 
        AND p.is_public = true
        AND up.onboarding_completed = true
        -- REMOVED: Own post exclusion - now includes all posts
        AND (p_include_media_types IS NULL OR mi.media_type = ANY(p_include_media_types))
    ORDER BY 
        p.created_at DESC,
        p.like_count DESC -- Secondary sort by popularity
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_friends_feed to include own posts  
CREATE OR REPLACE FUNCTION get_friends_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    media_item_id TEXT,
    title TEXT,
    rating INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    visibility TEXT,
    is_public BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- User profile fields
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN,
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
        p.id,
        p.user_id,
        p.content,
        p.media_item_id,
        p.title,
        p.rating,
        p.like_count,
        p.comment_count,
        p.visibility,
        p.is_public,
        p.created_at,
        p.updated_at,
        -- User profile fields
        up.username,
        COALESCE(up.display_name, up.username) as display_name,
        up.avatar_url,
        up.onboarding_completed,
        -- Media fields
        mi.title as media_title,
        mi.media_type,
        mi.author as media_author,
        mi.cover_image_url as media_cover_url,
        mi.description as media_description
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.user_id
    LEFT JOIN media_items mi ON p.media_item_id = mi.id
    -- TODO: Add user_follows table when implementing follow system
    -- INNER JOIN user_follows uf ON p.user_id = uf.following_id AND uf.follower_id = p_user_id
    WHERE 
        p.visibility = 'public' 
        AND p.is_public = true
        AND up.onboarding_completed = true
        -- REMOVED: Own post exclusion - now includes all posts including own
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION get_for_you_feed(UUID, INTEGER, INTEGER, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_friends_feed(UUID, INTEGER, INTEGER) TO anon, authenticated;

SELECT 'Feed functions updated to include own posts!' as result; 