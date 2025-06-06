-- =======================================
-- FINAL FIX: save_user_onboarding_data Function
-- Handle undefined onboarding_completed properly
-- =======================================

CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_display_name TEXT DEFAULT NULL,
    p_media_preferences JSONB DEFAULT '[]'::JSONB,
    p_onboarding_completed BOOLEAN DEFAULT NULL -- Changed from FALSE to NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE 'save_user_onboarding_data called with p_user_id: %, p_onboarding_completed: %', p_user_id, p_onboarding_completed;
    
    -- Update user profile, preserving existing onboarding_completed if not specified
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        -- FIXED: Only update onboarding_completed if explicitly provided (not NULL)
        onboarding_completed = CASE 
            WHEN p_onboarding_completed IS NOT NULL THEN p_onboarding_completed
            ELSE onboarding_completed -- Preserve existing value
        END,
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon;

SELECT 'Onboarding function fixed to preserve existing completion status!' as result; 