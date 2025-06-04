-- =======================================
-- POSTS & FEED DIAGNOSTIC SCRIPT  
-- Identify what's broken after schema migration
-- COMPLETELY DEFENSIVE (no assumptions about ANY columns)
-- =======================================

-- Show current time for reference
SELECT 'DIAGNOSTIC STARTING' as section, NOW() as timestamp;

-- ==========================================
-- SECTION 1: TABLE EXISTENCE CHECK
-- ==========================================
SELECT '=== TABLE EXISTENCE CHECK ===' as section;

-- Check which core tables exist
SELECT 
    'TABLE_EXISTENCE' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES 
    ('posts'),
    ('user_profiles'),
    ('comments'),
    ('post_likes'),
    ('comment_likes'),
    ('hidden_posts')
) AS t(table_name);

-- ==========================================
-- SECTION 2: POSTS TABLE DISCOVERY
-- ==========================================
SELECT '=== POSTS TABLE DISCOVERY ===' as section;

-- Only proceed if posts table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
        RAISE NOTICE 'Posts table found, proceeding with analysis';
    ELSE
        RAISE NOTICE 'Posts table missing - this is a critical issue';
    END IF;
END $$;

-- Discover posts table structure (only if table exists)
SELECT 
    'POSTS_TABLE_STRUCTURE' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('like_count', 'comment_count') THEN '🎯 COUNT FIELD'
        WHEN column_name IN ('media_item_id', 'media_id') THEN '📱 MEDIA REFERENCE'  
        WHEN column_name = 'user_id' THEN '👤 USER REFERENCE'
        WHEN column_name = 'content' THEN '📝 CONTENT'
        WHEN column_name = 'created_at' THEN '⏰ TIMESTAMP'
        ELSE ''
    END as field_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts')
ORDER BY ordinal_position;

-- Check posts data (only if table exists)
SELECT 
    'POSTS_COUNT_ANALYSIS' as check_type,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as posts_last_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as posts_last_hour,
    MAX(created_at) as most_recent_post
FROM posts
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts');

-- Sample recent posts (using only guaranteed basic columns)
SELECT 
    'RECENT_POSTS_SAMPLE' as check_type,
    id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'user_id')
        THEN 'user_id column exists'
        ELSE 'user_id column missing'
    END as user_id_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'content')
        THEN LEFT(content, 50) || '...'
        ELSE 'content column missing'
    END as content_preview,
    created_at
FROM posts 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts')
ORDER BY created_at DESC 
LIMIT 3;

-- ==========================================
-- SECTION 3: USER_PROFILES TABLE DISCOVERY
-- ==========================================
SELECT '=== USER_PROFILES TABLE DISCOVERY ===' as section;

-- Discover user_profiles table structure (only if table exists)
SELECT 
    'USER_PROFILES_STRUCTURE' as check_type,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'user_id' THEN '👤 USER ID'
        WHEN column_name = 'username' THEN '📝 USERNAME'
        WHEN column_name = 'display_name' THEN '👤 DISPLAY NAME'
        WHEN column_name = 'onboarding_completed' THEN '✅ ONBOARDING'
        ELSE ''
    END as field_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
ORDER BY ordinal_position;

-- Check user_profiles data (only if table exists and has expected columns)
SELECT 
    'USER_PROFILES_COUNT' as check_type,
    COUNT(*) as total_profiles,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'onboarding_completed')
        THEN COUNT(CASE WHEN onboarding_completed = true THEN 1 END)
        ELSE -1
    END as completed_profiles
FROM user_profiles
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles');

-- ==========================================
-- SECTION 4: MIGRATION COMPONENTS CHECK
-- ==========================================
SELECT '=== MIGRATION COMPONENTS CHECK ===' as section;

-- Check if like_count column was added to posts
SELECT 
    'LIKE_COUNT_STATUS' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'like_count'
        ) THEN '✅ like_count column exists'
        ELSE '❌ like_count column missing'
    END as like_count_exists;

-- Check if comment_count column exists in posts
SELECT 
    'COMMENT_COUNT_STATUS' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'comment_count'
        ) THEN '✅ comment_count column exists'
        ELSE '❌ comment_count column missing'
    END as comment_count_exists;

