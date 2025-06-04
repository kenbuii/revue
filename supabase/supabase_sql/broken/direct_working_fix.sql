-- ============================================================================
-- DIRECT WORKING FIX - Based on Debug Results
-- Fixes the exact issues identified: id column + UUID format + trigger creation
-- ============================================================================

-- Step 1: Clean slate - drop existing broken trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the working trigger function that uses 'id' column with proper UUIDs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert using the 'id' column (which is what the table actually has)
    INSERT INTO public.user_profiles (
        id,                          -- Use 'id' column, not 'user_id'
        username,
        display_name,
        email_hash,
        onboarding_completed,
        contact_sync_enabled,
        created_at
    )
    VALUES (
        NEW.id,                      -- This is already a UUID from auth.users
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1),
            'user_' || substr(NEW.id::text, 1, 8)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1)
        ),
        encode(digest(NEW.email, 'sha256'), 'hex'),
        FALSE,
        FALSE,
        NOW()
    );
    
    -- Log success
    RAISE NOTICE 'Successfully created user profile for user: %', NEW.id;
    RETURN NEW;
    
EXCEPTION
    WHEN others THEN
        -- Log the exact error for debugging
        RAISE WARNING 'Failed to create user profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
        RETURN NEW; -- Don't fail the signup
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant all necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 5: Fix the save_user_onboarding_data function to use 'id' column
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_username TEXT DEFAULT NULL,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_onboarding_completed BOOLEAN DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT NULL,
    p_media_preferences JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    media_item JSONB;
    affected_rows INTEGER;
BEGIN
    -- Update user profile using 'id' column (not user_id)
    UPDATE user_profiles SET
        username = COALESCE(p_username, username),
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        onboarding_completed = COALESCE(p_onboarding_completed, onboarding_completed),
        contact_sync_enabled = COALESCE(p_contact_sync_enabled, contact_sync_enabled),
        updated_at = NOW()
    WHERE id = p_user_id;  -- Use 'id' column, not 'user_id'
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Handle media preferences if provided
    IF p_media_preferences IS NOT NULL AND jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        FOR media_item IN SELECT * FROM jsonb_array_elements(p_media_preferences)
        LOOP
            INSERT INTO user_media_preferences (
                user_id,  -- This foreign key should point to user_profiles.id
                media_id,
                title,
                media_type,
                year,
                image_url,
                description,
                source,
                original_api_id,
                added_during_onboarding
            ) VALUES (
                p_user_id,
                media_item->>'id',
                media_item->>'title',
                media_item->>'type',
                media_item->>'year',
                media_item->>'image',
                media_item->>'description',
                media_item->>'source',
                media_item->>'originalId',
                TRUE
            );
        END LOOP;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Fix find_users_by_email_hash to use 'id' column
CREATE OR REPLACE FUNCTION public.find_users_by_email_hash(email_hashes TEXT[])
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id as user_id,      -- Return 'id' as 'user_id' for app compatibility
        up.username,
        up.display_name,
        up.avatar_url
    FROM user_profiles up
    WHERE up.email_hash = ANY(email_hashes)
    AND up.onboarding_completed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant permissions for all functions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT[]) TO anon;

-- Step 8: Verify everything was created
SELECT 
    'Trigger created: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as trigger_status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

SELECT 
    'Functions created: ' || COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('handle_new_user', 'save_user_onboarding_data', 'find_users_by_email_hash');

-- Step 9: Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 DIRECT FIX APPLIED!';
    RAISE NOTICE '✅ Trigger uses id column with proper UUID handling';
    RAISE NOTICE '✅ Functions updated to use id column';
    RAISE NOTICE '✅ All permissions granted';
    RAISE NOTICE '🧪 Test with: node test_after_column_fix.js';
END $$; 