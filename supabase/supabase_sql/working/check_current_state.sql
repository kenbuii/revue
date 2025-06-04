-- CHECK CURRENT STATE - See what actually happened

-- Check 1: How many media preferences do you have now?
SELECT 
    'Media Count:' as check_type,
    COUNT(*) as count,
    COALESCE(string_agg(title, ', '), 'No media saved') as saved_items
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Check 2: Test the get_user_media_preferences function now
DO $$
DECLARE
    media_result JSONB;
BEGIN
    BEGIN
        SELECT public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID) INTO media_result;
        RAISE NOTICE '✅ get_user_media_preferences returned: %', media_result;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ get_user_media_preferences failed: %', SQLERRM;
    END;
END $$;

-- Check 3: What's the actual constraint that's blocking us?
SELECT 
    'Source Constraint:' as check_type,
    cc.check_clause as constraint_details
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_media_preferences'
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%source%';

-- Check 4: Let's see if our save function is actually working now
DO $$
DECLARE
    save_result JSONB;
BEGIN
    SELECT public.save_user_onboarding_data(
        NULL::TEXT,                         -- p_avatar_url
        FALSE::BOOLEAN,                     -- p_contact_sync_enabled  
        'Test Guy'::TEXT,                   -- p_display_name
        '[{"id":"tmdb_tv_291256","title":"Sara - Woman in the Shadows","type":"tv","source":"tmdb","year":"2025"}]'::JSONB,  -- Single TMDB item
        TRUE::BOOLEAN,                      -- p_onboarding_completed
        '670e0647-bfcb-4322-aa76-059452af9e01'::UUID
    ) INTO save_result;
    
    RAISE NOTICE '📋 Save function result: %', save_result;
END $$; 