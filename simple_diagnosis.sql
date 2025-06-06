-- SIMPLE DIAGNOSIS - Check current database state
-- Run each section separately if needed

-- 1. What tables exist?
SELECT 'TABLES:' as section, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. user_profiles columns
SELECT 'USER_PROFILES:' as section, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 3. user_media_preferences columns
SELECT 'USER_MEDIA_PREFERENCES:' as section, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences' 
ORDER BY ordinal_position;

-- 4. user_bookmarks columns
SELECT 'USER_BOOKMARKS:' as section, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bookmarks' 
ORDER BY ordinal_position;

-- 5. posts columns (if exists)
SELECT 'POSTS:' as section, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
ORDER BY ordinal_position;

-- 6. media_items columns (if exists)
SELECT 'MEDIA_ITEMS:' as section, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'media_items' 
ORDER BY ordinal_position;

-- 7. Functions with bookmark or onboarding in name
SELECT 'FUNCTIONS:' as section, routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND (routine_name LIKE '%bookmark%' OR routine_name LIKE '%onboarding%');

-- 8. Function signatures for key functions
SELECT 
    'FUNCTION_ARGS:' as section,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_user_bookmarks', 'add_bookmark', 'remove_bookmark', 'save_user_onboarding_data'); 