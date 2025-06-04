-- VERIFY BOOKMARK FUNCTION COMPATIBILITY
-- Check all bookmark-related functions to ensure no conflicts

-- =========================
-- CHECK 1: All bookmark functions
-- =========================

SELECT 
    '🔍 All bookmark functions:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname LIKE '%bookmark%'
ORDER BY proname;

-- =========================
-- CHECK 2: Verify no function overloading conflicts
-- =========================

-- Count functions by name to detect duplicates
SELECT 
    proname as function_name,
    COUNT(*) as function_count,
    CASE 
        WHEN COUNT(*) > 1 THEN '❌ CONFLICT!' 
        ELSE '✅ OK' 
    END as status
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname LIKE '%bookmark%'
GROUP BY proname
ORDER BY function_count DESC, proname; 