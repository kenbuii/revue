-- 🔍 PHASE 3 DATABASE AUDIT SCRIPT
-- =====================================
-- Verifies all required tables, functions, and policies exist
-- for Phase 3 UI Component functionality

-- Start audit report
SELECT '🧪 PHASE 3 DATABASE AUDIT REPORT' as audit_title,
       current_timestamp as audit_time;

-- =====================================================
-- 📋 SECTION 1: CORE TABLES VERIFICATION
-- =====================================================

SELECT '📋 Section 1: Core Tables Verification' as section;

-- Check essential tables exist
SELECT 
  'Core Tables Check' as check_type,
  string_agg(
    CASE 
      WHEN table_name IN ('posts', 'user_profiles', 'media_items', 'comments', 'post_likes', 'comment_likes', 'hidden_posts') 
      THEN '✅ ' || table_name 
      ELSE '❌ Missing: ' || table_name 
    END, 
    chr(10)
  ) as status
FROM (
  SELECT unnest(ARRAY['posts', 'user_profiles', 'media_items', 'comments', 'post_likes', 'comment_likes', 'hidden_posts']) as expected_table
) expected
LEFT JOIN information_schema.tables t 
  ON t.table_name = expected.expected_table 
  AND t.table_schema = 'public';

-- Check table row counts (should have test data)
SELECT 
  'Table Data Check' as check_type,
  string_agg(
    table_name || ': ' || 
    CASE 
      WHEN row_count > 0 THEN '✅ ' || row_count || ' rows'
      ELSE '⚠️ Empty (' || row_count || ' rows)'
    END,
    chr(10)
  ) as status
FROM (
  SELECT 'posts' as table_name, COUNT(*) as row_count FROM posts
  UNION ALL
  SELECT 'user_profiles', COUNT(*) FROM user_profiles  
  UNION ALL
  SELECT 'media_items', COUNT(*) FROM media_items
  UNION ALL
  SELECT 'comments', COUNT(*) FROM comments
  UNION ALL
  SELECT 'post_likes', COUNT(*) FROM post_likes
  UNION ALL
  SELECT 'comment_likes', COUNT(*) FROM comment_likes
  UNION ALL
  SELECT 'hidden_posts', COUNT(*) FROM hidden_posts
) counts;

-- =====================================================
-- 🔧 SECTION 2: FUNCTIONS VERIFICATION
-- =====================================================

SELECT '🔧 Section 2: Database Functions Verification' as section;

-- Check all required functions exist
SELECT 
  'Required Functions Check' as check_type,
  string_agg(
    CASE 
      WHEN function_name IS NOT NULL 
      THEN '✅ ' || expected_function
      ELSE '❌ Missing: ' || expected_function
    END,
    chr(10)
  ) as status
FROM (
  SELECT unnest(ARRAY[
    'get_post_comments',
    'create_comment', 
    'toggle_comment_like',
    'get_post_likes',
    'toggle_post_like',
    'hide_post',
    'get_user_hidden_posts',
    'unhide_post'
  ]) as expected_function
) expected
LEFT JOIN (
  SELECT routine_name as function_name 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
) funcs ON funcs.function_name = expected.expected_function;

-- =====================================================
-- 🔐 SECTION 3: SECURITY POLICIES VERIFICATION  
-- =====================================================

SELECT '🔐 Section 3: Row Level Security Verification' as section;

-- Check RLS is enabled on critical tables
SELECT 
  'RLS Enabled Check' as check_type,
  string_agg(
    tablename || ': ' ||
    CASE 
      WHEN rowsecurity THEN '✅ Enabled'
      ELSE '⚠️ Disabled'
    END,
    chr(10)
  ) as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('posts', 'comments', 'post_likes', 'comment_likes', 'hidden_posts')
ORDER BY tablename;

-- =====================================================
-- 📊 SECTION 4: DATA INTEGRITY VERIFICATION
-- =====================================================

SELECT '📊 Section 4: Data Integrity Verification' as section;

-- Check foreign key relationships
SELECT 
  'Foreign Key Integrity' as check_type,
  CASE 
    WHEN orphaned_comments = 0 AND orphaned_likes = 0 AND orphaned_comment_likes = 0 AND orphaned_hidden = 0
    THEN '✅ All foreign keys valid'
    ELSE '⚠️ Found orphaned records: Comments(' || orphaned_comments || ') PostLikes(' || orphaned_likes || ') CommentLikes(' || orphaned_comment_likes || ') Hidden(' || orphaned_hidden || ')'
  END as status
FROM (
  SELECT 
    (SELECT COUNT(*) FROM comments c LEFT JOIN posts p ON c.post_id = p.id WHERE p.id IS NULL) as orphaned_comments,
    (SELECT COUNT(*) FROM post_likes pl LEFT JOIN posts p ON pl.post_id = p.id WHERE p.id IS NULL) as orphaned_likes,
    (SELECT COUNT(*) FROM comment_likes cl LEFT JOIN comments c ON cl.comment_id = c.id WHERE c.id IS NULL) as orphaned_comment_likes,
    (SELECT COUNT(*) FROM hidden_posts hp LEFT JOIN posts p ON hp.post_id = p.id WHERE p.id IS NULL) as orphaned_hidden
) integrity;

-- =====================================================
-- 🎯 SECTION 5: PHASE 3 READINESS SUMMARY
-- =====================================================

SELECT '🎯 Section 5: Phase 3 Readiness Summary' as section;

-- Overall readiness assessment
SELECT 
  'Phase 3 Readiness' as assessment_type,
  CASE 
    WHEN table_count >= 7 AND function_count >= 8 AND has_test_data
    THEN '🎉 READY FOR PHASE 3 TESTING!'
    WHEN table_count >= 7 AND function_count >= 8 
    THEN '⚠️ Tables & functions ready, but need test data'
    WHEN table_count >= 7
    THEN '⚠️ Tables ready, but missing functions'
    ELSE '❌ Missing critical tables'
  END as status,
  'Tables: ' || table_count || '/7, Functions: ' || function_count || '/8, Data: ' || 
  CASE WHEN has_test_data THEN 'Yes' ELSE 'No' END as details
FROM (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' 
     AND table_name IN ('posts', 'user_profiles', 'media_items', 'comments', 'post_likes', 'comment_likes', 'hidden_posts')) as table_count,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' 
     AND routine_name IN ('get_post_comments', 'create_comment', 'toggle_comment_like', 'get_post_likes', 'toggle_post_like', 'hide_post', 'get_user_hidden_posts', 'unhide_post')) as function_count,
    (SELECT COUNT(*) > 0 FROM posts) as has_test_data
) counts;

-- End audit report
SELECT '📋 AUDIT COMPLETE - Review results above' as audit_complete,
       'Next: Run test_phase3_functionality.sql' as next_step; 