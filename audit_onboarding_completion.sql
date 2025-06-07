-- =======================================
-- AUDIT: Onboarding Completion & User Registration
-- Check if users completing onboarding are properly authenticated and flagged
-- =======================================

-- Step 1: Check auth.users vs user_profiles alignment
SELECT 'AUTH_USERS_VS_PROFILES_ALIGNMENT' as audit_step;
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
    'Users with matching profiles' as metric,
    COUNT(*) as count
FROM auth.users au
INNER JOIN user_profiles up ON au.id = up.user_id
UNION ALL
SELECT 
    'Auth users WITHOUT profiles' as metric,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
UNION ALL
SELECT 
    'Profiles WITHOUT auth users' as metric,
    COUNT(*) as count
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE au.id IS NULL;

-- Step 2: Onboarding completion audit
SELECT 'ONBOARDING_COMPLETION_AUDIT' as audit_step;
SELECT 
    'Profiles with onboarding_completed = TRUE' as metric,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = true
UNION ALL
SELECT 
    'Profiles with onboarding_completed = FALSE' as metric,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = false
UNION ALL
SELECT 
    'Profiles with onboarding_completed = NULL' as metric,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed IS NULL
UNION ALL
SELECT 
    'Completed profiles with username' as metric,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = true AND username IS NOT NULL
UNION ALL
SELECT 
    'Completed profiles with display_name' as metric,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = true AND display_name IS NOT NULL;

-- Step 3: Recent onboarding activity (last 24 hours)
SELECT 'RECENT_ONBOARDING_ACTIVITY' as audit_step;
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.onboarding_completed,
    up.created_at as profile_created,
    up.updated_at as profile_updated,
    au.created_at as auth_user_created,
    au.email,
    au.email_confirmed_at,
    CASE 
        WHEN up.onboarding_completed = true THEN '✅ COMPLETED'
        WHEN up.onboarding_completed = false THEN '⏳ PENDING'
        WHEN up.onboarding_completed IS NULL THEN '❓ NULL'
    END as onboarding_status,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED'
        ELSE '❌ UNCONFIRMED'
    END as email_status
FROM user_profiles up
INNER JOIN auth.users au ON up.user_id = au.id
WHERE up.created_at > NOW() - INTERVAL '24 hours'
   OR up.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY up.updated_at DESC, up.created_at DESC;

-- Step 4: Check for inconsistent onboarding states
SELECT 'INCONSISTENT_ONBOARDING_STATES' as audit_step;
SELECT 
    'Completed but missing username' as issue_type,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = true AND (username IS NULL OR username = '')
UNION ALL
SELECT 
    'Completed but missing display_name' as issue_type,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed = true AND (display_name IS NULL OR display_name = '')
UNION ALL
SELECT 
    'Has username but onboarding incomplete' as issue_type,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed != true AND username IS NOT NULL AND username != ''
UNION ALL
SELECT 
    'Created >1 hour ago but onboarding incomplete' as issue_type,
    COUNT(*) as count
FROM user_profiles
WHERE onboarding_completed != true AND created_at < NOW() - INTERVAL '1 hour';

-- Step 5: Detailed view of problematic users
SELECT 'PROBLEMATIC_USERS_DETAIL' as audit_step;
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.onboarding_completed,
    up.created_at as profile_created,
    au.email,
    au.created_at as auth_created,
    CASE 
        WHEN up.onboarding_completed = true AND (up.username IS NULL OR up.username = '') THEN 'COMPLETED_BUT_NO_USERNAME'
        WHEN up.onboarding_completed = true AND (up.display_name IS NULL OR up.display_name = '') THEN 'COMPLETED_BUT_NO_DISPLAY_NAME'
        WHEN up.onboarding_completed != true AND up.username IS NOT NULL AND up.username != '' THEN 'HAS_USERNAME_BUT_INCOMPLETE'
        WHEN up.onboarding_completed != true AND up.created_at < NOW() - INTERVAL '1 hour' THEN 'OLD_INCOMPLETE_ONBOARDING'
        ELSE 'OTHER_ISSUE'
    END as issue_type
FROM user_profiles up
INNER JOIN auth.users au ON up.user_id = au.id
WHERE 
    (up.onboarding_completed = true AND (up.username IS NULL OR up.username = '')) OR
    (up.onboarding_completed = true AND (up.display_name IS NULL OR up.display_name = '')) OR
    (up.onboarding_completed != true AND up.username IS NOT NULL AND up.username != '') OR
    (up.onboarding_completed != true AND up.created_at < NOW() - INTERVAL '1 hour')
ORDER BY up.created_at DESC;

-- Step 6: Check RLS and trigger functionality
SELECT 'RLS_AND_TRIGGERS_CHECK' as audit_step;
SELECT 
    'handle_new_user trigger exists' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'user_profiles RLS enabled' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'user_profiles' AND rowsecurity = true
        ) THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status;

-- Step 7: Sample successful onboarding records
SELECT 'SUCCESSFUL_ONBOARDING_SAMPLES' as audit_step;
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.onboarding_completed,
    up.created_at as profile_created,
    au.email,
    'SUCCESSFUL_EXAMPLE' as status
FROM user_profiles up
INNER JOIN auth.users au ON up.user_id = au.id
WHERE up.onboarding_completed = true 
  AND up.username IS NOT NULL 
  AND up.username != ''
  AND up.display_name IS NOT NULL 
  AND up.display_name != ''
ORDER BY up.created_at DESC
LIMIT 5;

-- Step 8: Check if ensure_user_profile_exists function is working
SELECT 'ENSURE_PROFILE_FUNCTION_TEST' as audit_step;
SELECT 
    'ensure_user_profile_exists function exists' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'ensure_user_profile_exists'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

SELECT 'ONBOARDING_AUDIT_COMPLETE' as result; 