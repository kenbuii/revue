-- SIMPLE POSTS DIAGNOSTIC - Step by Step
-- Run each section separately to see what exists

-- STEP 1: Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('posts', 'media_items')
ORDER BY table_name;

-- STEP 2: Check media_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'media_items'
ORDER BY ordinal_position;

-- STEP 3: Check posts table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'posts'
ORDER BY ordinal_position;

-- STEP 4: Check posts content_type constraint
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%content_type%'
AND constraint_schema = 'public'; 