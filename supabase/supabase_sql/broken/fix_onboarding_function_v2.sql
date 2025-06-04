-- FIX ONBOARDING FUNCTION V2 - Correct PostgreSQL parameter syntax
-- App calls with: p_avatar_url, p_contact_sync_enabled, p_display_name, p_media_preferences, p_onboarding_completed, p_user_id

-- STEP 1: Drop the function we created with wrong parameters
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, display_name TEXT, contact_sync_enabled BOOLEAN, avatar_url TEXT, media_preferences JSONB, onboarding_completed BOOLEAN, username TEXT);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID);

-- STEP 2: Create the function with EXACT parameters your app expects (no defaults to avoid syntax issues)
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_avatar_url TEXT,
    p_contact_sync_enabled BOOLEAN,
    p_display_name TEXT,
    p_media_preferences JSONB,
    p_onboarding_completed BOOLEAN,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE 'save_user_onboarding_data called with p_user_id: %', p_user_id;
    
    -- Handle NULL values gracefully
    IF p_media_preferences IS NULL THEN
        p_media_preferences := '[]'::JSONB;
    END IF;
    
    -- Update user profile using 'id' column
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, user_profiles.display_name),
        avatar_url = COALESCE(p_avatar_url, user_profiles.avatar_url),
        contact_sync_enabled = COALESCE(p_contact_sync_enabled, FALSE),
        onboarding_completed = COALESCE(p_onboarding_completed, FALSE),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % rows in user_profiles', affected_rows;

    -- Handle media preferences if provided
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        INSERT INTO user_media_preferences (
            user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
        )
        SELECT 
            p_user_id,
            COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT),
            (item->>'title')::TEXT,
            COALESCE((item->>'type')::TEXT, (item->>'media_type')::TEXT),
            (item->>'year')::TEXT,
            COALESCE((item->>'image')::TEXT, (item->>'image_url')::TEXT),
            (item->>'description')::TEXT,
            (item->>'source')::TEXT,
            COALESCE((item->>'originalId')::TEXT, (item->>'original_api_id')::TEXT),
            TRUE
        FROM jsonb_array_elements(p_media_preferences) AS item
        WHERE COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT) IS NOT NULL;
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
        RAISE NOTICE 'save_user_onboarding_data error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID) TO anon;

-- STEP 4: Verification
DO $$
BEGIN
    RAISE NOTICE '🎯 ONBOARDING FUNCTION FIX V2 COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Function now matches exact app call:';
    RAISE NOTICE '   save_user_onboarding_data(p_avatar_url, p_contact_sync_enabled, p_display_name, p_media_preferences, p_onboarding_completed, p_user_id)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Will update user_profiles and user_media_preferences tables';
    RAISE NOTICE '⚠️  No defaults used to avoid PostgreSQL syntax issues';
END $$;

-- Final verification query
SELECT 
    'Fixed Onboarding Function V2:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'save_user_onboarding_data'
ORDER BY proname; 