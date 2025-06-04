-- SCHEMA DIAGNOSIS SCRIPT
-- Check what tables exist vs what your functions expect

-- Check which tables exist
SELECT 
    '📋 EXISTING TABLES' as section,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check what your functions expect vs what exists
SELECT '
🎯 YOUR FUNCTIONS EXPECT THESE TABLES:
   ✅ user_profiles (for save_user_onboarding_data)
   ❓ bookmarks (for get_user_bookmarks, add_bookmark)  
   ❓ posts (for get_user_bookmarks JOIN)
   ❓ user_media_preferences (for save_user_onboarding_data)

📋 COMPARISON WITH EXISTING TABLES ABOVE
' as analysis;

-- Test each expected table
SELECT 
    'user_profiles' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status

UNION ALL

SELECT 
    'bookmarks' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookmarks')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING - This is causing your 404 errors!'
    END as status

UNION ALL

SELECT 
    'posts' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING - Needed for bookmarks JOIN'
    END as status

UNION ALL

SELECT 
    'user_media_preferences' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_media_preferences')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING - Needed for onboarding'
    END as status;

-- Show structure of existing tables
SELECT 
    '📊 TABLE STRUCTURES' as info,
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_type = 'BASE TABLE'
AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position; 