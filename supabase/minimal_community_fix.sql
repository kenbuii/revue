-- =======================================
-- MINIMAL COMMUNITY RPC FUNCTIONS FIX
-- Missing functions that communityRevuesService is calling
-- =======================================

-- Function 1: Get media community statistics
CREATE OR REPLACE FUNCTION get_media_community_stats(p_media_id TEXT)
RETURNS JSONB AS $$
DECLARE
    total_revues INTEGER;
    avg_rating DECIMAL(3,1);
    reading_count INTEGER;
    want_to_read_count INTEGER;
    completed_count INTEGER;
    result JSONB;
BEGIN
    -- Count total reviews for this media
    SELECT COUNT(*) INTO total_revues
    FROM posts 
    WHERE media_item_id = p_media_id AND is_public = TRUE;

    -- Calculate average rating
    SELECT ROUND(AVG(rating)::numeric, 1) INTO avg_rating
    FROM posts 
    WHERE media_item_id = p_media_id AND rating IS NOT NULL AND is_public = TRUE;

    -- For now, set reading counts to 0 (can be enhanced later)
    reading_count := 0;
    want_to_read_count := 0;
    completed_count := 0;

    result := jsonb_build_object(
        'totalRevues', COALESCE(total_revues, 0),
        'averageRating', COALESCE(avg_rating, 0),
        'readingCount', COALESCE(reading_count, 0),
        'wantToReadCount', COALESCE(want_to_read_count, 0),
        'completedCount', COALESCE(completed_count, 0)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get recent revues for a media item
CREATE OR REPLACE FUNCTION get_media_recent_revues(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    rating INTEGER,
    created_at TIMESTAMPTZ,
    like_count INTEGER,
    comment_count INTEGER,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.rating,
        p.created_at,
        p.like_count,
        p.comment_count,
        COALESCE(up.display_name, up.username) as user_name,
        up.username as user_username,
        up.avatar_url as user_avatar
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.user_id
    WHERE 
        p.media_item_id = p_media_id
        AND p.is_public = true
        AND up.onboarding_completed = true
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get users who have revued a media (basic implementation)
CREATE OR REPLACE FUNCTION get_media_revuers(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT,
    post_id UUID,
    content_snippet TEXT,
    rating INTEGER,
    revued_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        COALESCE(up.display_name, up.username) as user_name,
        up.username as user_username,
        up.avatar_url as user_avatar,
        p.id as post_id,
        LEFT(p.content, 100) as content_snippet,
        p.rating,
        p.created_at as revued_at
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.user_id
    WHERE 
        p.media_item_id = p_media_id
        AND p.is_public = true
        AND up.onboarding_completed = true
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Get users currently reading (placeholder - returns empty for now)
CREATE OR REPLACE FUNCTION get_media_readers(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT,
    status TEXT,
    started_reading TIMESTAMPTZ
) AS $$
BEGIN
    -- Return empty result for now
    -- Can be enhanced later with user_media_preferences table
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Get users who want to read (placeholder - returns empty for now)
CREATE OR REPLACE FUNCTION get_media_want_to_readers(
    p_media_id TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_username TEXT,
    user_avatar TEXT,
    source TEXT,
    added_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Return empty result for now
    -- Can be enhanced later with bookmarks/preferences tables
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_media_community_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_media_recent_revues(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_media_revuers(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_media_readers(TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_media_want_to_readers(TEXT, INTEGER, INTEGER) TO anon, authenticated;

SELECT 'Minimal community RPC functions created successfully!' as result; 