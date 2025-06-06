-- =======================================
-- TEST: Own Posts Exclusion Theory
-- Test if RPC functions exclude user's own posts
-- =======================================

-- Test 1: Check if user has recent posts
SELECT 'USER RECENT POSTS:' as test;
SELECT 
    user_id,
    title,
    content,
    created_at
FROM posts 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- Test 2: Test get_for_you_feed with the user's ID (should exclude their posts)
SELECT 'FOR_YOU_FEED (with user_id - should exclude own posts):' as test;
SELECT * FROM get_for_you_feed(
    (SELECT user_id FROM posts WHERE created_at > NOW() - INTERVAL '2 hours' LIMIT 1),
    5,
    0
);

-- Test 3: Test get_for_you_feed with NULL user_id (should include all posts)
SELECT 'FOR_YOU_FEED (with NULL user_id - should include all posts):' as test;
SELECT * FROM get_for_you_feed(NULL, 5, 0);

-- Test 4: Modified query to INCLUDE own posts for comparison
SELECT 'MODIFIED FEED (including own posts):' as test;
SELECT 
    p.id,
    p.title,
    p.content,
    p.created_at,
    up.username
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE 
    p.visibility = 'public' 
    AND p.is_public = true
    AND up.onboarding_completed = true
    -- NO exclusion of own posts
ORDER BY p.created_at DESC
LIMIT 5;

SELECT 'DIAGNOSIS: If FOR_YOU_FEED with NULL shows posts but with user_id shows none, then own-post exclusion is the issue!' as conclusion; 