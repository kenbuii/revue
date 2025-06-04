-- FUNCTION DIAGNOSIS SCRIPT
-- Run this in your Supabase SQL Editor to see what functions currently exist

-- Check all functions that contain the names we're looking for
SELECT 
    'EXISTING FUNCTIONS' as section,
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as parameters,
    pg_catalog.pg_get_function_result(p.oid) as return_type,
    p.oid::regprocedure as full_signature
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND (
    p.proname LIKE '%save_user_onboarding_data%' OR
    p.proname LIKE '%get_user_bookmarks%' OR
    p.proname LIKE '%add_bookmark%' OR
    p.proname = 'save_user_onboarding_data' OR
    p.proname = 'get_user_bookmarks' OR
    p.proname = 'add_bookmark'
)
ORDER BY p.proname;

-- Check what your app expects vs what exists
SELECT '
🎯 YOUR APP EXPECTS:
   save_user_onboarding_data(target_user_id UUID, ...)
   get_user_bookmarks(target_user_id UUID)
   add_bookmark(target_user_id UUID, post_id UUID)

📋 COMPARISON RESULTS ABOVE SHOW WHAT ACTUALLY EXISTS
' as analysis;

-- Test if the specific functions your app calls exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' 
            AND p.proname = 'save_user_onboarding_data'
            AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
        ) THEN '✅ save_user_onboarding_data with target_user_id EXISTS'
        ELSE '❌ save_user_onboarding_data with target_user_id MISSING'
    END as save_function_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' 
            AND p.proname = 'get_user_bookmarks'
            AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
        ) THEN '✅ get_user_bookmarks with target_user_id EXISTS'
        ELSE '❌ get_user_bookmarks with target_user_id MISSING'
    END as get_bookmarks_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' 
            AND p.proname = 'add_bookmark'
            AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
        ) THEN '✅ add_bookmark with target_user_id EXISTS'
        ELSE '❌ add_bookmark with target_user_id MISSING'
    END as add_bookmark_status;

-- Check if user exists in your tables
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3') 
        THEN '✅ Test user EXISTS in user_profiles'
        ELSE '❌ Test user MISSING from user_profiles'
    END as user_profile_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3') 
        THEN '✅ Test user EXISTS in auth.users'
        ELSE '❌ Test user MISSING from auth.users'
    END as auth_user_status; 