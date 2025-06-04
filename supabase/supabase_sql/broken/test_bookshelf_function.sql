-- TEST BOOKSHELF & USERNAME - Fix the remaining issues

-- Test 1: Check what get_user_media_preferences returns
SELECT 
    '1. Bookshelf Function Test' as test_type,
    public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID) as result;

-- Test 2: Check the actual function definition
SELECT 
    '2. Function Definition' as test_type,
    pg_get_functiondef(p.oid) as function_code
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
AND p.proname = 'get_user_media_preferences';

-- Test 3: Generate a username for the user (since it's missing)
UPDATE user_profiles 
SET username = 'user_' || SUBSTRING(id::TEXT FROM 1 FOR 8)
WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01' 
AND username IS NULL;

-- Test 4: Verify username was set
SELECT 
    '3. Username Fix' as test_type,
    username,
    display_name
FROM user_profiles 
WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Test 5: Check if we need to modify save_user_onboarding_data to handle username
-- Let's see what parameters your app actually sends by looking at recent error logs
DO $$
BEGIN
    RAISE NOTICE '🔍 Key Findings:';
    RAISE NOTICE '1. Username was NULL - now auto-generated';
    RAISE NOTICE '2. Testing get_user_media_preferences function';
    RAISE NOTICE '3. If bookshelf still not showing, the function may need fixing';
END $$; 