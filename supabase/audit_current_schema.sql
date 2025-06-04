-- =======================================
-- COMPREHENSIVE CURRENT STATE AUDIT
-- Understanding what exists before making changes
-- =======================================

-- Show current user and database info
SELECT 'DATABASE AUDIT STARTING' as section, NOW() as timestamp, current_database() as database_name;

-- ==========================================
-- SECTION 1: EXISTING FUNCTIONS AUDIT
-- ==========================================
SELECT '=== EXISTING FUNCTIONS ===' as section;

-- Check ALL functions in public schema first
SELECT 
    'ALL_FUNCTIONS' as audit_type,
    routine_name,
    routine_type,
    data_type,
    CASE 
        WHEN routine_name IN ('get_post_comments', 'toggle_comment_like', 'toggle_post_like', 'create_comment', 'hide_post', 'unhide_post', 'get_user_hidden_posts', 'get_post_likes') 
        THEN '⚠️ WILL CONFLICT'
        ELSE '✅ OK'
    END as conflict_status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Check specifically for our target functions
SELECT 
    'TARGET_FUNCTIONS' as audit_type,
    function_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' AND routine_name = function_name
        ) THEN '❌ EXISTS (will be dropped)'
        ELSE '✅ DOES NOT EXIST (safe to create)'
    END as status
FROM (VALUES 
    ('get_post_comments'),
    ('toggle_comment_like'), 
    ('toggle_post_like'),
    ('create_comment'),
    ('hide_post'),
    ('unhide_post'),
    ('get_user_hidden_posts'),
    ('get_post_likes')
) AS target_functions(function_name);

-- ==========================================
-- SECTION 2: EXISTING TABLES AUDIT  
-- ==========================================
SELECT '=== EXISTING TABLES ===' as section;

-- Check if our target tables exist
SELECT 
    'TABLE_EXISTENCE' as audit_type,
    target_table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = target_table_name
        ) THEN '✅ EXISTS'
        ELSE '⚠️ DOES NOT EXIST (will be created)'
    END as status
FROM (VALUES 
    ('comments'),
    ('posts'), 
    ('comment_likes'),
    ('hidden_posts'),
    ('post_likes'),
    ('user_profiles')
) AS target_tables(target_table_name);

-- Show detailed column info for existing tables
SELECT 
    'TABLE_COLUMNS' as audit_type,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN table_name = 'comments' AND column_name = 'like_count' THEN '🎯 TARGET COLUMN'
        ELSE ''
    END as notes
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('comments', 'posts', 'comment_likes', 'hidden_posts', 'post_likes', 'user_profiles')
ORDER BY table_name, ordinal_position;

-- ==========================================
-- SECTION 3: EXISTING TRIGGERS AUDIT
-- ==========================================
SELECT '=== EXISTING TRIGGERS ===' as section;

-- Check for existing triggers
SELECT 
    'TRIGGERS' as audit_type,
    trigger_name,
    event_manipulation,
    event_object_table,
    CASE 
        WHEN trigger_name IN ('comment_likes_count_trigger', 'post_likes_count_trigger', 'post_comments_count_trigger')
        THEN '⚠️ WILL BE DROPPED'
        ELSE '✅ UNRELATED'
    END as conflict_status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Show if no triggers exist
SELECT 
    'TRIGGER_CHECK' as audit_type,
    'No triggers found in public schema' as message
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public'
);

-- ==========================================
-- SECTION 4: EXISTING INDEXES AUDIT
-- ==========================================
SELECT '=== EXISTING INDEXES ===' as section;

-- Check existing indexes
SELECT 
    'INDEXES' as audit_type,
    indexname,
    tablename,
    CASE 
        WHEN indexname LIKE 'idx_comment_likes%' OR indexname LIKE 'idx_hidden_posts%' 
        THEN '🎯 TARGET INDEX'
        ELSE '✅ EXISTING'
    END as notes
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('comments', 'posts', 'comment_likes', 'hidden_posts', 'post_likes')
ORDER BY tablename, indexname;

-- ==========================================
-- SECTION 5: RLS POLICIES AUDIT
-- ==========================================
SELECT '=== RLS POLICIES ===' as section;

-- Check existing RLS policies
SELECT 
    'RLS_POLICIES' as audit_type,
    tablename,
    policyname,
    cmd as policy_type,
    CASE 
        WHEN policyname IN ('Users can view comment likes', 'Users can manage own comment likes', 'Users can view own hidden posts', 'Users can manage own hidden posts')
        THEN '⚠️ WILL BE DROPPED'
        ELSE '✅ UNRELATED'
    END as conflict_status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Show if no policies exist
SELECT 
    'RLS_CHECK' as audit_type,
    'No RLS policies found in public schema' as message
WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
);

-- ==========================================
-- SECTION 6: CRITICAL COLUMNS CHECK
-- ==========================================
SELECT '=== CRITICAL COLUMNS CHECK ===' as section;

-- Check if comments.like_count exists
SELECT 
    'LIKE_COUNT_COLUMN' as audit_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'comments' 
            AND column_name = 'like_count'
        ) THEN '✅ comments.like_count EXISTS'
        ELSE '⚠️ comments.like_count MISSING (will be added)'
    END as status;

-- Check posts table critical columns
SELECT 
    'POST_COLUMNS' as audit_type,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('like_count', 'comment_count') THEN '🎯 CRITICAL'
        ELSE '✅ STANDARD'
    END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'posts'
AND column_name IN ('id', 'user_id', 'like_count', 'comment_count', 'created_at')
ORDER BY column_name;

-- ==========================================
-- SECTION 7: SUMMARY
-- ==========================================
SELECT '=== MIGRATION READINESS SUMMARY ===' as section;

SELECT 
    'READINESS_CHECK' as audit_type,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('get_post_comments', 'toggle_comment_like', 'toggle_post_like', 'create_comment', 'hide_post', 'unhide_post', 'get_user_hidden_posts', 'get_post_likes')
        ) > 0 THEN 'CONFLICTS DETECTED - Clean migration will drop and recreate functions'
        ELSE 'NO CONFLICTS - Migration should run smoothly'
    END as migration_status,
    (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('comment_likes', 'hidden_posts')
    ) as new_tables_exist,
    (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'like_count'
    ) as like_count_column_exists;

-- Final success message
SELECT 'AUDIT COMPLETED SUCCESSFULLY ✅' as final_status, 
       'Review all sections above before running migration' as next_steps; 