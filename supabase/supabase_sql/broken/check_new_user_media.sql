-- CHECK NEW USER MEDIA - Verify the new user's onboarding data

-- Check if the new user's media preferences were saved
SELECT 
    'New User Media Check:' as status,
    COUNT(*) as total_items,
    string_agg(title, ', ' ORDER BY created_at) as saved_titles
FROM user_media_preferences 
WHERE user_id = '7e180210-28d8-44e1-801a-7cd2c717d0ef';

-- Test the function with the new user ID
SELECT 'Function Test for New User:' as test,
       public.get_user_media_preferences('7e180210-28d8-44e1-801a-7cd2c717d0ef'::UUID) as result;

-- Check if the user profile exists and has correct data
SELECT 
    'New User Profile:' as status,
    username,
    display_name,
    onboarding_completed
FROM user_profiles 
WHERE id = '7e180210-28d8-44e1-801a-7cd2c717d0ef';

-- List all media for the new user to see what was actually saved
SELECT 
    media_id,
    title,
    media_type,
    source,
    year,
    created_at
FROM user_media_preferences 
WHERE user_id = '7e180210-28d8-44e1-801a-7cd2c717d0ef'
ORDER BY created_at; 