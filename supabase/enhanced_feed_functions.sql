-- =======================================
-- ENHANCED FEED RPC FUNCTIONS
-- Complex feed logic with personalization and optimization
-- =======================================

-- Function 1: Get personalized "For You" feed
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
        AND (p_user_id IS NULL OR p.user_id != p_user_id) -- Exclude own posts
        AND (p_include_media_types IS NULL OR mi.media_type = ANY(p_include_media_types))
    ORDER BY 
        p.created_at DESC,
        p.like_count DESC -- Secondary sort by popularity
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get friends feed (for users you follow)
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
        AND p.user_id != p_user_id -- Exclude own posts for now
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get user's liked posts with full details
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
        -- User profile fields (post author)
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
    INNER JOIN user_profiles up ON p.user_id = up.user_id
    LEFT JOIN media_items mi ON p.media_item_id = mi.id
    WHERE pl.user_id = p_user_id
    ORDER BY pl.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Get posts for a specific media item
CREATE OR REPLACE FUNCTION get_media_posts(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    title TEXT,
    rating INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    created_at TIMESTAMPTZ,
    -- User profile fields
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.title,
        p.rating,
        p.like_count,
        p.comment_count,
        p.created_at,
        -- User profile fields
        up.username,
        COALESCE(up.display_name, up.username) as display_name,
        up.avatar_url
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.user_id
    WHERE 
        p.media_item_id = p_media_id
        AND p.visibility = 'public' 
        AND p.is_public = true
        AND up.onboarding_completed = true
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Ensure media item exists (for post creation)
CREATE OR REPLACE FUNCTION ensure_media_item_exists(
    p_media_id TEXT,
    p_title TEXT,
    p_media_type TEXT,
    p_author TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_cover_image_url TEXT DEFAULT NULL,
    p_external_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT AS $$
DECLARE
    existing_id TEXT;
BEGIN
    -- Check if media item already exists
    SELECT id INTO existing_id
    FROM media_items
    WHERE id = p_media_id;
    
    IF existing_id IS NOT NULL THEN
        -- Media item exists, return the ID
        RETURN existing_id;
    END IF;
    
    -- Create new media item
    INSERT INTO media_items (
        id,
        title,
        media_type,
        author,
        description,
        cover_image_url,
        external_id,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        p_media_id,
        p_title,
        p_media_type,
        COALESCE(p_author, ''),
        COALESCE(p_description, ''),
        COALESCE(p_cover_image_url, ''),
        COALESCE(p_external_id, ''),
        p_metadata,
        NOW(),
        NOW()
    );
    
    RETURN p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_for_you_feed(UUID, INTEGER, INTEGER, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_friends_feed(UUID, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_liked_posts(UUID, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_media_posts(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ensure_media_item_exists(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

SELECT 'Enhanced feed functions created successfully!' as result; 