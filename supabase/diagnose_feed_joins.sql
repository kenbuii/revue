-- =======================================
-- COMPREHENSIVE FEED DIAGNOSTIC
-- All checks in one query using UNION ALL
-- =======================================

-- Check 1: media_items table exists
SELECT 
    1 as sort_order,
    'media_items_table' as check_type,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_items')
    THEN 'EXISTS' ELSE 'MISSING' END as result,
    '' as detail

UNION ALL

-- Check 2: posts visibility breakdown
SELECT 
    2 as sort_order,
    'posts_visibility' as check_type,
    CASE WHEN is_public THEN 'PUBLIC' ELSE 'PRIVATE' END as result,
    CAST(COUNT(*) as TEXT) as detail
FROM posts 
GROUP BY is_public

UNION ALL

-- Check 3: user onboarding status breakdown  
SELECT 
    3 as sort_order,
    'user_onboarding' as check_type,
    CASE 
        WHEN onboarding_completed IS NULL THEN 'NULL'
        WHEN onboarding_completed THEN 'COMPLETED' 
        ELSE 'NOT_COMPLETED' 
    END as result,
    CAST(COUNT(*) as TEXT) as detail
FROM user_profiles 
GROUP BY onboarding_completed

UNION ALL

-- Check 4: Feed query test (no media join)
SELECT 
    4 as sort_order,
    'feed_query_no_media' as check_type,
    'MATCHING_POSTS' as result,
    CAST(COUNT(*) as TEXT) as detail
FROM posts 
INNER JOIN user_profiles ON posts.user_id = user_profiles.id
WHERE posts.is_public = true 
AND user_profiles.onboarding_completed = true

UNION ALL

-- Check 5: Feed query test (with media join)
SELECT 
    5 as sort_order,
    'feed_query_with_media' as check_type,
    'MATCHING_POSTS' as result,
    CAST(COUNT(*) as TEXT) as detail
FROM posts 
INNER JOIN user_profiles ON posts.user_id = user_profiles.id
LEFT JOIN media_items ON posts.media_id = media_items.id
WHERE posts.is_public = true 
AND user_profiles.onboarding_completed = true

UNION ALL

-- Check 6: Sample of recent posts with their visibility
SELECT 
    6 + ROW_NUMBER() OVER (ORDER BY p.created_at DESC) as sort_order,
    'sample_post' as check_type,
    CASE WHEN p.is_public THEN 'PUBLIC' ELSE 'PRIVATE' END as result,
    'ID: ' || p.id || ' | User: ' || COALESCE(up.username, 'NO_USER') || ' | Onboarded: ' || 
    CASE 
        WHEN up.onboarding_completed IS NULL THEN 'NULL'
        WHEN up.onboarding_completed THEN 'YES'
        ELSE 'NO'
    END as detail
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.id
ORDER BY sort_order; 