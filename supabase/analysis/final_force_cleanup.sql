-- FINAL FORCE CLEANUP - Remove ALL target_user_id functions
-- This script will forcefully remove any remaining functions using old parameter names

-- Step 1: Drop ALL functions with target_user_id (including any variations)
DO $$
DECLARE
    func_record RECORD;
    drop_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting forced cleanup of target_user_id functions...';
    
    -- Find and drop ALL functions that use target_user_id in their signature
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND pg_catalog.pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
    LOOP
        BEGIN
            RAISE NOTICE 'Force dropping function with target_user_id: % - Args: %', func_record.proname, func_record.args;
            EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
            drop_count := drop_count + 1;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Could not drop function %: %', func_record.oid, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Force dropped % functions with target_user_id', drop_count;
END $$;

-- Step 2: Ensure we have the correct save_user_onboarding_data function
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
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
    RAISE NOTICE 'Saving onboarding data for user: %', p_user_id;
    
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

    -- Handle media preferences
    media_count := 0;
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences with dual format support
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
        RAISE NOTICE 'Inserted % media preferences', media_count;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'profile_rows_affected', affected_rows,
        'media_preferences_count', media_count,
        'user_id', p_user_id
    );
    
    RETURN result;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error saving onboarding data: % - %', SQLSTATE, SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate other needed functions with correct parameter names
CREATE OR REPLACE FUNCTION public.get_user_media_preferences(p_user_id UUID)
RETURNS TABLE (
    media_id TEXT,
    title TEXT,
    media_type TEXT,
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT,
    original_api_id TEXT,
    added_during_onboarding BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ump.media_id,
        ump.title,
        ump.media_type,
        ump.year,
        ump.image_url,
        ump.description,
        ump.source,
        ump.original_api_id,
        ump.added_during_onboarding,
        ump.created_at
    FROM user_media_preferences ump
    WHERE ump.user_id = p_user_id
    ORDER BY ump.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Final verification
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    -- Count remaining functions with target_user_id
    SELECT COUNT(*) INTO func_count
    FROM pg_catalog.pg_proc p
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND pg_catalog.pg_get_function_arguments(p.oid) LIKE '%target_user_id%';
    
    IF func_count > 0 THEN
        RAISE NOTICE '⚠️ WARNING: % functions still have target_user_id parameters', func_count;
    ELSE
        RAISE NOTICE '✅ SUCCESS: No functions with target_user_id remain';
    END IF;
    
    -- Show current save_user_onboarding_data functions
    RAISE NOTICE 'Current save_user_onboarding_data functions:';
END $$;

-- Show final function signature
SELECT 
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname = 'save_user_onboarding_data'; 