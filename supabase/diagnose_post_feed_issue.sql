-- =======================================
-- DIAGNOSE POST FEED REFLECTION ISSUE
-- Check if posts exist but aren't showing in feed
-- =======================================

-- Step 1: Check if the specific post exists
SELECT 'RECENT POST CHECK:' as info;
SELECT 
    id,
    title,
    content,
    user_id,
    media_item_id,
    visibility,
    is_public,
    created_at,
    like_count,
    comment_count
FROM posts 
WHERE id = '44ce369d-c91e-4e72-87dc-dca042af073c'
OR created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Step 2: Check posts table structure for visibility-related columns
SELECT 'POSTS TABLE VISIBILITY COLUMNS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name IN ('visibility', 'is_public', 'user_id')
ORDER BY ordinal_position;

-- Step 3: Check what the get_for_you_feed RPC function is actually returning
SELECT 'GET_FOR_YOU_FEED RPC TEST:' as info;
SELECT * FROM get_for_you_feed(NULL, 5, 0);

-- Step 4: Check user_profiles for the post creator
SELECT 'POST CREATOR USER PROFILE:' as info;
SELECT 
    up.user_id,
    up.username,
    up.display_name,
    up.onboarding_completed,
    up.created_at as profile_created
FROM posts p
JOIN user_profiles up ON p.user_id = up.user_id
WHERE p.id = '44ce369d-c91e-4e72-87dc-dca042af073c';

-- Step 5: Check what criteria might be filtering out posts
SELECT 'POSTS FILTER ANALYSIS:' as info;
SELECT 
    COUNT(*) as total_posts,
    COUNT(CASE WHEN visibility = 'public' THEN 1 END) as public_posts,
    COUNT(CASE WHEN is_public = true THEN 1 END) as is_public_posts,
    COUNT(CASE WHEN visibility = 'public' AND is_public = true THEN 1 END) as visible_posts
FROM posts 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Step 6: Check if there are any RLS policies blocking the query
SELECT 'RLS POLICIES ON POSTS:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts';

-- Step 7: Test direct query that should match get_for_you_feed logic
SELECT 'DIRECT FEED QUERY TEST:' as info;
SELECT 
    p.id,
    p.title,
    p.content,
    p.created_at,
    p.visibility,
    p.is_public,
    up.onboarding_completed,
    up.username
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE 
    p.visibility = 'public' 
    AND p.is_public = true
    AND up.onboarding_completed = true
ORDER BY p.created_at DESC
LIMIT 5;

-- Step 8: Check auth context (what user is making the query)
SELECT 'CURRENT AUTH CONTEXT:' as info;
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

SELECT 'DIAGNOSIS COMPLETE!' as result; 