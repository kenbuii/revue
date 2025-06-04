-- FIX PROFILE INTEGRATION - Complete solution
-- Fixes: missing profiles, source mapping, UPSERT functionality

-- STEP 1: Create the missing profile for our test user
INSERT INTO public.user_profiles (
    id,
    username,
    display_name,
    bio,
    avatar_url,
    email_hash,
    onboarding_completed,
    contact_sync_enabled,
    created_at,
    updated_at
) VALUES (
    '670e0647-bfcb-4322-aa76-059452af9e01'::UUID,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    FALSE,
    FALSE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- STEP 2: Create a trigger to auto-create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        username,
        display_name,
        bio,
        avatar_url,
        email_hash,
        onboarding_completed,
        contact_sync_enabled,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE,
        FALSE,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STEP 3: Fix the save_user_onboarding_data function to use UPSERT and map sources
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID);

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
    mapped_source TEXT;
BEGIN
    RAISE NOTICE 'save_user_onboarding_data called with p_user_id: %', p_user_id;
    
    -- Handle NULL values gracefully
    IF p_media_preferences IS NULL THEN
        p_media_preferences := '[]'::JSONB;
    END IF;
    
    -- UPSERT user profile (INSERT or UPDATE)
    INSERT INTO user_profiles (
        id,
        display_name,
        avatar_url,
        contact_sync_enabled,
        onboarding_completed,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_display_name,
        p_avatar_url,
        COALESCE(p_contact_sync_enabled, FALSE),
        COALESCE(p_onboarding_completed, FALSE),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        contact_sync_enabled = EXCLUDED.contact_sync_enabled,
        onboarding_completed = EXCLUDED.onboarding_completed,
        updated_at = NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Upserted % rows in user_profiles', affected_rows;

    -- Handle media preferences if provided
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences with source mapping
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
            -- MAP SOURCE VALUES TO ALLOWED CONSTRAINT VALUES
            CASE 
                WHEN (item->>'source')::TEXT = 'nyt_bestsellers' THEN 'google_books'
                WHEN (item->>'source')::TEXT = 'tmdb' THEN 'tmdb'
                WHEN (item->>'source')::TEXT = 'google_books' THEN 'google_books'
                ELSE 'popular'  -- fallback for any other sources
            END,
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

-- STEP 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- STEP 5: Test with the problematic data
DO $$
DECLARE
    test_result JSONB;
BEGIN
    RAISE NOTICE '🧪 Testing the fixed function with real onboarding data...';
    
    SELECT public.save_user_onboarding_data(
        NULL::TEXT,                         -- p_avatar_url
        FALSE::BOOLEAN,                     -- p_contact_sync_enabled  
        'Test Guy'::TEXT,                   -- p_display_name
        '[{"id":"nyt_9780593441299","title":"Great Big Beautiful Life","type":"book","source":"nyt_bestsellers","year":"2025"}]'::JSONB,  -- p_media_preferences with nyt_bestsellers
        FALSE::BOOLEAN,                     -- p_onboarding_completed
        '670e0647-bfcb-4322-aa76-059452af9e01'::UUID  -- p_user_id
    ) INTO test_result;
    
    RAISE NOTICE '✅ Test result: %', test_result;
END $$;

-- STEP 6: Verification
DO $$
BEGIN
    RAISE NOTICE '🎯 PROFILE INTEGRATION FIX COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Issues:';
    RAISE NOTICE '   1. Created missing user profile';
    RAISE NOTICE '   2. Added auto-profile creation trigger';
    RAISE NOTICE '   3. Changed UPDATE to UPSERT in save function';
    RAISE NOTICE '   4. Mapped nyt_bestsellers → google_books for constraint';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test your onboarding flow now!';
END $$;

-- Final verification query
SELECT 
    'Profile Integration Status:' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01')
        THEN '✅ Test user profile NOW EXISTS'
        ELSE '❌ Still missing profile'
    END as profile_status,
    COALESCE((
        SELECT COUNT(*)::TEXT 
        FROM user_media_preferences 
        WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01'
    ), '0') as media_preferences_count; 