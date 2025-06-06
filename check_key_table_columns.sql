-- CHECK KEY TABLE COLUMNS
-- Check actual column structure of tables that exist but have errors

-- Check user_media_preferences columns (this table exists!)
SELECT 'USER_MEDIA_PREFERENCES COLUMNS:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_bookmarks columns (this table exists!)  
SELECT 'USER_BOOKMARKS COLUMNS:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bookmarks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check posts columns (for feed errors)
SELECT 'POSTS COLUMNS:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check notifications columns (for notification errors)
SELECT 'NOTIFICATIONS COLUMNS:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position; 