-- DIAGNOSE CURRENT SCHEMA STATE
-- This script shows exactly what columns and functions exist right now

-- Check user_profiles table structure
SELECT 'user_profiles columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Check user_media_preferences table structure  
SELECT 'user_media_preferences columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences' 
ORDER BY ordinal_position;

-- Check user_bookmarks table structure
SELECT 'user_bookmarks columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_bookmarks' 
ORDER BY ordinal_position;

-- Check what tables exist
SELECT 'existing tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check what RPC functions exist and their parameters
SELECT 'existing functions:' as info;
SELECT 
    r.routine_name,
    string_agg(COALESCE(p.parameter_name, 'no_params') || ' ' || COALESCE(p.data_type, 'unknown'), ', ' ORDER BY p.ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public' 
AND r.routine_type = 'FUNCTION'
AND r.routine_name IN ('get_user_bookmarks', 'add_bookmark', 'remove_bookmark', 'save_user_onboarding_data')
GROUP BY r.routine_name, r.specific_name
ORDER BY r.routine_name;

-- Check primary keys and foreign keys
SELECT 'user_profiles constraints:' as info;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles';

SELECT 'Current schema diagnosis complete!' as status; 