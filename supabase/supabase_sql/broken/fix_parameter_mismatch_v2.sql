-- ============================================================================
-- PARAMETER MISMATCH FIX V2
-- Drops existing functions first, then creates with exact parameter names your app expects
-- ============================================================================

-- Step 1: Drop all existing conflicting functions first
DROP FUNCTION IF EXISTS public.get_user_bookmarks(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_bookmarks(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_bookmark CASCADE;
DROP FUNCTION IF EXISTS public.remove_bookmark CASCADE;
DROP FUNCTION IF EXISTS public.save_user_onboarding_data CASCADE;

-- Step 2: Create get_user_bookmarks with target_user_id parameter (as app expects)
CREATE OR REPLACE FUNCTION public.get_user_bookmarks(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    post_id TEXT,
    media_id TEXT,
    media_title TEXT,
    media_type TEXT,
    media_cover TEXT,
    post_author_name TEXT,
    post_author_avatar TEXT,
    post_content TEXT,
    post_date TIMESTAMP WITH TIME ZONE,
    bookmarked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.post_id,
        b.media_id,
        b.media_title,
        b.media_type,
        b.media_cover,
        b.post_author_name,
        b.post_author_avatar,
        b.post_content,
        b.post_date,
        b.created_at as bookmarked_at
    FROM user_bookmarks b
    WHERE b.user_id = target_user_id
    ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create add_bookmark with target_user_id parameter (as app expects)
CREATE OR REPLACE FUNCTION public.add_bookmark(
    target_user_id UUID,
    p_post_id TEXT,
    p_media_id TEXT,
    p_media_title TEXT,
    p_media_type TEXT,
    p_media_cover TEXT DEFAULT NULL,
    p_post_author_name TEXT DEFAULT NULL,
    p_post_author_avatar TEXT DEFAULT NULL,
    p_post_content TEXT DEFAULT NULL,
    p_post_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    bookmark_id UUID;
    existing_count INTEGER;
BEGIN
    -- Check if bookmark already exists
    SELECT COUNT(*) INTO existing_count
    FROM user_bookmarks
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    IF existing_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Bookmark already exists',
            'post_id', p_post_id
        );
    END IF;
    
    -- Insert new bookmark
    INSERT INTO user_bookmarks (
        user_id,
        post_id,
        media_id,
        media_title,
        media_type,
        media_cover,
        post_author_name,
        post_author_avatar,
        post_content,
        post_date,
        created_at
    )
    VALUES (
        target_user_id,
        p_post_id,
        p_media_id,
        p_media_title,
        p_media_type,
        p_media_cover,
        p_post_author_name,
        p_post_author_avatar,
        p_post_content,
        COALESCE(p_post_date, NOW()),
        NOW()
    )
    RETURNING id INTO bookmark_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'bookmark_id', bookmark_id,
        'post_id', p_post_id,
        'message', 'Bookmark added successfully'
    );
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'post_id', p_post_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create remove_bookmark function (your app might need this too)
CREATE OR REPLACE FUNCTION public.remove_bookmark(
    target_user_id UUID,
    p_post_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_bookmarks
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Bookmark removed successfully',
            'post_id', p_post_id
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Bookmark not found',
            'post_id', p_post_id
        );
    END IF;
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'post_id', p_post_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create single, definitive version of save_user_onboarding_data with exact parameters your app uses
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT NULL,
    p_display_name TEXT DEFAULT NULL,
    p_media_preferences JSONB DEFAULT NULL,
    p_onboarding_completed BOOLEAN DEFAULT NULL,
    p_username TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    media_item JSONB;
    affected_rows INTEGER;
BEGIN
    -- Update user profile using 'id' column
    UPDATE user_profiles SET
        username = COALESCE(p_username, username),
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        onboarding_completed = COALESCE(p_onboarding_completed, onboarding_completed),
        contact_sync_enabled = COALESCE(p_contact_sync_enabled, contact_sync_enabled),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Handle media preferences if provided
    IF p_media_preferences IS NOT NULL AND jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        FOR media_item IN SELECT * FROM jsonb_array_elements(p_media_preferences)
        LOOP
            INSERT INTO user_media_preferences (
                user_id,
                media_id,
                title,
                media_type,
                year,
                image_url,
                description,
                source,
                original_api_id,
                added_during_onboarding
            ) VALUES (
                p_user_id,
                media_item->>'id',
                media_item->>'title',
                media_item->>'type',
                media_item->>'year',
                media_item->>'image',
                media_item->>'description',
                media_item->>'source',
                media_item->>'originalId',
                TRUE
            );
        END LOOP;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows,
        'user_id', p_user_id
    );
    
    RETURN result;
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant permissions for all functions
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO anon;

GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, TEXT) TO anon;

-- Step 7: Verify the functions exist
SELECT 
    'get_user_bookmarks: ' || CASE WHEN COUNT(*) > 0 THEN 'CREATED ✅' ELSE 'MISSING ❌' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_user_bookmarks';

SELECT 
    'add_bookmark: ' || CASE WHEN COUNT(*) > 0 THEN 'CREATED ✅' ELSE 'MISSING ❌' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'add_bookmark';

SELECT 
    'save_user_onboarding_data: ' || CASE WHEN COUNT(*) > 0 THEN 'CREATED ✅' ELSE 'MISSING ❌' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'save_user_onboarding_data';

-- Step 8: Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 PARAMETER MISMATCH FIX V2 APPLIED!';
    RAISE NOTICE '✅ All conflicting functions dropped first';
    RAISE NOTICE '✅ get_user_bookmarks(target_user_id) created';
    RAISE NOTICE '✅ add_bookmark(..., target_user_id) created';
    RAISE NOTICE '✅ save_user_onboarding_data conflicts resolved';
    RAISE NOTICE '🧪 Test your app now - bookmarks should work!';
END $$; 