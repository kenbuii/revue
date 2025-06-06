-- =======================================
-- PHASE 1C: Post Detail Page Diagnosis
-- Identify why post details show test data
-- =======================================

-- Step 1: Check if posts exist and have proper structure
SELECT 'POSTS_TABLE_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'posts'
ORDER BY ordinal_position;

-- Step 2: Check sample posts with full details
SELECT 'SAMPLE_POSTS_WITH_DETAILS' as test;
SELECT 
    p.id,
    p.title,
    p.content,
    p.user_id,
    p.media_item_id,
    p.rating,
    p.like_count,
    p.comment_count,
    p.created_at,
    up.username,
    up.display_name,
    mi.title as media_title,
    mi.media_type,
    mi.cover_image_url
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.created_at > NOW() - INTERVAL '24 hours'
ORDER BY p.created_at DESC
LIMIT 5;

-- Step 3: Test specific post detail query (using recent post)
SELECT 'SPECIFIC_POST_DETAIL_TEST' as test;
SELECT 
    p.id,
    p.title,
    p.content,
    p.user_id,
    p.media_item_id,
    p.rating,
    p.like_count,
    p.comment_count,
    p.created_at,
    up.username,
    up.display_name,
    up.avatar_url,
    mi.title as media_title,
    mi.media_type,
    mi.cover_image_url,
    mi.description as media_description
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.id = (
    SELECT id FROM posts 
    WHERE user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049' 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Step 4: Check if media_items table has data
SELECT 'MEDIA_ITEMS_TABLE_CHECK' as test;
SELECT 
    COUNT(*) as total_media_items,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_media_items,
    COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as items_with_titles,
    COUNT(CASE WHEN cover_image_url IS NOT NULL AND cover_image_url != '' THEN 1 END) as items_with_images
FROM media_items;

-- Step 5: Check foreign key relationships for posts
SELECT 'POST_FOREIGN_KEY_CHECK' as test;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'posts';

-- Step 6: Check if posts have orphaned references
SELECT 'ORPHANED_REFERENCES_CHECK' as test;
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN up.user_id IS NULL THEN 1 END) as posts_with_missing_users,
    COUNT(CASE WHEN mi.id IS NULL THEN 1 END) as posts_with_missing_media,
    COUNT(CASE WHEN up.user_id IS NOT NULL AND mi.id IS NOT NULL THEN 1 END) as posts_with_complete_data
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id;

-- Step 7: Test posts service single post query pattern
SELECT 'SINGLE_POST_QUERY_PATTERN_TEST' as test;
SELECT 
    p.*,
    up.username,
    up.display_name,
    up.avatar_url,
    mi.title as media_title,
    mi.media_type,
    mi.cover_image_url,
    mi.description as media_description,
    mi.author as media_author
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.id = '44ce369d-c91e-4e72-87dc-dca042af073c'; -- Your recent post

-- Step 8: Check comments count for posts
SELECT 'POST_COMMENTS_COUNT_CHECK' as test;
SELECT 
    p.id,
    p.title,
    p.comment_count as stored_count,
    COUNT(c.id) as actual_count,
    CASE WHEN p.comment_count = COUNT(c.id) THEN 'MATCH' ELSE 'MISMATCH' END as count_status
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.created_at > NOW() - INTERVAL '24 hours'
GROUP BY p.id, p.title, p.comment_count
ORDER BY p.created_at DESC
LIMIT 5;

-- Step 9: Check if RPC functions for post details exist
SELECT 'POST_DETAIL_RPC_FUNCTIONS' as test;
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_name LIKE '%post%' 
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

SELECT 'POST_DETAIL_DIAGNOSIS_COMPLETE!' as result; 