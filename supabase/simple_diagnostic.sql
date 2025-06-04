-- =======================================
-- SIMPLE POSTS DIAGNOSTIC
-- Quick check to identify the issue
-- =======================================

-- 1. Check table existence
SELECT 
    '1_TABLE_CHECK' as step,
    'posts' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts')
    THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    '1_TABLE_CHECK' as step,
    'user_profiles' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    '1_TABLE_CHECK' as step,
    'comment_likes' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment_likes')
    THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 2. Check posts table columns
SELECT 
    '2_POSTS_COLUMNS' as step,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;

-- 3. Check posts count
SELECT 
    '3_POSTS_COUNT' as step,
    COUNT(*) as total_posts,
    MAX(created_at) as most_recent_post
FROM posts;

-- 4. Check recent posts
SELECT 
    '4_RECENT_POSTS' as step,
    COUNT(*) as posts_last_hour
FROM posts 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 5. Check if new functions exist
SELECT 
    '5_FUNCTIONS' as step,
    'toggle_post_like' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'toggle_post_like')
    THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT 
    '5_FUNCTIONS' as step,
    'get_post_comments' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_post_comments')
    THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 6. Sample recent post
SELECT 
    '6_SAMPLE_POST' as step,
    id,
    user_id,
    LEFT(content, 100) as content_preview,
    like_count,
    comment_count,
    created_at
FROM posts 
ORDER BY created_at DESC 
LIMIT 1;

-- Final result
SELECT '7_DIAGNOSIS' as step, 'COMPLETE' as status; 