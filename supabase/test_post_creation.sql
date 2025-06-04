-- =======================================
-- TEST POST CREATION & RETRIEVAL
-- Discovery-based approach
-- =======================================

-- Test 0: Discover user_profiles table structure first
SELECT 
    'TEST_0_USER_PROFILES_STRUCTURE' as test_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Test 1: Can we retrieve existing posts?
SELECT 
    'TEST_1_RETRIEVE' as test_name,
    COUNT(*) as existing_posts_count,
    MAX(created_at) as most_recent_post
FROM posts;

-- Test 2: What do recent posts look like?
SELECT 
    'TEST_2_RECENT_SAMPLE' as test_name,
    id,
    user_id,
    LEFT(content, 50) as content_preview,
    like_count,
    comment_count,
    created_at
FROM posts 
ORDER BY created_at DESC 
LIMIT 3;

-- Test 3: Check what user identifier column exists in user_profiles
SELECT 
    'TEST_3_USER_SAMPLE' as test_name,
    *
FROM user_profiles 
LIMIT 1;

-- Test 4: Try to create a test post using correct column
-- First, let's see if we can get any user identifier
DO $$
DECLARE 
    user_identifier UUID;
BEGIN
    -- Try to get a user identifier (trying common column names)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'user_id') THEN
        SELECT user_id INTO user_identifier FROM user_profiles LIMIT 1;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'id') THEN
        SELECT id INTO user_identifier FROM user_profiles LIMIT 1;
    ELSE
        RAISE NOTICE 'Cannot find user identifier column in user_profiles';
        RETURN;
    END IF;

    -- Create test post if we found a user
    IF user_identifier IS NOT NULL THEN
        INSERT INTO posts (user_id, content, like_count, comment_count) 
        VALUES (user_identifier, 'Test post to check creation - ' || NOW()::text, 0, 0);
        RAISE NOTICE 'Test post created successfully with user: %', user_identifier;
    END IF;
END $$;

-- Test 5: Check if the test post was created
SELECT 
    'TEST_5_NEW_POST' as test_name,
    id,
    user_id,
    content,
    created_at
FROM posts 
WHERE content LIKE 'Test post to check creation%'
ORDER BY created_at DESC 
LIMIT 1;

-- Test 6: Clean up test post
DELETE FROM posts WHERE content LIKE 'Test post to check creation%';

-- Test 7: Final check - how many posts exist now?
SELECT 
    'TEST_7_FINAL_COUNT' as test_name,
    COUNT(*) as final_posts_count
FROM posts;

SELECT 'POST_CREATION_TEST_COMPLETE' as result; 