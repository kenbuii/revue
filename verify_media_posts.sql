-- Check if our specific media item exists
SELECT id, title, media_type, created_at 
FROM media_items 
WHERE id = 'book_the_knight_and_the_moth_1749167489711';

-- Show the structure of media_items table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'media_items'
ORDER BY ordinal_position;

-- Show the structure of posts table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;

-- Show the foreign key constraint details
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'posts'
    AND tc.constraint_type = 'FOREIGN KEY';

-- Check for any media items created in the last hour
SELECT id, title, media_type, created_at 
FROM media_items 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC; 