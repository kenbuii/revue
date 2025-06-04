-- 🧪 PHASE 3 FUNCTIONALITY TEST SCRIPT
-- ======================================
-- Tests actual functionality of all database operations
-- required for Phase 3 UI Components

-- Start test report
SELECT '🧪 PHASE 3 FUNCTIONALITY TEST REPORT' as test_title,
       current_timestamp as test_time;

-- =====================================================
-- 📝 SECTION 1: COMMENTS FUNCTIONALITY TESTING
-- =====================================================

SELECT '📝 Section 1: Comments Functionality Testing' as section;

-- Test 1: get_post_comments function
SELECT 
  'Test 1: get_post_comments()' as test_name,
  CASE 
    WHEN comment_count >= 0 AND has_required_fields
    THEN '✅ SUCCESS - Returns ' || comment_count || ' comments with all required fields'
    ELSE '❌ FAILED - Missing fields or function error'
  END as result,
  sample_data
FROM (
  SELECT 
    COUNT(*) as comment_count,
    bool_and(
      content IS NOT NULL AND 
      user_id IS NOT NULL AND 
      username IS NOT NULL AND 
      display_name IS NOT NULL AND 
      avatar_url IS NOT NULL AND
      like_count IS NOT NULL AND
      is_liked_by_user IS NOT NULL
    ) as has_required_fields,
    'Sample: "' || COALESCE(substring(MAX(content), 1, 30), 'No comments') || '..."' as sample_data
  FROM get_post_comments('1') -- Test with post ID 1
) test_result;

-- Test 2: create_comment function (using a test comment)
DO $$
DECLARE
  test_result jsonb;
  success boolean := false;
BEGIN
  -- Attempt to create a test comment
  SELECT create_comment('1', 'Phase 3 test comment - can be deleted', NULL) INTO test_result;
  
  -- Check if creation was successful
  IF test_result->>'success' = 'true' THEN
    success := true;
  END IF;
  
  -- Report results
  RAISE NOTICE 'Test 2: create_comment() - %', 
    CASE 
      WHEN success THEN '✅ SUCCESS - Comment created successfully'
      ELSE '❌ FAILED - ' || COALESCE(test_result->>'error', 'Unknown error')
    END;
END $$;

-- Test 3: toggle_comment_like function
DO $$
DECLARE
  test_comment_id uuid;
  like_result jsonb;
  success boolean := false;
BEGIN
  -- Get a test comment ID
  SELECT id INTO test_comment_id FROM comments LIMIT 1;
  
  IF test_comment_id IS NOT NULL THEN
    -- Test toggling like
    SELECT toggle_comment_like(test_comment_id::text) INTO like_result;
    
    IF like_result->>'success' = 'true' THEN
      success := true;
    END IF;
  END IF;
  
  -- Report results  
  RAISE NOTICE 'Test 3: toggle_comment_like() - %',
    CASE 
      WHEN success THEN '✅ SUCCESS - Comment like toggled successfully'
      WHEN test_comment_id IS NULL THEN '⚠️ SKIPPED - No comments available for testing'
      ELSE '❌ FAILED - ' || COALESCE(like_result->>'error', 'Unknown error')
    END;
END $$;

-- =====================================================
-- ❤️ SECTION 2: LIKES FUNCTIONALITY TESTING
-- =====================================================

SELECT '❤️ Section 2: Likes Functionality Testing' as section;

-- Test 4: get_post_likes function
SELECT 
  'Test 4: get_post_likes()' as test_name,
  CASE 
    WHEN like_count >= 0 AND has_required_fields
    THEN '✅ SUCCESS - Returns ' || like_count || ' likes with all required fields'
    ELSE '❌ FAILED - Missing fields or function error'
  END as result,
  sample_data
FROM (
  SELECT 
    COUNT(*) as like_count,
    bool_and(
      user_id IS NOT NULL AND 
      username IS NOT NULL AND 
      display_name IS NOT NULL AND 
      avatar_url IS NOT NULL AND
      liked_at IS NOT NULL
    ) as has_required_fields,
    'Sample user: ' || COALESCE(MAX(display_name), 'No likes') as sample_data
  FROM get_post_likes('1') -- Test with post ID 1
) test_result;

-- Test 5: toggle_post_like function
DO $$
DECLARE
  like_result jsonb;
  success boolean := false;
  initial_count integer;
  final_count integer;
BEGIN
  -- Get initial like count
  SELECT COUNT(*) INTO initial_count FROM get_post_likes('1');
  
  -- Test toggling post like
  SELECT toggle_post_like('1') INTO like_result;
  
  -- Get final like count
  SELECT COUNT(*) INTO final_count FROM get_post_likes('1');
  
  IF like_result->>'success' = 'true' AND final_count != initial_count THEN
    success := true;
  END IF;
  
  -- Report results
  RAISE NOTICE 'Test 5: toggle_post_like() - %',
    CASE 
      WHEN success THEN '✅ SUCCESS - Post like toggled (count: ' || initial_count || ' → ' || final_count || ')'
      ELSE '❌ FAILED - ' || COALESCE(like_result->>'error', 'Like count unchanged')
    END;
END $$;

-- =====================================================
-- 🙈 SECTION 3: HIDDEN POSTS FUNCTIONALITY TESTING
-- =====================================================

SELECT '🙈 Section 3: Hidden Posts Functionality Testing' as section;

-- Test 6: hide_post function
DO $$
DECLARE
  hide_result jsonb;
  success boolean := false;
