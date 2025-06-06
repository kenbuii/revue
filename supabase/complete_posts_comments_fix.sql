-- =======================================
-- COMPLETE POSTS & COMMENTS FUNCTIONALITY FIX
-- Fix onboarding status + verify comments system
-- =======================================

-- ====================
-- PART 1: FIX POSTS (Onboarding Status)
-- ====================

-- Update user's onboarding status to allow posts in feed
UPDATE user_profiles 
SET onboarding_completed = true,
    updated_at = NOW()
WHERE user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049';

-- Verify posts now meet feed criteria
SELECT 
    'POSTS_FEED_ELIGIBILITY' as test,
    p.id,
    p.title,
    p.visibility,
    p.is_public,
    up.onboarding_completed,
    CASE 
        WHEN p.visibility = 'public' 
        AND p.is_public = true
        AND up.onboarding_completed = true
        THEN '✅ NOW_ELIGIBLE' 
        ELSE '❌ STILL_FILTERED' 
    END as feed_status
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
WHERE p.user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
ORDER BY p.created_at DESC;

-- ====================
-- PART 2: VERIFY COMMENTS SYSTEM
-- ====================

-- Check comments table structure
SELECT 'COMMENTS_TABLE_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comments'
AND column_name IN ('id', 'content', 'user_id', 'post_id', 'like_count', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- Check comment_likes table exists
SELECT 'COMMENT_LIKES_TABLE' as test;
SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'comment_likes'
) as table_exists;

-- Check comments functions exist
SELECT 'COMMENTS_FUNCTIONS' as test;
SELECT 
    routine_name,
    routine_type,
    'EXISTS' as status
FROM information_schema.routines 
WHERE routine_name IN ('get_post_comments', 'create_comment', 'toggle_comment_like')
ORDER BY routine_name;

-- Check comment triggers exist
SELECT 'COMMENTS_TRIGGERS' as test;
SELECT 
    trigger_name,
    event_object_table,
    'EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_name LIKE '%comment%'
ORDER BY trigger_name;

-- Test comment functionality with a sample post
SELECT 'COMMENTS_FUNCTIONALITY_TEST' as test;
SELECT 
    p.id as post_id,
    p.title,
    COUNT(c.id) as comment_count,
    CASE WHEN COUNT(c.id) > 0 THEN '✅ HAS_COMMENTS' ELSE '⚠️ NO_COMMENTS' END as comment_status
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
GROUP BY p.id, p.title
ORDER BY p.created_at DESC;

-- ====================
-- PART 3: TEST INTEGRATION
-- ====================

-- Test that get_for_you_feed now includes user posts
SELECT 'FEED_INTEGRATION_TEST' as test;
SELECT 
    COUNT(*) as total_posts_in_feed,
    COUNT(CASE WHEN user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049' THEN 1 END) as user_posts_in_feed
FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 10, 0);

-- Show sample of posts that will appear in feed
SELECT 'FEED_SAMPLE' as test;
SELECT 
    id,
    title,
    username,
    created_at,
    CASE WHEN user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049' THEN '👤 YOUR_POST' ELSE '👥 OTHER_POST' END as post_type
FROM get_for_you_feed('d55d28c6-5d98-4533-a1a6-882b5aa1d049'::UUID, 5, 0)
ORDER BY created_at DESC;

SELECT 'POSTS_AND_COMMENTS_FIX_COMPLETE!' as result; 