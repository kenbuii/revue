-- =======================================
-- DIAGNOSE COMMENTS SYSTEM
-- Inspect current state before applying fixes
-- =======================================

-- Step 1: Check if comments table exists and its structure
SELECT 'COMMENTS TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comments' 
ORDER BY ordinal_position;

-- Step 2: Check if comment_likes table exists
SELECT 'COMMENT_LIKES TABLE EXISTS:' as info;
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'comment_likes'
) as comment_likes_table_exists;

-- Step 3: If comment_likes exists, show its structure
SELECT 'COMMENT_LIKES TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comment_likes' 
ORDER BY ordinal_position;

-- Step 4: Check existing comment functions
SELECT 'EXISTING COMMENT FUNCTIONS:' as info;
SELECT 
    routine_name,
    specific_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name LIKE '%comment%' 
AND routine_schema = 'public';

-- Step 5: Get detailed function signatures for comment functions
SELECT 'DETAILED FUNCTION SIGNATURES:' as info;
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosrc as function_body_snippet
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%comment%'
ORDER BY p.proname;

-- Step 6: Check for triggers on comments table
SELECT 'TRIGGERS ON COMMENTS TABLE:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'comments';

-- Step 7: Check for triggers on comment_likes table (if it exists)
SELECT 'TRIGGERS ON COMMENT_LIKES TABLE:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'comment_likes';

-- Step 8: Sample comments data to understand current state
SELECT 'SAMPLE COMMENTS DATA:' as info;
SELECT 
    id,
    post_id,
    user_id,
    content,
    parent_comment_id,
    CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='like_count') 
        THEN 'like_count_exists' 
        ELSE 'like_count_missing' 
    END as like_count_status,
    created_at,
    CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='updated_at') 
        THEN 'updated_at_exists' 
        ELSE 'updated_at_missing' 
    END as updated_at_status
FROM comments 
LIMIT 3;

-- Step 9: Count total comments
SELECT 'TOTAL COMMENTS COUNT:' as info;
SELECT COUNT(*) as total_comments FROM comments;

-- Step 10: Check foreign key constraints
SELECT 'FOREIGN KEY CONSTRAINTS ON COMMENTS:' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'comments';

SELECT 'DIAGNOSIS COMPLETE!' as result; 