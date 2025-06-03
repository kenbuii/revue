-- Fix the generate_random_uuid() error
-- PostgreSQL uses gen_random_uuid(), not generate_random_uuid()

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
        
        -- Insert new media preferences with CORRECT UUID function
        INSERT INTO user_media_preferences (
            user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
        )
        SELECT 
            p_user_id,
            COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT, 'unknown_' || gen_random_uuid()::TEXT),
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

-- Test the function to make sure it works
SELECT save_user_onboarding_data(
    'b41990da-1bfd-4416-918a-a18b1df2b6cf'::UUID,
    'Test User',
    NULL,
    FALSE,
    '[]'::JSONB,
    FALSE
); 