-- FINAL VERIFICATION - Test all functions with real data
-- This will create test data and verify everything works end-to-end

-- Step 1: Ensure test user exists (should already be there)
DO $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        display_name, 
        username,
        avatar_url, 
        contact_sync_enabled, 
        onboarding_completed,
        created_at, 
        updated_at
    ) VALUES (
        '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
        'Test User Final',
        'testuser_final',
        'https://example.com/avatar.jpg',
        false,
        false,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        username = EXCLUDED.username,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Test user ensured';
END $$;

-- Step 2: Create test posts
DO $$
DECLARE
    test_post_1 UUID;
    test_post_2 UUID;
BEGIN
    -- Create first test post
    INSERT INTO public.posts (
        title,
        content,
        user_id,
        created_at
    ) VALUES (
        'Test Post 1 for Bookmarking',
        'This is the first test post content for bookmark testing.',
        '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
        NOW()
    ) RETURNING id INTO test_post_1;
    
    -- Create second test post  
    INSERT INTO public.posts (
        title,
        content,
        user_id,
        created_at
    ) VALUES (
        'Test Post 2 for Bookmarking',
        'This is the second test post content for bookmark testing.',
        '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
        NOW()
    ) RETURNING id INTO test_post_2;
    
    RAISE NOTICE '✅ Created test posts: % and %', test_post_1, test_post_2;
END $$;

-- Step 3: Test save_user_onboarding_data function
SELECT '🧪 TESTING save_user_onboarding_data' as test_section;

SELECT public.save_user_onboarding_data(
    '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
    'Updated Test User'::TEXT,
    true::BOOLEAN,
    'https://example.com/new-avatar.jpg'::TEXT,
    '[{"id":"test_media_1","title":"Test Movie","type":"movie","year":"2023","image":"https://example.com/movie.jpg","description":"A test movie"}]'::JSONB,
    true::BOOLEAN,
    'updated_testuser'::TEXT
) as onboarding_result;

-- Step 4: Test add_bookmark function with real posts
SELECT '🧪 TESTING add_bookmark function' as test_section;

-- Get a real post ID to bookmark
DO $$
DECLARE
    real_post_id UUID;
    bookmark_result JSONB;
BEGIN
    -- Get the first post ID
    SELECT id INTO real_post_id FROM public.posts LIMIT 1;
    
    IF real_post_id IS NOT NULL THEN
        -- Test adding bookmark
        SELECT public.add_bookmark(
            '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
            real_post_id
        ) INTO bookmark_result;
        
        RAISE NOTICE '✅ Bookmark test result: %', bookmark_result;
        
        -- Test adding same bookmark again (should fail gracefully)
        SELECT public.add_bookmark(
            '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
            real_post_id
        ) INTO bookmark_result;
        
        RAISE NOTICE '✅ Duplicate bookmark test result: %', bookmark_result;
    ELSE
        RAISE NOTICE '❌ No posts found to test bookmarking';
    END IF;
END $$;

-- Step 5: Test get_user_bookmarks function
SELECT '🧪 TESTING get_user_bookmarks function' as test_section;

SELECT 
    id,
    user_id,
    post_id,
    created_at,
    post_title,
    post_content,
    post_author_id,
    post_created_at
FROM public.get_user_bookmarks('8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID);

-- Step 6: Verify data was saved correctly
SELECT '🔍 VERIFICATION: Check saved data' as verification_section;

-- Check user profile was updated
SELECT 
    'User Profile Check' as check_type,
    id,
    display_name,
    username,
    avatar_url,
    contact_sync_enabled,
    onboarding_completed
FROM public.user_profiles 
WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3';

-- Check media preferences were saved
SELECT 
    'Media Preferences Check' as check_type,
    COUNT(*) as preference_count
FROM public.user_media_preferences 
WHERE user_id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'
AND added_during_onboarding = TRUE;

-- Check bookmarks were created
SELECT 
    'Bookmarks Check' as check_type,
    COUNT(*) as bookmark_count
FROM public.bookmarks 
WHERE user_id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3';

-- Step 7: Summary
SELECT 
    '🎯 FINAL STATUS SUMMARY' as summary,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3' AND onboarding_completed = true)
        THEN '✅ save_user_onboarding_data WORKING'
        ELSE '❌ save_user_onboarding_data FAILED'
    END as onboarding_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.bookmarks WHERE user_id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3')
        THEN '✅ add_bookmark WORKING'
        ELSE '❌ add_bookmark FAILED'
    END as bookmark_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' 
            AND p.proname = 'get_user_bookmarks'
            AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
        ) THEN '✅ get_user_bookmarks FUNCTION EXISTS'
        ELSE '❌ get_user_bookmarks FUNCTION MISSING'
    END as get_bookmarks_status;

-- Step 8: Performance check
SELECT '⚡ PERFORMANCE CHECK' as perf_check;

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.get_user_bookmarks('8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID);

SELECT '🎉 ALL TESTS COMPLETE! Your functions should now work in your app.' as final_message; 