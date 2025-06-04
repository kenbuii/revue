-- ============================================================================
-- FIX USER PROFILE CREATION TRIGGER
-- This fixes the broken automatic user profile creation when users sign up
-- ============================================================================

-- Step 1: Check current trigger status
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgname LIKE '%user%' OR tgname LIKE '%profile%';

-- Step 2: Drop existing trigger if it exists (to recreate cleanly)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new user profile when a user signs up
    INSERT INTO public.user_profiles (
        user_id,
        username,
        display_name,
        email_hash,
        onboarding_completed,
        contact_sync_enabled,
        created_at
    )
    VALUES (
        NEW.id,
        -- Generate username from email or use a default
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1),
            'user_' || substr(NEW.id::text, 1, 8)
        ),
        -- Display name from metadata or email
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1)
        ),
        -- Hash the email for privacy
        encode(digest(NEW.email, 'sha256'), 'hex'),
        -- Default values
        FALSE, -- onboarding_completed
        FALSE, -- contact_sync_enabled
        NOW()  -- created_at
    );
    
    RAISE NOTICE 'Created user profile for user: %', NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW; -- Don't fail the signup if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 6: Verify the trigger was created
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    'Trigger created successfully' as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Step 7: Test with a notification
DO $$
BEGIN
    RAISE NOTICE '🎉 User profile creation trigger has been fixed!';
    RAISE NOTICE '✅ New users will now automatically get user_profile records';
    RAISE NOTICE '🔧 Next: Run targeted_fixes.sql to add missing find_users_by_email_hash function';
END $$; 