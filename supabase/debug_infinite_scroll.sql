-- =======================================
-- DEBUG INFINITE SCROLL ISSUES
-- Check total posts and pagination
-- =======================================

-- Step 1: Check total posts count
SELECT 'TOTAL_POSTS_COUNT' as test;
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN visibility = 'public' AND is_public = true THEN 1 END) as public_posts,
    MIN(created_at) as oldest_post,
    MAX(created_at) as newest_post
FROM posts;

-- Step 2: Check posts by user to see distribution
SELECT 'POSTS_BY_USER' as test;
SELECT 
    up.username,
    up.onboarding_completed,
    COUNT(p.id) as post_count
FROM user_profiles up
LEFT JOIN posts p ON up.user_id = p.user_id AND p.visibility = 'public' AND p.is_public = true
GROUP BY up.user_id, up.username, up.onboarding_completed
ORDER BY post_count DESC;

-- Step 3: Test pagination with get_for_you_feed
SELECT 'PAGINATION_TEST_PAGE_1' as test;
SELECT COUNT(*) as posts_returned_page_1
FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 10, 0);

SELECT 'PAGINATION_TEST_PAGE_2' as test;
SELECT COUNT(*) as posts_returned_page_2
FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 10, 10);

SELECT 'PAGINATION_TEST_PAGE_3' as test;
SELECT COUNT(*) as posts_returned_page_3
FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 10, 20);

-- Step 4: Test with larger limits
SELECT 'LARGE_LIMIT_TEST' as test;
SELECT COUNT(*) as posts_with_limit_50
FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 50, 0);

-- Step 5: Check if there are posts beyond the first 20
SELECT 'POSTS_SAMPLE_PAGINATION' as test;
SELECT 
    'Page 1 (0-9)' as page,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM (
    SELECT created_at 
    FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 10, 0)
) page1

UNION ALL

SELECT 
    'Page 2 (10-19)' as page,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM (
    SELECT created_at 
    FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 10, 10)
) page2

UNION ALL

SELECT 
    'Page 3 (20-29)' as page,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM (
    SELECT created_at 
    FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 10, 20)
) page3;

SELECT 'INFINITE_SCROLL_DIAGNOSIS_COMPLETE!' as result; 