-- CHECK ACTUAL TABLE COLUMNS
-- This script shows exactly what columns exist in each table

-- Check user_media_preferences table structure
SELECT 'user_media_preferences columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_bookmarks table structure  
SELECT 'user_bookmarks columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bookmarks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_profiles table structure
SELECT 'user_profiles columns:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position; 