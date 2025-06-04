-- DIAGNOSE POSTS FUNCTIONALITY ISSUES
-- Check table structures and constraints

-- =========================
-- 1. CHECK media_items TABLE STRUCTURE
-- =========================

SELECT 'media_items table columns:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'media_items'
ORDER BY ordinal_position;

-- =========================
-- 2. CHECK posts TABLE STRUCTURE  
-- =========================

SELECT 'posts table columns:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'posts'
ORDER BY ordinal_position;

-- =========================
-- 3. CHECK posts TABLE CONSTRAINTS
-- =========================

SELECT 'posts table constraints:' as info;
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'posts';

-- =========================
-- 4. SPECIFIC CHECK FOR content_type_check CONSTRAINT
-- =========================

SELECT 'posts_content_type_check constraint details:' as info;
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%content_type%'
AND constraint_schema = 'public';

-- =========================
-- 5. CHECK IF media_items TABLE EXISTS
-- =========================

SELECT 'Table existence check:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('posts', 'media_items')
ORDER BY table_name;

-- =========================
-- 6. CHECK SAMPLE posts DATA TO UNDERSTAND EXPECTED FORMAT
-- =========================

SELECT 'Sample posts data (if any):' as info;
SELECT 
    id, 
    title, 
    content,
    content_type,
    media_id,
    author_id,
    created_at
FROM posts 
LIMIT 3; 