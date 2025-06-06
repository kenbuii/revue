-- COMPLETE TABLE STRUCTURE AUDIT
-- This script checks what tables and columns actually exist

-- List all tables in public schema
SELECT 'EXISTING TABLES:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check user_profiles structure (we know this exists)
SELECT 'USER_PROFILES COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if user_media_preferences table exists and its structure
SELECT 'USER_MEDIA_PREFERENCES CHECK:' as info;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_media_preferences' 
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status;

-- If user_media_preferences exists, show its columns
SELECT 'USER_MEDIA_PREFERENCES COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if user_bookmarks table exists and its structure  
SELECT 'USER_BOOKMARKS CHECK:' as info;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_bookmarks' 
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status;

-- If user_bookmarks exists, show its columns
SELECT 'USER_BOOKMARKS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bookmarks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check posts table (for feed functionality)
SELECT 'POSTS CHECK:' as info;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'posts' 
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status;

-- If posts exists, show its columns
SELECT 'POSTS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check notifications table
SELECT 'NOTIFICATIONS CHECK:' as info;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications' 
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status;

-- Sample data check - see if user_profiles has any data
SELECT 'USER_PROFILES SAMPLE DATA:' as info;
SELECT COUNT(*) as total_profiles
FROM user_profiles;

-- Check current user profile with safe JSONB handling
SELECT 'CURRENT USER PROFILE CHECK:' as info;
SELECT 
    user_id,
    username,
    display_name,
    media_preferences,
    jsonb_typeof(media_preferences) as media_prefs_type,
    CASE 
        WHEN media_preferences IS NULL THEN 0
        WHEN jsonb_typeof(media_preferences) = 'array' THEN jsonb_array_length(media_preferences)
        WHEN jsonb_typeof(media_preferences) = 'object' THEN 1
        ELSE 0 
    END as media_prefs_count
FROM user_profiles 
WHERE user_id = '814bbda7-2001-4f2c-a7ea-921122cd2c94'; 