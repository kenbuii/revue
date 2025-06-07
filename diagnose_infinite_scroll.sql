-- =======================================
-- DIAGNOSE INFINITE SCROLL
-- Check how many posts should be available
-- =======================================

-- Check total posts available for feeds
SELECT 'TOTAL_POSTS_ANALYSIS' as section;
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN visibility = 'public' AND is_public = true THEN 1 END) as public_posts,
    COUNT(CASE WHEN up.onboarding_completed = true THEN 1 END) as posts_from_completed_users
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id;

-- Test pagination manually
SELECT 'PAGINATION_TEST' as section;
SELECT 
    'Page 1 (0-19)' as page,
    COUNT(*) as post_count
FROM get_for_you_feed(NULL, 20, 0)
UNION ALL
SELECT 
    'Page 2 (20-39)' as page,
    COUNT(*) as post_count
FROM get_for_you_feed(NULL, 20, 20)
UNION ALL
SELECT 
    'Page 3 (40-59)' as page,
    COUNT(*) as post_count
FROM get_for_you_feed(NULL, 20, 40)
UNION ALL
SELECT 
    'Page 4 (60-79)' as page,
    COUNT(*) as post_count
FROM get_for_you_feed(NULL, 20, 60);

-- Sample post dates to see distribution
SELECT 'POST_DISTRIBUTION' as section;
SELECT 
    DATE(created_at) as post_date,
    COUNT(*) as posts_on_date
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
WHERE p.visibility = 'public' 
  AND p.is_public = true
  AND up.onboarding_completed = true
GROUP BY DATE(created_at)
ORDER BY post_date DESC
LIMIT 10;

SELECT 'INFINITE_SCROLL_DIAGNOSIS_COMPLETE' as result; 