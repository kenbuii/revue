-- =======================================
-- FIX: Set User Onboarding Status to Completed
-- This will allow posts to appear in feeds
-- =======================================

-- Update the user's onboarding status
UPDATE user_profiles 
SET onboarding_completed = true
WHERE user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049';

-- Verify the update worked
SELECT 
    'ONBOARDING STATUS UPDATED!' as result,
    user_id,
    username,
    onboarding_completed,
    'Posts should now appear in feed' as note
FROM user_profiles 
WHERE user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049';

-- Test that posts now meet feed criteria
SELECT 
    'FEED ELIGIBILITY TEST:' as test,
    p.id,
    p.title,
    CASE 
        WHEN p.visibility = 'public' 
        AND p.is_public = true
        AND up.onboarding_completed = true
        THEN '✅ NOW ELIGIBLE' 
        ELSE '❌ STILL FILTERED' 
    END as feed_status
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
WHERE p.user_id = 'd55d28c6-5d98-4533-a1a6-882b5aa1d049'
ORDER BY p.created_at DESC; 