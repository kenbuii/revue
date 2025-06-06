-- MINIMAL DATABASE FIX - Only resolve function conflicts
-- App code will be updated to match existing database structure

BEGIN;

-- Fix 1: Remove function overload conflicts for save_user_onboarding_data
-- Keep only the version that matches the app's expected parameters
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(uuid, text, text, text, boolean, boolean, jsonb) CASCADE;

-- Fix 2: Create get_user_bookmarks function that accepts target_user_id 
-- (This bridges the gap between app expectation and database)
CREATE OR REPLACE FUNCTION public.get_user_bookmarks(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    post_id TEXT,
    media_id TEXT,
    media_title TEXT,
    media_type TEXT,
    media_cover TEXT,
    post_title TEXT,
    post_content TEXT,
    post_author_name TEXT,
    post_author_avatar TEXT,
    post_date TIMESTAMP WITH TIME ZONE,
    bookmarked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.post_id,
        ub.media_id,
        ub.media_title,
        ub.media_type,
        ub.media_cover,
        ub.post_title,
        ub.post_content,
        ub.post_author_name,
        ub.post_author_avatar,
        ub.post_date,
        ub.bookmarked_at
    FROM user_bookmarks ub
    WHERE ub.user_id = target_user_id
    ORDER BY ub.bookmarked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon, authenticated;

COMMIT;

-- Success message
SELECT 'Database function conflicts resolved!' as status,
       'Now update app code to use user_id instead of id' as next_step; 