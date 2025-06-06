-- =======================================
-- Fix Media Type Mapping in RPC Function
-- Handle 'tv' → 'tv_show' constraint issue
-- =======================================

-- First, check current constraint to understand what's allowed
SELECT 'CURRENT_MEDIA_TYPE_CONSTRAINT' as check_type;
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE table_name = 'media_items' 
  AND constraint_name LIKE '%media_type%';

-- Check existing media types in both tables
SELECT 'EXISTING_MEDIA_TYPES_IN_MEDIA_ITEMS' as check_type;
SELECT DISTINCT media_type, COUNT(*) as count
FROM media_items 
GROUP BY media_type
ORDER BY media_type;

SELECT 'EXISTING_MEDIA_TYPES_IN_USER_PREFERENCES' as check_type;
SELECT DISTINCT media_type, COUNT(*) as count
FROM user_media_preferences 
GROUP BY media_type
ORDER BY media_type;

-- Update the ensure_media_item_exists function with type mapping
CREATE OR REPLACE FUNCTION ensure_media_item_exists(
    p_media_id TEXT,
    p_title TEXT,
    p_media_type TEXT,
    p_author TEXT,
    p_description TEXT,
    p_cover_image_url TEXT,
    p_external_id TEXT,
    p_metadata JSONB
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    mapped_media_type TEXT;
    existing_media_id TEXT;
BEGIN
    -- FIXED: Map frontend media types to database schema types
    mapped_media_type := CASE 
        WHEN p_media_type = 'tv' THEN 'tv_show'
        WHEN p_media_type = 'movie' THEN 'movie'
        WHEN p_media_type = 'book' THEN 'book'
        WHEN p_media_type = 'podcast' THEN 'podcast'
        WHEN p_media_type = 'audiobook' THEN 'audiobook'
        ELSE p_media_type  -- Pass through any other types
    END;
    
    -- Check if media item already exists
    SELECT id INTO existing_media_id
    FROM media_items
    WHERE id = p_media_id;
    
    -- If exists, return the existing ID
    IF existing_media_id IS NOT NULL THEN
        RETURN existing_media_id;
    END IF;
    
    -- If doesn't exist, create new media item with mapped type
    INSERT INTO media_items (
        id,
        title,
        media_type,
        author,
        description,
        cover_image_url,
        external_id,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        p_media_id,
        p_title,
        mapped_media_type,  -- Use mapped type instead of original
        COALESCE(p_author, ''),
        COALESCE(p_description, ''),
        COALESCE(p_cover_image_url, ''),
        p_external_id,
        COALESCE(p_metadata, '{}'),
        now(),
        now()
    );
    
    -- Return the media ID
    RETURN p_media_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error details for debugging
        RAISE NOTICE 'Error in ensure_media_item_exists: %, Original type: %, Mapped type: %', 
                     SQLERRM, p_media_type, mapped_media_type;
        -- Re-raise the error
        RAISE;
END;
$$;

-- Test the function with the problematic data
SELECT 'TESTING_TV_TYPE_MAPPING' as test_type;
SELECT ensure_media_item_exists(
    'test_tv_mapping',
    'Test TV Show',
    'tv',  -- This should be mapped to 'tv_show'
    'Test Creator',
    'Test description',
    'https://example.com/image.jpg',
    'test123',
    '{}'::jsonb
) as result;

-- Verify the mapped type was stored correctly
SELECT 'VERIFICATION_OF_MAPPED_TYPE' as test_type;
SELECT 
    id,
    title,
    media_type,
    author
FROM media_items 
WHERE id = 'test_tv_mapping';

-- Clean up test data
DELETE FROM media_items WHERE id = 'test_tv_mapping';

SELECT 'MEDIA_TYPE_MAPPING_FIX_COMPLETE!' as result; 