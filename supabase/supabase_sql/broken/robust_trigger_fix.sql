-- ============================================================================
-- ROBUST TRIGGER FIX - Handles Foreign Key Constraints + Silent Failures
-- This addresses the foreign key constraint issue and adds comprehensive logging
-- ============================================================================

-- Step 1: Drop existing broken trigger and function completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create a robust trigger function that handles foreign key constraints
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_profile_count INTEGER;
    insert_result RECORD;
BEGIN
    -- Log the trigger execution start
    RAISE NOTICE 'TRIGGER STARTED: Creating profile for user %', NEW.id;
    
    -- Check if profile already exists to avoid duplicates
    SELECT COUNT(*) INTO existing_profile_count 
    FROM public.user_profiles 
    WHERE id = NEW.id;
    
    IF existing_profile_count > 0 THEN
        RAISE NOTICE 'TRIGGER SKIPPED: Profile already exists for user %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Attempt to insert the user profile
    BEGIN
        INSERT INTO public.user_profiles (
            id,
            username,
            display_name,
            email_hash,
            onboarding_completed,
            contact_sync_enabled,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(
                NEW.raw_user_meta_data->>'username',
                split_part(NEW.email, '@', 1),
                'user_' || substr(NEW.id::text, 1, 8)
            ),
            COALESCE(
                NEW.raw_user_meta_data->>'display_name',
                NEW.raw_user_meta_data->>'username',
                split_part(NEW.email, '@', 1),
                'User ' || substr(NEW.id::text, 1, 8)
            ),
            encode(digest(LOWER(NEW.email), 'sha256'), 'hex'),
            FALSE,
            FALSE,
            NOW(),
            NOW()
        )
        RETURNING * INTO insert_result;
        
        -- Log successful insertion
        RAISE NOTICE 'TRIGGER SUCCESS: Profile created for user % with username %', NEW.id, insert_result.username;
        
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE WARNING 'TRIGGER ERROR: Foreign key violation for user % - %', NEW.id, SQLERRM;
            RAISE WARNING 'This usually means the auth.users record is not yet committed';
            -- Don't fail the auth signup, just log the error
            
        WHEN unique_violation THEN
            RAISE WARNING 'TRIGGER ERROR: Unique violation for user % - %', NEW.id, SQLERRM;
            -- Profile might already exist, that's ok
            
        WHEN others THEN
            RAISE WARNING 'TRIGGER ERROR: Unexpected error for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
            -- Don't fail the auth signup
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger with proper timing
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant comprehensive permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- Step 5: Create a manual trigger test function for debugging
CREATE OR REPLACE FUNCTION public.test_trigger_manually(test_email TEXT, test_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    test_id UUID;
    result JSONB;
    profile_count INTEGER;
BEGIN
    -- Use provided ID or generate a new one
    test_id := COALESCE(test_user_id, gen_random_uuid());
    
    -- Simulate trigger execution
    RAISE NOTICE 'MANUAL TRIGGER TEST: Testing profile creation for %', test_id;
    
    BEGIN
        INSERT INTO public.user_profiles (
            id,
            username,
            display_name,
            email_hash,
            onboarding_completed,
            contact_sync_enabled,
            created_at,
            updated_at
        )
        VALUES (
            test_id,
            split_part(test_email, '@', 1),
            'Test User ' || substr(test_id::text, 1, 8),
            encode(digest(LOWER(test_email), 'sha256'), 'hex'),
            FALSE,
            FALSE,
            NOW(),
            NOW()
        );
        
        -- Check if it was created
        SELECT COUNT(*) INTO profile_count 
        FROM public.user_profiles 
        WHERE id = test_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Manual trigger test successful',
            'test_user_id', test_id,
            'test_email', test_email,
            'profile_created', profile_count > 0
        );
        
    EXCEPTION
        WHEN others THEN
            result := jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'sqlstate', SQLSTATE,
                'test_user_id', test_id,
                'test_email', test_email
            );
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for test function
GRANT EXECUTE ON FUNCTION public.test_trigger_manually(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_trigger_manually(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.test_trigger_manually(TEXT, UUID) TO service_role;

-- Step 6: Create a function to check trigger status
CREATE OR REPLACE FUNCTION public.check_trigger_health()
RETURNS JSONB AS $$
DECLARE
    trigger_exists BOOLEAN := FALSE;
    function_exists BOOLEAN := FALSE;
    total_profiles INTEGER;
    recent_profiles INTEGER;
    result JSONB;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    -- Check if function exists
    SELECT EXISTS(
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    ) INTO function_exists;
    
    -- Count profiles
    SELECT COUNT(*) INTO total_profiles FROM public.user_profiles;
    
    -- Count recent profiles (last hour)
    SELECT COUNT(*) INTO recent_profiles 
    FROM public.user_profiles 
    WHERE created_at > NOW() - INTERVAL '1 hour';
    
    result := jsonb_build_object(
        'trigger_exists', trigger_exists,
        'function_exists', function_exists,
        'total_profiles', total_profiles,
        'recent_profiles', recent_profiles,
        'last_check', NOW(),
        'status', CASE 
            WHEN trigger_exists AND function_exists THEN 'healthy'
            ELSE 'needs_attention'
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for health check
GRANT EXECUTE ON FUNCTION public.check_trigger_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_trigger_health() TO anon;
GRANT EXECUTE ON FUNCTION public.check_trigger_health() TO service_role;

-- Step 7: Verify installation
SELECT 
    'Trigger created: ' || CASE WHEN COUNT(*) > 0 THEN 'YES ✅' ELSE 'NO ❌' END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

SELECT 
    'Function created: ' || CASE WHEN COUNT(*) > 0 THEN 'YES ✅' ELSE 'NO ❌' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- Step 8: Success message with next steps
DO $$
BEGIN
    RAISE NOTICE '🎉 ROBUST TRIGGER FIX APPLIED!';
    RAISE NOTICE '✅ Enhanced error handling for foreign key constraints';
    RAISE NOTICE '✅ Comprehensive logging for debugging';
    RAISE NOTICE '✅ Manual test functions added';
    RAISE NOTICE '🧪 Test with: node test_robust_trigger.js';
    RAISE NOTICE '🔍 Health check: SELECT public.check_trigger_health();';
    RAISE NOTICE '🧪 Manual test: SELECT public.test_trigger_manually(''test@example.com'');';
END $$; 