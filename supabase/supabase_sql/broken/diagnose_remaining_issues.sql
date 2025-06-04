-- DIAGNOSE REMAINING ISSUES - Username and Bookshelf
-- Let's see exactly what data we have and what the app expects

-- Check 1: What's in the user profile?
SELECT 
    '1. User Profile Data' as check_type,
    id,
    username,
    display_name,
    avatar_url,
    onboarding_completed
FROM user_profiles 
WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Check 2: What media preferences were saved?
SELECT 
    '2. Media Preferences Saved' as check_type,
    media_id,
    title,
    media_type,
    source,
    year,
    added_during_onboarding
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Check 3: Check if app is looking for media preferences via different query
-- Let's see what columns exist in user_media_preferences
SELECT 
    '3. Media Preferences Schema' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences'
ORDER BY ordinal_position;

-- Check 4: See if there are any functions that fetch media preferences
SELECT 
    '4. Media Functions Available' as check_type,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND (proname ILIKE '%media%' OR proname ILIKE '%preference%' OR proname ILIKE '%bookshelf%')
ORDER BY proname;

-- Check 5: Check what the save function actually saved vs what app sent
-- Let's test what happens when we call the function exactly like the app does
DO $$
DECLARE
    test_result JSONB;
BEGIN
    -- This simulates the exact call your app makes during onboarding
    SELECT public.save_user_onboarding_data(
        NULL::TEXT,                         -- p_avatar_url
        FALSE::BOOLEAN,                     -- p_contact_sync_enabled  
        'Test User From App'::TEXT,         -- p_display_name
        '[{"id":"nyt_9780593441299","title":"Great Big Beautiful Life","type":"book","source":"nyt_bestsellers","year":"2025","description":"A sample book"}]'::JSONB,
        TRUE::BOOLEAN,                      -- p_onboarding_completed (set to true this time)
        '670e0647-bfcb-4322-aa76-059452af9e01'::UUID
    ) INTO test_result;
    
    RAISE NOTICE '📋 Function call result: %', test_result;
END $$; 