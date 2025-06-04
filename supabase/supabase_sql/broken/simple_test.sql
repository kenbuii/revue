-- SIMPLE TEST - One thing at a time

-- Test 1: How many media items do you currently have?
SELECT COUNT(*) as current_media_count 
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Test 2: Try manual insert with explicit values
INSERT INTO user_media_preferences (
    user_id, 
    media_id, 
    title, 
    media_type, 
    source,
    added_during_onboarding
) VALUES (
    '670e0647-bfcb-4322-aa76-059452af9e01'::UUID,
    'test_tmdb_123',
    'Test Movie',
    'movie',
    'tmdb',
    TRUE
);

-- Test 3: Check if insert worked
SELECT COUNT(*) as media_count_after_insert,
       string_agg(title, ', ') as saved_titles
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01'; 