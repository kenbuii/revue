-- NUCLEAR PARAMETER MISMATCH FIX V3
-- This uses the nuclear approach to drop ALL conflicting functions then creates exact matches for your app

-- STEP 1: NUCLEAR CLEANUP - Drop ALL save_user_onboarding_data functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '🧹 Starting nuclear cleanup of save_user_onboarding_data functions...';
    
    -- Find and drop ALL functions named save_user_onboarding_data
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'save_user_onboarding_data'
    LOOP
        RAISE NOTICE 'Dropping function: % with args: %', func_record.proname, func_record.args;
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    RAISE NOTICE '✅ All conflicting save_user_onboarding_data functions dropped!';
END $$;

-- STEP 2: NUCLEAR CLEANUP - Drop ALL get_user_bookmarks functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '🧹 Starting nuclear cleanup of get_user_bookmarks functions...';
    
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'get_user_bookmarks'
    LOOP
        RAISE NOTICE 'Dropping function: % with args: %', func_record.proname, func_record.args;
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    RAISE NOTICE '✅ All conflicting get_user_bookmarks functions dropped!';
END $$;

-- STEP 3: NUCLEAR CLEANUP - Drop ALL add_bookmark functions  
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '🧹 Starting nuclear cleanup of add_bookmark functions...';
    
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'add_bookmark'
    LOOP
        RAISE NOTICE 'Dropping function: % with args: %', func_record.proname, func_record.args;
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    RAISE NOTICE '✅ All conflicting add_bookmark functions dropped!';
END $$;

-- STEP 4: Create save_user_onboarding_data with EXACT parameter names your app uses (target_user_id)
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    target_user_id UUID,
    display_name TEXT DEFAULT NULL,
    contact_sync_enabled BOOLEAN DEFAULT FALSE,
    avatar_url TEXT DEFAULT NULL,
    media_preferences JSONB DEFAULT '[]'::JSONB,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    username TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE 'save_user_onboarding_data called with target_user_id: %', target_user_id;
    
    -- Update user profile using 'id' column (not user_id)
    UPDATE user_profiles SET
        display_name = COALESCE(display_name, display_name),
        avatar_url = COALESCE(avatar_url, avatar_url),
        contact_sync_enabled = contact_sync_enabled,
        onboarding_completed = onboarding_completed,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % rows in user_profiles', affected_rows;

    -- Handle media preferences if provided
    IF jsonb_array_length(media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = target_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        INSERT INTO user_media_preferences (
            user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
        )
        SELECT 
            target_user_id,
            COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT),
            (item->>'title')::TEXT,
            COALESCE((item->>'type')::TEXT, (item->>'media_type')::TEXT),
            (item->>'year')::TEXT,
            COALESCE((item->>'image')::TEXT, (item->>'image_url')::TEXT),
            (item->>'description')::TEXT,
            (item->>'source')::TEXT,
            COALESCE((item->>'originalId')::TEXT, (item->>'original_api_id')::TEXT),
            TRUE
        FROM jsonb_array_elements(media_preferences) AS item
        WHERE COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT) IS NOT NULL;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows,
        'target_user_id', target_user_id
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'save_user_onboarding_data error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'target_user_id', target_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Create get_user_bookmarks with EXACT parameter names your app uses (target_user_id)
CREATE OR REPLACE FUNCTION public.get_user_bookmarks(
    target_user_id UUID
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    post_id UUID,
    created_at TIMESTAMPTZ,
    post_title TEXT,
    post_content TEXT,
    post_author_id UUID,
    post_created_at TIMESTAMPTZ
) AS $$
BEGIN
    RAISE NOTICE 'get_user_bookmarks called with target_user_id: %', target_user_id;
    
    RETURN QUERY
    SELECT 
        b.id,
        b.user_id,
        b.post_id,
        b.created_at,
        p.title as post_title,
        p.content as post_content,
        p.author_id as post_author_id,
        p.created_at as post_created_at
    FROM bookmarks b
    JOIN posts p ON b.post_id = p.id
    WHERE b.user_id = target_user_id
    ORDER BY b.created_at DESC;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'get_user_bookmarks error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Create add_bookmark with EXACT parameter names your app uses (target_user_id)
CREATE OR REPLACE FUNCTION public.add_bookmark(
    target_user_id UUID,
    post_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    bookmark_id UUID;
    existing_bookmark UUID;
BEGIN
    RAISE NOTICE 'add_bookmark called with target_user_id: %, post_id: %', target_user_id, post_id;
    
    -- Check if bookmark already exists
    SELECT id INTO existing_bookmark
    FROM bookmarks 
    WHERE user_id = target_user_id AND post_id = add_bookmark.post_id;
    
    IF existing_bookmark IS NOT NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Bookmark already exists',
            'bookmark_id', existing_bookmark,
            'target_user_id', target_user_id,
            'post_id', add_bookmark.post_id
        );
    ELSE
        -- Create new bookmark
        INSERT INTO bookmarks (user_id, post_id, created_at)
        VALUES (target_user_id, add_bookmark.post_id, NOW())
        RETURNING id INTO bookmark_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Bookmark added successfully',
            'bookmark_id', bookmark_id,
            'target_user_id', target_user_id,
            'post_id', add_bookmark.post_id
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'add_bookmark error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'target_user_id', target_user_id,
            'post_id', add_bookmark.post_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Grant proper permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, UUID) TO anon;

-- STEP 8: Verification 
DO $$
BEGIN
    RAISE NOTICE '🎯 NUCLEAR PARAMETER MISMATCH FIX V3 COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions created with EXACT parameter names your app expects:';
    RAISE NOTICE '   - save_user_onboarding_data(target_user_id, ...)';
    RAISE NOTICE '   - get_user_bookmarks(target_user_id)';
    RAISE NOTICE '   - add_bookmark(target_user_id, post_id)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test these functions now with your problematic user ID:';
    RAISE NOTICE '   8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3';
END $$;

-- Final verification queries
SELECT 
    'Functions created:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('save_user_onboarding_data', 'get_user_bookmarks', 'add_bookmark')
ORDER BY proname; 