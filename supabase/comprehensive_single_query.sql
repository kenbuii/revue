-- =======================================
-- COMPREHENSIVE SINGLE QUERY DIAGNOSTIC
-- All info in one result to work around display issues
-- =======================================

SELECT 
  'DATABASE_STATUS' as info_type,
  
  -- Table existence
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts')
  THEN 'posts_exists' ELSE 'posts_missing' END as posts_table,
  
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
  THEN 'user_profiles_exists' ELSE 'user_profiles_missing' END as user_profiles_table,
  
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment_likes')
  THEN 'comment_likes_exists' ELSE 'comment_likes_missing' END as comment_likes_table,
  
  -- Post counts
  (SELECT COUNT(*) FROM posts) as total_posts,
  (SELECT COUNT(*) FROM posts WHERE created_at >= NOW() - INTERVAL '24 hours') as posts_last_24h,
  (SELECT COUNT(*) FROM posts WHERE created_at >= NOW() - INTERVAL '1 hour') as posts_last_hour,
  
  -- Migration status
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'like_count')
  THEN 'like_count_exists' ELSE 'like_count_missing' END as posts_like_count_column,
  
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'like_count')
  THEN 'comments_like_count_exists' ELSE 'comments_like_count_missing' END as comments_like_count_column,
  
  -- Functions status
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'toggle_post_like')
  THEN 'toggle_post_like_exists' ELSE 'toggle_post_like_missing' END as toggle_post_like_function,
  
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_post_comments')
  THEN 'get_post_comments_exists' ELSE 'get_post_comments_missing' END as get_post_comments_function,
  
  -- Recent activity
  (SELECT MAX(created_at) FROM posts) as most_recent_post_time,
  
  -- Sample recent post data
  (SELECT LEFT(content, 100) FROM posts ORDER BY created_at DESC LIMIT 1) as most_recent_post_content,
  (SELECT like_count FROM posts ORDER BY created_at DESC LIMIT 1) as most_recent_post_likes,
  (SELECT comment_count FROM posts ORDER BY created_at DESC LIMIT 1) as most_recent_post_comments,
  
  -- User profiles info
  (SELECT COUNT(*) FROM user_profiles) as total_users,
  
  -- Diagnosis
  CASE 
    WHEN (SELECT COUNT(*) FROM posts) = 0 THEN 'NO_POSTS_FOUND'
    WHEN (SELECT COUNT(*) FROM posts WHERE created_at >= NOW() - INTERVAL '1 hour') = 0 THEN 'NO_RECENT_POSTS'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'like_count')
    THEN 'MIGRATION_INCOMPLETE'
    ELSE 'DATABASE_LOOKS_HEALTHY'
  END as diagnosis,
  
  'If diagnosis is DATABASE_LOOKS_HEALTHY, the issue is likely in your React Native app code' as recommendation; 