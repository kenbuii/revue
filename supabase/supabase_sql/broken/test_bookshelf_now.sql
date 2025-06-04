-- TEST BOOKSHELF NOW - We have media data, does the function work?

-- Test 1: Call the bookshelf function
SELECT public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID) as bookshelf_result;

-- Test 2: See the raw data format
SELECT 
    media_id,
    title,
    media_type,
    source,
    year,
    image_url,
    description
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01'
ORDER BY created_at DESC; 