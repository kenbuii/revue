-- NUCLEAR CLEANUP - Drop ALL save_user_onboarding_data functions by OID
-- This is the most aggressive approach to remove ALL variations

-- First, find and drop ALL functions with this name regardless of signature
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop ALL functions named save_user_onboarding_data
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
    
    RAISE NOTICE 'All save_user_onboarding_data functions dropped!';
END $$;

-- Now create the ONLY correct version
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
BEGIN
    -- Update user profile
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Clear existing media preferences if we're updating them
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        DELETE FROM user_media_preferences WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
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
        'rows_affected', affected_rows
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was created
SELECT 
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname = 'save_user_onboarding_data';

DO $$
BEGIN
    RAISE NOTICE '🧹 Nuclear cleanup completed!';
    RAISE NOTICE '✅ Only one save_user_onboarding_data function should now exist';
END $$; 