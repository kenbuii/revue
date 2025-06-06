-- FIX SOURCE CONSTRAINT VIOLATION
-- Update function to use allowed source values

-- Drop and recreate the function with correct source values
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) CASCADE;

CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT false,
    p_display_name TEXT DEFAULT NULL,
    p_media_preferences JSONB DEFAULT '[]'::jsonb,
    p_onboarding_completed BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INTEGER := 0;
    result JSONB;
BEGIN
    -- Insert or update user_profiles
    INSERT INTO user_profiles (
        user_id,
        username,
        display_name,
        avatar_url,
        onboarding_completed,
        contact_sync_enabled,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        COALESCE(p_display_name, 'user_' || SUBSTRING(p_user_id::text, 1, 8)),
        p_display_name,
        p_avatar_url,
        p_onboarding_completed,
        p_contact_sync_enabled,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        onboarding_completed = COALESCE(EXCLUDED.onboarding_completed, user_profiles.onboarding_completed),
        contact_sync_enabled = COALESCE(EXCLUDED.contact_sync_enabled, user_profiles.contact_sync_enabled),
        updated_at = NOW();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Handle media preferences with CORRECT source values
    IF p_media_preferences IS NOT NULL AND jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing preferences  
        DELETE FROM user_media_preferences WHERE user_id = p_user_id;
        
        -- Insert new preferences using ALLOWED source values
        INSERT INTO user_media_preferences (
            user_id, 
            media_id, 
            title,
            media_type,
            year,
            image_url, 
            description,
            source,                  -- Use allowed source values
            original_api_id,
            added_during_onboarding,
            created_at
        )
        SELECT 
            p_user_id,
            (pref->>'id')::text,
            (pref->>'title')::text,
            (pref->>'type')::text,
            (pref->>'year')::text,
            (pref->>'image')::text,
            (pref->>'description')::text,
            -- Map to allowed source values based on media type/source
            CASE 
                WHEN (pref->>'type')::text = 'book' THEN 'google_books'
                WHEN (pref->>'type')::text IN ('movie', 'tv') THEN 'tmdb'
                ELSE 'popular'
            END,
            (pref->>'id')::text,
            true,
            NOW()
        FROM jsonb_array_elements(p_media_preferences) AS pref;
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
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon;

SELECT 'SOURCE CONSTRAINT FIXED!' as status; 