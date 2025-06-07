-- =======================================
-- VERIFY USER DATA POPULATION
-- Check if user profiles have populated fields that would prevent "Unknown User"
-- =======================================

-- Check user profiles data population
SELECT 'USER_PROFILES_DATA_POPULATION' as test;
SELECT 
    user_id,
    username,
    display_name,
    CASE 
        WHEN username IS NULL AND display_name IS NULL THEN 'WILL_SHOW_UNKNOWN_USER'
        WHEN username IS NOT NULL OR display_name IS NOT NULL THEN 'HAS_VALID_NAME'
        ELSE 'OTHER'
    END as display_status,
    created_at,
    onboarding_completed
FROM user_profiles
ORDER BY created_at DESC;

-- Check what the RPC function returns vs PostgREST
SELECT 'RPC_VS_POSTGREST_COMPARISON' as test;

-- Test RPC function (what should work)
SELECT 'RPC_FUNCTION_RESULT' as method;
SELECT 
    id,
    username,
    display_name,
    avatar_url,
    'RPC' as source
FROM get_for_you_feed(NULL, 5, 0);

-- Test PostgREST query (fallback that might be broken)
SELECT 'POSTGREST_FALLBACK_RESULT' as method;
SELECT 
    p.id,
    up.username,
    up.display_name,
    up.avatar_url,
    'PostgREST' as source
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.is_public = true
    AND up.onboarding_completed = true
ORDER BY p.created_at DESC
LIMIT 5;

-- Check if the PostgREST query structure matches what frontend expects
SELECT 'POSTGREST_WITH_NESTED_STRUCTURE' as method;
SELECT 
    p.*,
    json_build_object(
        'user_id', up.user_id,
        'username', up.username,
        'display_name', up.display_name,
        'avatar_url', up.avatar_url,
        'onboarding_completed', up.onboarding_completed
    ) as user_profiles,
    json_build_object(
        'id', mi.id,
        'title', mi.title,
        'media_type', mi.media_type,
        'cover_image_url', mi.cover_image_url
    ) as media_items
FROM posts p
INNER JOIN user_profiles up ON p.user_id = up.user_id
LEFT JOIN media_items mi ON p.media_item_id = mi.id
WHERE p.is_public = true
    AND up.onboarding_completed = true
ORDER BY p.created_at DESC
LIMIT 3;

SELECT 'USER_DATA_VERIFICATION_COMPLETE!' as result; 