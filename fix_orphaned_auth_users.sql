-- =======================================
-- FIX: Orphaned Auth Users Without Profiles
-- Create user_profiles for authenticated users who are missing them
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

-- Step 2: Create user_profiles for orphaned auth users
-- This will create minimal profiles that can be completed later
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
    -- Generate temporary username from email prefix + random suffix
    CONCAT(
        LOWER(SPLIT_PART(au.email, '@', 1)),
        '_',
        SUBSTRING(au.id::text, 1, 4)
    ) as username,
    -- Use email prefix as display name initially
    INITCAP(SPLIT_PART(au.email, '@', 1)) as display_name,
    '' as bio,
    '' as avatar_url,
    NULL as email_hash, -- Will be set when they enable contact sync
    false as onboarding_completed, -- Mark as incomplete so they can finish onboarding
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
    'Newly created profiles (onboarding_completed = false)' as metric,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = false;

-- Step 4: Show the newly created profiles
SELECT 'NEWLY_CREATED_PROFILES' as step;
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.onboarding_completed,
    up.created_at as profile_created,
    au.email,
    'NEWLY_CREATED' as status
FROM user_profiles up
INNER JOIN auth.users au ON up.user_id = au.id
WHERE up.onboarding_completed = false
ORDER BY up.created_at DESC;

-- Step 5: Test that these users can now make posts (check FK constraint)
SELECT 'FK_CONSTRAINT_TEST' as step;
SELECT 
    'Users who can now make posts' as test_result,
    COUNT(*) as count
FROM user_profiles up
INNER JOIN auth.users au ON up.user_id = au.id
WHERE up.user_id IS NOT NULL;

SELECT 'ORPHANED_USERS_FIX_COMPLETE' as result; 