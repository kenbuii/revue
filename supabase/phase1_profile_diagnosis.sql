-- =======================================
-- PHASE 1B: Profile Page Data Diagnosis
-- Identify why profile data isn't loading
-- =======================================

-- Step 1: Check user_profiles table structure post-fixes
SELECT 'USER_PROFILES_TABLE_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 2: Check if user profile data exists for current user
SELECT 'USER_PROFILE_DATA_CHECK' as test;
SELECT 
    user_id,
    id,
    username,
    display_name,
    avatar_url,
    onboarding_completed,
    created_at,
    updated_at
FROM user_profiles 
WHERE user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049';

-- Step 3: Check media preferences table structure
SELECT 'MEDIA_PREFERENCES_TABLE_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences'
ORDER BY ordinal_position;

-- Step 4: Check if media preferences exist for user
SELECT 'USER_MEDIA_PREFERENCES_CHECK' as test;
SELECT 
    user_id,
    media_id,
    title,
    media_type,
    year,
    image_url,
    source,
    added_during_onboarding,
    created_at
FROM user_media_preferences 
WHERE user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
ORDER BY created_at DESC;

-- Step 5: Check if there are column name conflicts (id vs user_id)
SELECT 'COLUMN_MAPPING_CHECK' as test;
SELECT 
    'user_profiles' as table_name,
    COUNT(CASE WHEN column_name = 'id' THEN 1 END) as has_id_column,
    COUNT(CASE WHEN column_name = 'user_id' THEN 1 END) as has_user_id_column
FROM information_schema.columns 
WHERE table_name = 'user_profiles'

UNION ALL

SELECT 
    'user_media_preferences' as table_name,
    COUNT(CASE WHEN column_name = 'id' THEN 1 END) as has_id_column,
    COUNT(CASE WHEN column_name = 'user_id' THEN 1 END) as has_user_id_column
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences';

-- Step 6: Test if our onboarding function affected user_profiles queries
SELECT 'ONBOARDING_FUNCTION_IMPACT_CHECK' as test;
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_name = 'save_user_onboarding_data';

-- Step 7: Check recent updates to user_profiles table
SELECT 'RECENT_PROFILE_UPDATES' as test;
SELECT 
    user_id,
    username,
    display_name,
    onboarding_completed,
    updated_at,
    'Recent update?' as note
FROM user_profiles 
WHERE updated_at > NOW() - INTERVAL '2 hours'
ORDER BY updated_at DESC;

-- Step 8: Test basic profile query that frontend might be using
SELECT 'FRONTEND_PROFILE_QUERY_TEST' as test;
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.avatar_url,
    up.onboarding_completed,
    COUNT(ump.media_id) as media_preferences_count
FROM user_profiles up
LEFT JOIN user_media_preferences ump ON up.user_id = ump.user_id
WHERE up.user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
GROUP BY up.user_id, up.username, up.display_name, up.avatar_url, up.onboarding_completed;

-- Step 9: Check authentication context for profile queries
SELECT 'PROFILE_AUTH_CONTEXT' as test;
SELECT 
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID 
        THEN 'MATCHES_TARGET_USER' 
        ELSE 'DIFFERENT_USER' 
    END as auth_match_status;

SELECT 'PROFILE_DIAGNOSIS_COMPLETE!' as result; 