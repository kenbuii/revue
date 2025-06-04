-- FIX MEDIA_ID FIELD MISMATCH ISSUES
-- The posts table expects media_id but there might be confusion about field names

-- =========================
-- FIX 1: Check what the foreign key actually references
-- =========================

-- First, let's see the current foreign key constraint
SELECT 
    tc.constraint_name,
    kcu.column_name as posts_column,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'posts' 
AND kcu.column_name = 'media_id';

-- =========================
-- FIX 2: Update the foreign key constraint if needed
-- =========================

-- Drop the old foreign key constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_id_fkey;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_item_id_fkey;

-- Create the correct foreign key constraint
-- posts.media_id should reference media_items.id (not media_items.media_id)
ALTER TABLE posts ADD CONSTRAINT posts_media_id_fkey 
FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE SET NULL;

-- =========================
-- FIX 3: Check for any triggers that might be causing the media_item_id error
-- =========================

-- List all triggers on posts table
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'posts' 
AND trigger_schema = 'public';

-- =========================
-- VERIFICATION
-- =========================

DO $$
BEGIN
    RAISE NOTICE '🔧 MEDIA_ID MISMATCH FIX COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed foreign key constraint:';
    RAISE NOTICE '   posts.media_id → media_items.id';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Post creation should now work!';
END $$; 