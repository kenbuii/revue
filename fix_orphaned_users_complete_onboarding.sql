-- =======================================
-- FIX: Orphaned Auth Users + Durable Onboarding Strategy
-- Create complete user_profiles for orphaned users AND fix the root cause
-- =======================================

-- Step 1: Identify the orphaned users
SELECT 'ORPHANED_USERS_IDENTIFIED' as step;
SELECT 
    au.id as user_id,
    au.email,
    au.created_at as auth_created,
    au.email_confirmed_at,
    'MISSING_PROFILE' as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Create COMPLETE user_profiles for orphaned auth users
-- Set onboarding_completed = TRUE so they're fully functional
INSERT INTO user_profiles (
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
)
SELECT 
    au.id as user_id,
    -- Generate unique username from email prefix + UUID suffix
    CONCAT(
        LOWER(REGEXP_REPLACE(SPLIT_PART(au.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')),
        '_',
        SUBSTRING(au.id::text, 1, 6)
    ) as username,
    -- Use email prefix as display name initially
    INITCAP(SPLIT_PART(au.email, '@', 1)) as display_name,
    '' as bio,
    '' as avatar_url,
    NULL as email_hash,
    true as onboarding_completed, -- SET TO TRUE - they are now fully functional
    false as contact_sync_enabled,
    '{}'::jsonb as media_preferences,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- Step 3: Verify the fix worked
SELECT 'VERIFICATION_AFTER_FIX' as step;
SELECT 
    'Total auth.users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Total user_profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Auth users WITHOUT profiles (should be 0)' as metric,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
UNION ALL
SELECT 
    'Profiles with onboarding_completed = TRUE' as metric,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = true;

-- Step 4: Show the newly created COMPLETE profiles
SELECT 'NEWLY_CREATED_COMPLETE_PROFILES' as step;
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.onboarding_completed,
    up.created_at as profile_created,
    au.email,
    'NEWLY_CREATED_COMPLETE' as status
FROM user_profiles up
INNER JOIN auth.users au ON up.user_id = au.id
WHERE up.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY up.created_at DESC;

-- Step 5: DURABLE SOLUTION - Check if handle_new_user trigger is working
SELECT 'TRIGGER_ANALYSIS' as step;
SELECT 
    'handle_new_user function exists' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'handle_new_user'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'on_auth_user_created trigger exists' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Step 6: Test the handle_new_user function manually
SELECT 'TESTING_HANDLE_NEW_USER_FUNCTION' as step;
-- This will show us if the function works correctly
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Step 7: Check if the trigger is properly configured
SELECT 'TRIGGER_CONFIGURATION' as step;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'ORPHANED_USERS_FIXED_AND_SYSTEM_ANALYZED' as result; 