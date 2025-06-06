-- CHECK IF CORE TABLES EXIST
-- This will show us what's actually in the database

-- Check if each table exists
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
         THEN 'EXISTS' ELSE 'MISSING' END as user_profiles_status;

SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_media_preferences') 
         THEN 'EXISTS' ELSE 'MISSING' END as user_media_preferences_status;

SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookmarks') 
         THEN 'EXISTS' ELSE 'MISSING' END as user_bookmarks_status;

SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') 
         THEN 'EXISTS' ELSE 'MISSING' END as posts_status;

SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_items') 
         THEN 'EXISTS' ELSE 'MISSING' END as media_items_status;

-- Count total tables in public schema
SELECT COUNT(*) as total_public_tables
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- List ALL tables that exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name; 