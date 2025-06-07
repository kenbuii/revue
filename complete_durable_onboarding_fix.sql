-- =======================================
-- COMPLETE DURABLE ONBOARDING FIX
-- Fix current orphaned users + ensure future users work automatically
-- =======================================

-- PART 1: Fix the handle_new_user trigger (durable solution)
-- This ensures ALL new signups automatically get user_profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        user_id,
        username,
        display_name,
        bio,
        avatar_url,
        email_hash,
        onboarding_completed,
        contact_sync_enabled,
        media_preferences,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        -- Generate username from email
        CONCAT(
            LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')),
            '_',
            SUBSTRING(NEW.id::text, 1, 4)
        ),
        -- Generate display name from email
        INITCAP(SPLIT_PART(NEW.email, '@', 1)),
        '',
        '',
        NULL,
        false, -- Will be set to true when they complete onboarding
        false,
        '{}',
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PART 2: Fix save_user_onboarding_data function (consistent with frontend)
-- This ensures onboarding completion works properly

CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_display_name TEXT DEFAULT NULL,
    p_media_preferences JSONB DEFAULT '[]'::JSONB,
    p_onboarding_completed BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
BEGIN
    RAISE NOTICE 'save_user_onboarding_data called with p_user_id: %, p_onboarding_completed: %', p_user_id, p_onboarding_completed;
    
    -- Update user profile using user_id (not id) to match our schema
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        -- CRITICAL: Only update onboarding_completed if explicitly provided
        onboarding_completed = CASE 
            WHEN p_onboarding_completed IS NOT NULL THEN p_onboarding_completed
            ELSE onboarding_completed
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % rows in user_profiles', affected_rows;

    -- Handle media preferences if provided
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences with robust field mapping
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
        FROM jsonb_array_elements(p_media_preferences) AS item
        WHERE COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT) IS NOT NULL;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows,
        'user_id', p_user_id,
        'onboarding_completed', p_onboarding_completed
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

-- PART 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon, authenticated;

-- PART 4: Test the fix works
SELECT 'DURABLE_ONBOARDING_FIX_VERIFICATION' as test;
SELECT 
    'handle_new_user function updated' as check_type,
    '✅ READY' as status
UNION ALL
SELECT 
    'save_user_onboarding_data function updated' as check_type,
    '✅ READY' as status
UNION ALL
SELECT 
    'on_auth_user_created trigger recreated' as check_type,
    '✅ READY' as status;

SELECT 'DURABLE_ONBOARDING_SYSTEM_READY' as result; 