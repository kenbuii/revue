-- =======================================
-- PHASE 1A: Comments System Diagnosis
-- Identify why comments are failing
-- =======================================

-- Step 1: Check if create_comment RPC function exists
SELECT 'CREATE_COMMENT_FUNCTION_EXISTS' as test;
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_name = 'create_comment';

-- Step 2: Check comments table structure
SELECT 'COMMENTS_TABLE_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comments'
ORDER BY ordinal_position;

-- Step 3: Check if comments table has data and constraints
SELECT 'COMMENTS_TABLE_STATUS' as test;
SELECT 
    COUNT(*) as total_comments,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_comments
FROM comments;

-- Step 4: Test create_comment RPC function with sample data
SELECT 'CREATE_COMMENT_RPC_TEST' as test;
SELECT create_comment(
    'b6908586-7f80-4de3-8e83-f7c3180efd21'::UUID,
    'Test diagnostic comment',
    NULL
) as rpc_result;

-- Step 5: Check foreign key constraints on comments table
SELECT 'COMMENTS_CONSTRAINTS' as test;
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

-- Step 6: Check if the specific post exists that was being commented on
SELECT 'TARGET_POST_EXISTS' as test;
SELECT 
    id,
    title,
    user_id,
    created_at
FROM posts 
WHERE id = 'b6908586-7f80-4de3-8e83-f7c3180efd21';

-- Step 7: Check current user authentication context
SELECT 'AUTH_CONTEXT_CHECK' as test;
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    CASE WHEN auth.uid() IS NOT NULL THEN 'AUTHENTICATED' ELSE 'NOT_AUTHENTICATED' END as auth_status;

SELECT 'COMMENTS_DIAGNOSIS_COMPLETE!' as result; 