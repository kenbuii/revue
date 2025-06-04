-- ============================================================================
-- FOREIGN KEY CONSTRAINT FIX
-- Addresses the user_profiles_id_fkey constraint that's blocking profile creation
-- ============================================================================

-- Step 1: Analyze the current foreign key constraint
DO $$
DECLARE
    constraint_info RECORD;
BEGIN
    -- Get information about the problematic constraint
    SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    INTO constraint_info
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'user_profiles'
        AND tc.constraint_name = 'user_profiles_id_fkey';
    
    IF FOUND THEN
        RAISE NOTICE 'CONSTRAINT ANALYSIS:';
        RAISE NOTICE 'Constraint: %', constraint_info.constraint_name;
        RAISE NOTICE 'Table: %', constraint_info.table_name;
        RAISE NOTICE 'Column: %', constraint_info.column_name;
        RAISE NOTICE 'References: %.%', constraint_info.foreign_table_name, constraint_info.foreign_column_name;
    ELSE
        RAISE NOTICE 'Constraint user_profiles_id_fkey not found';
    END IF;
END $$;

-- Step 2: Drop the problematic foreign key constraint temporarily
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Step 3: Create a new, more flexible constraint that allows our trigger to work
-- We'll use a DEFERRABLE constraint that gets checked at the end of the transaction
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Step 4: Drop and recreate the trigger function with better constraint handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 5: Create an improved trigger function that works with deferred constraints
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_profile_count INTEGER;
    insert_result RECORD;
    retry_count INTEGER := 0;
    max_retries INTEGER := 3;
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
    
    -- Retry loop for handling constraint timing issues
    WHILE retry_count < max_retries LOOP
        BEGIN
            -- Attempt to insert the user profile
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
            
            -- If we get here, insertion was successful
            RAISE NOTICE 'TRIGGER SUCCESS: Profile created for user % with username % (attempt %)', 
                NEW.id, insert_result.username, retry_count + 1;
            EXIT; -- Exit the retry loop
            
        EXCEPTION
            WHEN foreign_key_violation THEN
                retry_count := retry_count + 1;
                RAISE WARNING 'TRIGGER RETRY %/%: Foreign key violation for user % - %', 
                    retry_count, max_retries, NEW.id, SQLERRM;
                
                IF retry_count >= max_retries THEN
                    RAISE WARNING 'TRIGGER FAILED: Max retries exceeded for user % - giving up', NEW.id;
                    EXIT;
                ELSE
                    -- Small delay before retry
                    PERFORM pg_sleep(0.1);
                END IF;
                
            WHEN unique_violation THEN
                RAISE WARNING 'TRIGGER INFO: Profile already exists for user % (unique violation)', NEW.id;
                EXIT; -- Profile exists, that's ok
                
            WHEN others THEN
                RAISE WARNING 'TRIGGER ERROR: Unexpected error for user %: % (SQLSTATE: %)', 
                    NEW.id, SQLERRM, SQLSTATE;
                EXIT; -- Don't retry on unexpected errors
        END;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- Step 8: Update the manual test function to work with real auth users
CREATE OR REPLACE FUNCTION public.test_trigger_with_real_user(test_email TEXT, test_password TEXT DEFAULT 'TestUser123!')
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    auth_response JSONB;
    test_user_id UUID;
    profile_count INTEGER;
    wait_seconds INTEGER := 5;
BEGIN
    RAISE NOTICE 'MANUAL TEST: Creating real auth user for %', test_email;
    
    -- This function would need to be called from the application side
    -- since we can't directly create auth users from SQL
    
    result := jsonb_build_object(
        'success', false,
        'message', 'This function needs to be called from application side',
        'test_email', test_email,
        'instruction', 'Use the app signup API to test with real auth users'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create a function to manually fix existing auth users without profiles
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS JSONB AS $$
DECLARE
    missing_user RECORD;
    created_count INTEGER := 0;
    error_count INTEGER := 0;
    result JSONB;
BEGIN
    RAISE NOTICE 'BACKFILL: Starting to create profiles for auth users without profiles';
    
    -- Find auth users without profiles
    FOR missing_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON au.id = up.id
        WHERE up.id IS NULL
    LOOP
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
                missing_user.id,
                COALESCE(
                    missing_user.raw_user_meta_data->>'username',
                    split_part(missing_user.email, '@', 1),
                    'user_' || substr(missing_user.id::text, 1, 8)
                ),
                COALESCE(
                    missing_user.raw_user_meta_data->>'display_name',
                    missing_user.raw_user_meta_data->>'username',
                    split_part(missing_user.email, '@', 1),
                    'User ' || substr(missing_user.id::text, 1, 8)
                ),
                encode(digest(LOWER(missing_user.email), 'sha256'), 'hex'),
                FALSE,
                FALSE,
                COALESCE(missing_user.created_at, NOW()),
                NOW()
            );
            
            created_count := created_count + 1;
            RAISE NOTICE 'BACKFILL: Created profile for user %', missing_user.id;
            
        EXCEPTION
            WHEN others THEN
                error_count := error_count + 1;
                RAISE WARNING 'BACKFILL ERROR: Failed to create profile for user %: %', 
                    missing_user.id, SQLERRM;
        END;
    END LOOP;
    
    result := jsonb_build_object(
        'success', true,
        'profiles_created', created_count,
        'errors', error_count,
        'message', format('Backfill complete: %s profiles created, %s errors', created_count, error_count)
    );
    
    RAISE NOTICE 'BACKFILL COMPLETE: % profiles created, % errors', created_count, error_count;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.test_trigger_with_real_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_trigger_with_real_user(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.test_trigger_with_real_user(TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.backfill_missing_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_missing_profiles() TO service_role;

-- Step 10: Verify the fix
SELECT 
    'New constraint created: ' || CASE WHEN COUNT(*) > 0 THEN 'YES ✅' ELSE 'NO ❌' END as status
FROM information_schema.table_constraints 
WHERE table_name = 'user_profiles' 
    AND constraint_name = 'user_profiles_id_fkey'
    AND constraint_type = 'FOREIGN KEY';

SELECT 
    'Trigger recreated: ' || CASE WHEN COUNT(*) > 0 THEN 'YES ✅' ELSE 'NO ❌' END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Step 11: Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 FOREIGN KEY CONSTRAINT FIX APPLIED!';
    RAISE NOTICE '✅ Constraint changed to DEFERRABLE INITIALLY DEFERRED';
    RAISE NOTICE '✅ Trigger function improved with retry logic';
    RAISE NOTICE '✅ Backfill function added for existing users';
    RAISE NOTICE '🧪 Test with: node test_robust_trigger.js';
    RAISE NOTICE '🔄 Backfill existing users: SELECT public.backfill_missing_profiles();';
END $$; 