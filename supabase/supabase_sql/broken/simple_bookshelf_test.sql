-- SIMPLE BOOKSHELF TEST - Check why get_user_media_preferences fails

-- First, let's see the exact error from the bookshelf function
DO $$
DECLARE
    bookshelf_result RECORD;
    error_msg TEXT;
BEGIN
    BEGIN
        SELECT * INTO bookshelf_result 
        FROM public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID);
        
        RAISE NOTICE '✅ Bookshelf function worked! Result: %', bookshelf_result;
    EXCEPTION
        WHEN others THEN
            GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
            RAISE NOTICE '❌ Bookshelf function ERROR: %', error_msg;
    END;
END $$;

-- Let's also check what data we actually have in user_media_preferences
SELECT 
    'Raw Media Data:' as check_type,
    media_id,
    title,
    media_type,
    source,
    added_during_onboarding
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01'; 