-- Check if like_count column was added to comments
SELECT 
    'COMMENTS_LIKE_COUNT_STATUS' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'like_count'
        ) THEN '✅ comments.like_count column exists'
        ELSE '❌ comments.like_count column missing'
    END as comments_like_count_exists;

-- ==========================================
-- SECTION 5: NEW TABLES STATUS
-- ==========================================
SELECT '=== NEW TABLES STATUS ===' as section;

-- Check our new tables
SELECT 
    'NEW_TABLES_STATUS' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES 
    ('comment_likes'),
    ('hidden_posts')
) AS t(table_name);

-- ==========================================
-- SECTION 6: TRIGGERS STATUS
-- ==========================================
SELECT '=== TRIGGERS STATUS ===' as section;

-- Check if our new triggers exist
SELECT 
    'TRIGGER_STATUS' as check_type,
    COUNT(*) as total_triggers,
    COUNT(CASE WHEN trigger_name IN ('comment_likes_count_trigger', 'post_likes_count_trigger', 'post_comments_count_trigger') THEN 1 END) as new_triggers
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- List all triggers
SELECT 
    'ALL_TRIGGERS' as check_type,
    trigger_name,
    event_object_table,
    CASE 
        WHEN trigger_name IN ('comment_likes_count_trigger', 'post_likes_count_trigger', 'post_comments_count_trigger')
        THEN '🎯 NEW TRIGGER'
        ELSE '📋 EXISTING TRIGGER'
    END as trigger_type
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ==========================================
-- SECTION 7: FUNCTIONS STATUS
-- ==========================================
SELECT '=== FUNCTIONS STATUS ===' as section;

-- Check if our new functions exist
SELECT 
    'NEW_FUNCTIONS_STATUS' as check_type,
    function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' AND routine_name = function_name
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES 
    ('get_post_comments'),
    ('toggle_post_like'),
    ('create_comment'),
    ('hide_post'),
    ('get_post_likes'),
    ('toggle_comment_like')
) AS f(function_name);

-- ==========================================
-- SECTION 8: RLS POLICIES STATUS
-- ==========================================
SELECT '=== RLS POLICIES STATUS ===' as section;

-- Check posts RLS policies
SELECT 
    'POSTS_RLS_POLICIES' as check_type,
    COUNT(*) as total_policies,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts';

-- ==========================================
-- SECTION 9: CRITICAL ISSUE DETECTION
-- ==========================================
SELECT '=== CRITICAL ISSUES ===' as section;

-- Comprehensive issue detection
SELECT 
    'ISSUE_SUMMARY' as check_type,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts')
        THEN '❌ CRITICAL: Posts table missing'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
        THEN '❌ CRITICAL: User_profiles table missing'
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'like_count'
        ) THEN '⚠️ MIGRATION INCOMPLETE: like_count column missing from posts'
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'comment_likes'
        ) THEN '⚠️ MIGRATION INCOMPLETE: comment_likes table missing'
        ELSE '✅ SCHEMA APPEARS INTACT'
    END as primary_issue,
    
    (SELECT COUNT(*) FROM posts WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts')) as total_posts_count,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM posts WHERE created_at >= NOW() - INTERVAL '1 hour' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts'))
        THEN '✅ Recent posts found'
        ELSE '⚠️ No recent posts'
    END as recent_posts_status;

-- ==========================================
-- SECTION 10: RECOMMENDATIONS
-- ==========================================
SELECT '=== RECOMMENDATIONS ===' as section;

SELECT 
    'NEXT_STEPS' as check_type,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'like_count'
        ) THEN 'RECOMMENDATION: Migration appears incomplete. Consider running rollback and re-applying clean migration.'
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'comment_likes'
        ) THEN 'RECOMMENDATION: New tables missing. Re-run migration or check for errors.'
        ELSE 'RECOMMENDATION: Schema looks complete. Issue may be in frontend code or data access patterns.'
    END as recommendation;

-- Final status
SELECT 'DIAGNOSTIC COMPLETED ✅' as final_status; 