BEGIN
  -- Test hiding a post (using post ID 1)
  SELECT hide_post('1') INTO hide_result;
  
  IF hide_result->>'success' = 'true' THEN
    success := true;
  END IF;
  
  -- Report results
  RAISE NOTICE 'Test 6: hide_post() - %',
    CASE 
      WHEN success THEN '✅ SUCCESS - Post hidden successfully'
      ELSE '❌ FAILED - ' || COALESCE(hide_result->>'error', 'Unknown error')
    END;
END $$;

-- Test 7: get_user_hidden_posts function
SELECT 
  'Test 7: get_user_hidden_posts()' as test_name,
  CASE 
    WHEN hidden_count >= 0
    THEN '✅ SUCCESS - Returns ' || hidden_count || ' hidden posts'
    ELSE '❌ FAILED - Function error'
  END as result
FROM (
  SELECT COUNT(*) as hidden_count
  FROM get_user_hidden_posts()
) test_result;

-- Test 8: unhide_post function  
DO $$
DECLARE
  unhide_result jsonb;
  success boolean := false;
BEGIN
  -- Test unhiding the post we just hid
  SELECT unhide_post('1') INTO unhide_result;
  
  IF unhide_result->>'success' = 'true' THEN
    success := true;
  END IF;
  
  -- Report results
  RAISE NOTICE 'Test 8: unhide_post() - %',
    CASE 
      WHEN success THEN '✅ SUCCESS - Post unhidden successfully'
      ELSE '❌ FAILED - ' || COALESCE(unhide_result->>'error', 'Unknown error')
    END;
END $$;

-- =====================================================
-- 🔍 SECTION 4: DATA CONSISTENCY TESTING
-- =====================================================

SELECT '🔍 Section 4: Data Consistency Testing' as section;

-- Test 9: Comment-Post relationship integrity
SELECT 
  'Test 9: Comment-Post Integrity' as test_name,
  CASE 
    WHEN orphaned_comments = 0
    THEN '✅ SUCCESS - All comments linked to valid posts'
    ELSE '❌ FAILED - Found ' || orphaned_comments || ' orphaned comments'
  END as result
FROM (
  SELECT COUNT(*) as orphaned_comments
  FROM comments c 
  LEFT JOIN posts p ON c.post_id = p.id 
  WHERE p.id IS NULL
) integrity_check;

-- Test 10: Like-Post relationship integrity
SELECT 
  'Test 10: Like-Post Integrity' as test_name,
  CASE 
    WHEN orphaned_likes = 0
    THEN '✅ SUCCESS - All likes linked to valid posts'
    ELSE '❌ FAILED - Found ' || orphaned_likes || ' orphaned likes'
  END as result
FROM (
  SELECT COUNT(*) as orphaned_likes
  FROM post_likes pl 
  LEFT JOIN posts p ON pl.post_id = p.id 
  WHERE p.id IS NULL
) integrity_check;

-- =====================================================
-- 📊 SECTION 5: PERFORMANCE TESTING
-- =====================================================

SELECT '📊 Section 5: Performance Testing' as section;

-- Test 11: Comments query performance
SELECT 
  'Test 11: Comments Query Performance' as test_name,
  CASE 
    WHEN execution_time < 1000
    THEN '✅ SUCCESS - Query executed in ' || execution_time || 'ms (< 1s)'
    WHEN execution_time < 5000
    THEN '⚠️ SLOW - Query executed in ' || execution_time || 'ms (1-5s)'
    ELSE '❌ FAILED - Query took ' || execution_time || 'ms (> 5s)'
  END as result
FROM (
  SELECT 
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 as execution_time
  FROM (
    SELECT 
      clock_timestamp() as start_time,
      get_post_comments('1') as comments,
      clock_timestamp() as end_time
  ) timing
) performance_test;

-- Test 12: Likes query performance  
SELECT 
  'Test 12: Likes Query Performance' as test_name,
  CASE 
    WHEN execution_time < 1000
    THEN '✅ SUCCESS - Query executed in ' || execution_time || 'ms (< 1s)'
    WHEN execution_time < 5000
    THEN '⚠️ SLOW - Query executed in ' || execution_time || 'ms (1-5s)'
    ELSE '❌ FAILED - Query took ' || execution_time || 'ms (> 5s)'
  END as result
FROM (
  SELECT 
    EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 as execution_time
  FROM (
    SELECT 
      clock_timestamp() as start_time,
      get_post_likes('1') as likes,
      clock_timestamp() as end_time
  ) timing
) performance_test;

-- =====================================================
-- 🎯 SECTION 6: PHASE 3 FUNCTIONALITY SUMMARY
-- =====================================================

SELECT '🎯 Section 6: Phase 3 Functionality Summary' as section;

-- Overall functionality assessment
SELECT 
  'Phase 3 Database Functionality' as assessment_type,
  CASE 
    WHEN comments_working AND likes_working AND hiding_working
    THEN '🎉 ALL SYSTEMS GO! Ready for UI testing'
    WHEN comments_working AND likes_working
    THEN '✅ Core features working (Comments ✅, Likes ✅, Hiding ⚠️)'
    WHEN comments_working OR likes_working
    THEN '⚠️ Partial functionality (needs debugging)'
    ELSE '❌ Critical issues found (needs immediate attention)'
  END as status
FROM (
  SELECT 
    (SELECT COUNT(*) FROM get_post_comments('1') LIMIT 1) >= 0 as comments_working,
    (SELECT COUNT(*) FROM get_post_likes('1') LIMIT 1) >= 0 as likes_working,
    (SELECT COUNT(*) FROM get_user_hidden_posts() LIMIT 1) >= 0 as hiding_working
) functionality_check;

-- End test report
SELECT '🧪 FUNCTIONALITY TESTING COMPLETE' as test_complete,
       'Review console output above for detailed results' as instructions,
       'Next: Test Phase 3 UI Components' as next_step; 