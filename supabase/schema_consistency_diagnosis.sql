-- =======================================
-- SCHEMA CONSISTENCY DIAGNOSIS
-- Check for user_id vs id column mismatches causing feed and profile issues
-- =======================================

-- STEP 1: Check actual user_profiles table structure
SELECT 'USER_PROFILES_TABLE_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Check user_profiles primary key and constraints
SELECT 'USER_PROFILES_CONSTRAINTS' as test;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'user_profiles' AND tc.table_schema = 'public';

-- STEP 3: Check user_media_preferences table structure and FK references
SELECT 'USER_MEDIA_PREFERENCES_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 4: Check user_media_preferences foreign key constraints
SELECT 'USER_MEDIA_PREFERENCES_FK_CONSTRAINTS' as test;
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_media_preferences' 
    AND tc.table_schema = 'public';

-- STEP 5: Check posts table FK constraints (for feed issues)
SELECT 'POSTS_TABLE_FK_CONSTRAINTS' as test;
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'posts' 
    AND tc.table_schema = 'public';

-- STEP 6: Test actual data - check if user_profiles records exist
SELECT 'USER_PROFILES_DATA_CHECK' as test;
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as profiles_with_username,
    COUNT(CASE WHEN display_name IS NOT NULL THEN 1 END) as profiles_with_display_name
FROM user_profiles;

-- STEP 7: Test JOIN between posts and user_profiles (feed query simulation)
SELECT 'POSTS_USER_PROFILES_JOIN_TEST' as test;
-- Try both possible join scenarios
SELECT 'Testing posts.user_id = user_profiles.user_id' as join_type;
SELECT COUNT(*) as successful_joins
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id;

SELECT 'Testing posts.user_id = user_profiles.id' as join_type;
SELECT COUNT(*) as successful_joins
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.id;

-- STEP 8: Test user_media_preferences joins
SELECT 'MEDIA_PREFERENCES_JOIN_TEST' as test;
-- Try both possible join scenarios
SELECT 'Testing user_media_preferences.user_id = user_profiles.user_id' as join_type;
SELECT COUNT(*) as successful_joins
FROM user_media_preferences ump
LEFT JOIN user_profiles up ON ump.user_id = up.user_id;

SELECT 'Testing user_media_preferences.user_id = user_profiles.id' as join_type;
SELECT COUNT(*) as successful_joins
FROM user_media_preferences ump
LEFT JOIN user_profiles up ON ump.user_id = up.id;

-- STEP 9: Check sample feed query (identify "unknown user" issue)
SELECT 'SAMPLE_FEED_QUERY_TEST' as test;
SELECT 
    p.id as post_id,
    p.content,
    p.user_id as post_user_id,
    up.user_id as profile_user_id,
    up.id as profile_id,
    up.username,
    up.display_name,
    CASE 
        WHEN up.username IS NULL AND up.display_name IS NULL THEN 'UNKNOWN_USER_ISSUE'
        ELSE 'USER_DATA_FOUND'
    END as status
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id  -- Check this join
LIMIT 5;

-- STEP 10: Check sample media preferences query
SELECT 'SAMPLE_MEDIA_PREFERENCES_TEST' as test;
SELECT 
    ump.user_id,
    ump.media_id,
    ump.title,
    up.user_id as profile_user_id,
    up.id as profile_id,
    up.username,
    CASE 
        WHEN up.username IS NULL THEN 'PROFILE_NOT_FOUND'
        ELSE 'PROFILE_FOUND'
    END as status
FROM user_media_preferences ump
LEFT JOIN user_profiles up ON ump.user_id = up.user_id  -- Check this join
LIMIT 5;

-- STEP 11: Check if there are orphaned posts/media preferences
SELECT 'ORPHANED_DATA_CHECK' as test;
SELECT 
    'posts' as table_name,
    COUNT(*) as total_records,
    COUNT(up.user_id) as records_with_profiles,
    COUNT(*) - COUNT(up.user_id) as orphaned_records
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id
UNION ALL
SELECT 
    'user_media_preferences' as table_name,
    COUNT(*) as total_records,
    COUNT(up.user_id) as records_with_profiles,
    COUNT(*) - COUNT(up.user_id) as orphaned_records
FROM user_media_preferences ump
LEFT JOIN user_profiles up ON ump.user_id = up.user_id;

-- STEP 12: Check functions that might have wrong column references
SELECT 'FUNCTION_COLUMN_REFERENCES' as test;
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%user_profiles%'
    AND routine_type = 'FUNCTION'
    AND routine_schema = 'public'
ORDER BY routine_name;

SELECT 'SCHEMA_CONSISTENCY_DIAGNOSIS_COMPLETE!' as result; 