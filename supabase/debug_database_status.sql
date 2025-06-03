-- Check current database function status
-- Run this in Supabase SQL Editor to see what functions currently exist

SELECT 
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname LIKE '%save_user_onboarding_data%'
ORDER BY proname, arguments;

-- Also check for handle_new_user
SELECT 
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname LIKE '%handle_new_user%';

-- Check triggers
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%auth%' OR trigger_name LIKE '%user%'; 