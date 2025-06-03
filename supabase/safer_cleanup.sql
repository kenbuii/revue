-- SAFER CLEANUP - More controlled function replacement
-- This approach is less aggressive and includes safeguards

-- Step 1: Create the new function with a temporary name
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data_v2(
    p_user_id UUID,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_media_preferences JSONB DEFAULT '[]'::JSONB,
    p_onboarding_completed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
    media_count INTEGER;
BEGIN
    -- Start transaction logging
    RAISE NOTICE 'Starting onboarding data save for user: %', p_user_id;
    
    -- Update user profile
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % user profile rows', affected_rows;

    -- Handle media preferences safely
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        -- Count existing preferences before deletion
        SELECT COUNT(*) INTO media_count 
        FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        RAISE NOTICE 'Found % existing media preferences to replace', media_count;
        
        -- Clear existing media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences with better error handling
        INSERT INTO user_media_preferences (
            user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
        )
        SELECT 
            p_user_id,
            COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT, 'unknown_' || generate_random_uuid()::TEXT),
            COALESCE((item->>'title')::TEXT, 'Untitled'),
            COALESCE((item->>'type')::TEXT, (item->>'media_type')::TEXT, 'unknown'),
            (item->>'year')::TEXT,
            COALESCE((item->>'image')::TEXT, (item->>'image_url')::TEXT),
            (item->>'description')::TEXT,
            COALESCE((item->>'source')::TEXT, 'onboarding'),
            COALESCE((item->>'originalId')::TEXT, (item->>'original_api_id')::TEXT),
            TRUE
        FROM jsonb_array_elements(p_media_preferences) AS item;
        
        GET DIAGNOSTICS media_count = ROW_COUNT;
        RAISE NOTICE 'Inserted % new media preferences', media_count;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'profile_rows_affected', affected_rows,
        'media_preferences_count', COALESCE(media_count, 0)
    );
    
    RAISE NOTICE 'Onboarding save completed successfully';
    RETURN result;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error in onboarding save: % - %', SQLSTATE, SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Test the new function works
DO $$
DECLARE
    test_result JSONB;
BEGIN
    -- Test with a dummy call (won't actually update anything if user doesn't exist)
    SELECT save_user_onboarding_data_v2(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'Test User',
        NULL,
        FALSE,
        '[]'::JSONB,
        FALSE
    ) INTO test_result;
    
    RAISE NOTICE 'Function test result: %', test_result;
END $$;

-- Step 3: Only if test passes, drop old functions and rename
DO $$
DECLARE
    func_record RECORD;
    drop_count INTEGER := 0;
BEGIN
    -- Drop old functions one by one (not CASCADE to be safer)
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'save_user_onboarding_data'
    LOOP
        BEGIN
            RAISE NOTICE 'Dropping old function: % with args: %', func_record.proname, func_record.args;
            EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure;
            drop_count := drop_count + 1;
        EXCEPTION
            WHEN dependent_objects_still_exist THEN
                RAISE NOTICE 'Cannot drop function due to dependencies: %', func_record.args;
                RAISE EXCEPTION 'Cannot proceed - function has dependencies. Use CASCADE if you are sure.';
        END;
    END LOOP;
    
    RAISE NOTICE 'Dropped % old functions', drop_count;
    
    -- Rename the new function to the correct name
    ALTER FUNCTION save_user_onboarding_data_v2 RENAME TO save_user_onboarding_data;
    
    RAISE NOTICE '✅ Safer cleanup completed successfully!';
END $$;

-- Verify final state
SELECT 
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname = 'save_user_onboarding_data'; 