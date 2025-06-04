-- TEST SCRIPT FOR FIXED FUNCTIONS
-- Run this after applying the smart parameter fix

-- Test 1: Check if functions exist with correct parameters
SELECT 
    '🧪 FUNCTION EXISTENCE TEST' as test_name,
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as parameters,
    CASE WHEN pg_catalog.pg_get_function_arguments(p.oid) LIKE '%target_user_id%' 
         THEN '✅ HAS target_user_id' 
         ELSE '❌ MISSING target_user_id' 
    END as status
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('save_user_onboarding_data', 'get_user_bookmarks', 'add_bookmark')
ORDER BY p.proname;

-- Test 2: Check if test user exists
SELECT 
    '👤 USER EXISTENCE TEST' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3') 
        THEN '✅ User profile EXISTS'
        ELSE '❌ User profile MISSING - this might cause "No profile found" errors'
    END as user_profile_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3') 
        THEN '✅ Auth user EXISTS'
        ELSE '❌ Auth user MISSING'
    END as auth_user_status;

-- Test 3: Try calling get_user_bookmarks function
SELECT '📚 TESTING get_user_bookmarks FUNCTION' as test_name;

SELECT * FROM public.get_user_bookmarks('8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID);

-- Test 4: Try calling save_user_onboarding_data function (safe test)
SELECT '💾 TESTING save_user_onboarding_data FUNCTION' as test_name;

SELECT public.save_user_onboarding_data(
    '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
    'Test User'::TEXT,
    true::BOOLEAN,
    'https://example.com/avatar.jpg'::TEXT,
    '[]'::JSONB,
    false::BOOLEAN,
    'testuser'::TEXT
);

-- Test 5: Show table structure to understand the schema
SELECT 
    '📋 TABLE STRUCTURES' as info,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('user_profiles', 'bookmarks', 'posts', 'user_media_preferences')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Test 6: Check for any existing data for test user
SELECT '🔍 EXISTING DATA CHECK' as test_name;

SELECT 'user_profiles' as table_name, COUNT(*) as record_count
FROM user_profiles 
WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'

UNION ALL

SELECT 'bookmarks' as table_name, COUNT(*) as record_count
FROM bookmarks 
WHERE user_id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'

UNION ALL

SELECT 'user_media_preferences' as table_name, COUNT(*) as record_count  
FROM user_media_preferences 
WHERE user_id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3';

-- Test 7: Create user profile if missing (this might fix "No profile found" errors)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3') THEN
        RAISE NOTICE '🔧 Creating missing user profile for test user...';
        
        INSERT INTO user_profiles (
            id, 
            display_name, 
            avatar_url, 
            contact_sync_enabled, 
            onboarding_completed, 
            created_at, 
            updated_at
        ) VALUES (
            '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
            'Test User',
            'https://example.com/avatar.jpg',
            false,
            false,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ User profile created successfully';
    ELSE
        RAISE NOTICE '✅ User profile already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ Error creating user profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;

-- Final success message
SELECT '🎉 TEST COMPLETE - Check results above' as final_status; 