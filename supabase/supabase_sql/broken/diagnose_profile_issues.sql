-- DIAGNOSE PROFILE INTEGRATION ISSUES
-- Let's understand what's broken and why

-- Step 1: Check if test user has profile record
SELECT '🔍 USER PROFILE CHECK' as section;

SELECT 
    'Profile Check for Test User' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01')
        THEN '✅ Profile EXISTS'
        ELSE '❌ Profile MISSING - This is the main issue!'
    END as profile_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01')
        THEN '✅ Auth user EXISTS'
        ELSE '❌ Auth user MISSING'
    END as auth_status;

-- Step 2: Check what constraint is failing for media preferences
SELECT '🔍 MEDIA PREFERENCES CONSTRAINT CHECK' as section;

-- Show the constraint details
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_media_preferences'
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%source%';

-- Step 3: Check what source values are currently in the table
SELECT '🔍 EXISTING SOURCE VALUES' as section;

SELECT DISTINCT 
    source,
    COUNT(*) as count
FROM user_media_preferences 
GROUP BY source
ORDER BY count DESC;

-- Step 4: Check user_profiles table structure and foreign key constraints
SELECT '🔍 USER_PROFILES TABLE STRUCTURE' as section;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Check for triggers that might auto-create profiles
SELECT '🔍 PROFILE CREATION TRIGGERS' as section;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('users', 'user_profiles')
ORDER BY trigger_name;

-- Step 6: Check foreign key constraints
SELECT '🔍 FOREIGN KEY CONSTRAINTS' as section;

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
AND tc.table_name = 'user_profiles';

-- Step 7: Test the current save function to see exact error
SELECT '🔍 TESTING CURRENT FUNCTION' as section;

-- Try to call the function with test data to see what fails
DO $$
DECLARE
    test_result JSONB;
BEGIN
    -- Test with minimal data first
    BEGIN
        SELECT public.save_user_onboarding_data(
            NULL::TEXT,                     -- p_avatar_url
            FALSE::BOOLEAN,                 -- p_contact_sync_enabled  
            'Test User'::TEXT,              -- p_display_name
            '[]'::JSONB,                    -- p_media_preferences (empty)
            FALSE::BOOLEAN,                 -- p_onboarding_completed
            '670e0647-bfcb-4322-aa76-059452af9e01'::UUID  -- p_user_id
        ) INTO test_result;
        
        RAISE NOTICE '✅ Function call succeeded: %', test_result;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ Function call failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
END $$;

-- Step 8: Check what's in the problem user's data currently
SELECT '🔍 CURRENT USER DATA' as section;

-- Check auth.users
SELECT 
    'auth.users' as table_name,
    id,
    email,
    created_at
FROM auth.users 
WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Check user_profiles (probably empty)
SELECT 
    'user_profiles' as table_name,
    id,
    username,
    display_name,
    onboarding_completed
FROM user_profiles 
WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Check user_media_preferences
SELECT 
    'user_media_preferences' as table_name,
    COUNT(*) as preference_count
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

SELECT '🎯 DIAGNOSIS COMPLETE - Check results above!' as final_message; 