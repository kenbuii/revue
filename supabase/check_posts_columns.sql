-- Check exact posts table structure
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('is_public', 'visibility') THEN '🔍 VISIBILITY FIELD'
        WHEN column_name IN ('media_id', 'media_item_id') THEN '🔍 MEDIA REFERENCE' 
        WHEN column_name IN ('like_count', 'comment_count') THEN '🔍 COUNT FIELD'
        ELSE ''
    END as field_importance
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position; 