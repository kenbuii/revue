-- CHECK SOURCE COLUMN CONSTRAINT
-- Find out what values are allowed for the source column

-- Check all constraints on user_media_preferences table
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%user_media_preferences%'
   OR constraint_name LIKE '%source%';

-- Also check table constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_media_preferences'
  AND tc.constraint_type = 'CHECK'; 