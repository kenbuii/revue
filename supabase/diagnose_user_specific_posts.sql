-- =======================================
-- DIAGNOSE USER SPECIFIC POST ISSUES
-- Check why user d55d28c6-5d98-4533-a1a6-882b5aa1d049 posts aren't showing
-- =======================================

-- Test 1: Check user's posts and their properties
SELECT 'USER POSTS ANALYSIS:' as test;
SELECT 
    p.id,
    p.title,
    p.content,
    p.visibility,
    p.is_public,
    p.created_at,
    up.username,
    up.onboarding_completed,
    mi.title as media_title,
    -- Check each filter condition individually
    CASE WHEN p.visibility = 'public' THEN '✅' ELSE '❌' END as visibility_check,
    CASE WHEN p.is_public = true THEN '✅' ELSE '❌' END as is_public_check,
    CASE WHEN up.onboarding_completed = true THEN '✅' ELSE '❌' END as onboarding_check
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
ORDER BY p.created_at DESC;

-- Test 2: Check user profile status specifically
SELECT 'USER PROFILE STATUS:' as test;
SELECT 
    user_id,
    username,
    display_name,
    onboarding_completed,
    created_at
FROM user_profiles 
WHERE user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049';

-- Test 3: Test the exact WHERE clause from get_for_you_feed
SELECT 'FEED WHERE CLAUSE TEST:' as test;
SELECT 
    p.id,
    p.title,
    p.visibility,
    p.is_public,
    up.onboarding_completed,
    'Should show in feed?' as question,
    CASE 
        WHEN p.visibility = 'public' 
        AND p.is_public = true
        AND up.onboarding_completed = true
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END as feed_eligible
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
ORDER BY p.created_at DESC;

-- Test 4: Check if posts have proper media_items linkage
SELECT 'MEDIA LINKAGE CHECK:' as test;
SELECT 
    p.id,
    p.title,
    p.media_item_id,
    mi.id as media_exists,
    mi.title as media_title,
    CASE WHEN mi.id IS NOT NULL THEN '✅ Linked' ELSE '❌ Missing' END as media_status
FROM posts p
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
ORDER BY p.created_at DESC;

SELECT 'DIAGNOSIS COMPLETE - Check each section above!' as result; 