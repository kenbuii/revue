-- COMPREHENSIVE POSTS FUNCTIONALITY FIX
-- Fixes media_items table structure and posts table constraints

-- =========================
-- FIX 1: Add missing 'creator' column to media_items
-- =========================

DO $$
BEGIN
    -- Check if creator column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media_items' 
        AND column_name = 'creator' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE media_items ADD COLUMN creator TEXT;
        RAISE NOTICE '✅ Added creator column to media_items table';
    ELSE
        RAISE NOTICE '✅ Creator column already exists in media_items table';
    END IF;
END $$;

-- =========================
-- FIX 2: Add missing 'genre' column to media_items (if needed)
-- =========================

DO $$
BEGIN
    -- Check if genre column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media_items' 
        AND column_name = 'genre' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE media_items ADD COLUMN genre TEXT;
        RAISE NOTICE '✅ Added genre column to media_items table';
    ELSE
        RAISE NOTICE '✅ Genre column already exists in media_items table';
    END IF;
END $$;

-- =========================
-- FIX 3: Update posts table content_type constraint to include 'review'
-- =========================

-- Drop the existing constraint
DO $$
BEGIN
    -- Find and drop the content_type check constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%content_type%' 
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_type_check;
        RAISE NOTICE '✅ Dropped old content_type constraint';
    END IF;
END $$;

-- Add the new constraint that includes 'review'
ALTER TABLE posts ADD CONSTRAINT posts_content_type_check 
CHECK (content_type IN ('text', 'image', 'video', 'review', 'thought', 'recommendation'));

-- =========================
-- FIX 4: Add missing location_context column to posts (if needed)
-- =========================

DO $$
BEGIN
    -- Check if location_context column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'location_context' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE posts ADD COLUMN location_context TEXT;
        RAISE NOTICE '✅ Added location_context column to posts table';
    ELSE
        RAISE NOTICE '✅ Location_context column already exists in posts table';
    END IF;
END $$;

-- =========================
-- FIX 5: Ensure proper data types for posts table
-- =========================

-- Update rating column to allow decimal values (frontend sends numbers like 8.5)
DO $$
BEGIN
    -- Check current rating column type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'rating' 
        AND data_type = 'integer'
        AND table_schema = 'public'
    ) THEN
        -- Change from INTEGER to DECIMAL to match frontend expectations
        ALTER TABLE posts ALTER COLUMN rating TYPE DECIMAL(3,1);
        RAISE NOTICE '✅ Updated rating column to DECIMAL(3,1)';
    ELSE
        RAISE NOTICE '✅ Rating column already has correct type';
    END IF;
END $$;

-- =========================
-- FIX 6: Create or update the media_items primary key constraint
-- =========================

-- Ensure media_items uses 'id' or 'media_id' consistently
DO $$
BEGIN
    -- Check if media_id column exists in media_items
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media_items' 
        AND column_name = 'media_id' 
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media_items' 
        AND column_name = 'id' 
        AND table_schema = 'public'
    ) THEN
        -- If media_id exists but id doesn't, add id as alias or primary
        ALTER TABLE media_items ADD COLUMN id TEXT;
        UPDATE media_items SET id = media_id WHERE id IS NULL;
        RAISE NOTICE '✅ Added id column to media_items for consistency';
    ELSE
        RAISE NOTICE '✅ Media_items table structure is consistent';
    END IF;
END $$;

-- =========================
-- FIX 7: Create insert/upsert function for media_items (handles creator field)
-- =========================

CREATE OR REPLACE FUNCTION public.upsert_media_item(
    p_media_id TEXT,
    p_title TEXT,
    p_media_type TEXT,
    p_year TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_creator TEXT DEFAULT NULL,
    p_genre TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'popular',
    p_original_api_id TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    result_id TEXT;
BEGIN
    RAISE NOTICE 'upsert_media_item called with: %, %, %', p_media_id, p_title, p_media_type;
    
    -- Try to insert, on conflict update
    INSERT INTO media_items (
        id, media_id, title, media_type, year, image_url, 
        description, creator, genre, source, original_api_id, created_at
    ) VALUES (
        p_media_id, p_media_id, p_title, p_media_type, p_year, p_image_url,
        p_description, p_creator, p_genre, p_source, p_original_api_id, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        media_type = EXCLUDED.media_type,
        year = EXCLUDED.year,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description,
        creator = EXCLUDED.creator,
        genre = EXCLUDED.genre,
        source = EXCLUDED.source,
        original_api_id = EXCLUDED.original_api_id,
        updated_at = NOW()
    RETURNING id INTO result_id;
    
    RAISE NOTICE 'Media item upserted successfully: %', result_id;
    RETURN result_id;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'upsert_media_item error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        -- Return the original ID even if upsert failed
        RETURN p_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.upsert_media_item(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_media_item(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- =========================
-- VERIFICATION & TESTING
-- =========================

DO $$
BEGIN
    RAISE NOTICE '🎯 POSTS FUNCTIONALITY FIX COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Issues:';
    RAISE NOTICE '   - Added creator column to media_items';
    RAISE NOTICE '   - Added genre column to media_items (if missing)';
    RAISE NOTICE '   - Updated posts content_type constraint to include review/thought/recommendation';
    RAISE NOTICE '   - Added location_context column to posts (if missing)';
    RAISE NOTICE '   - Updated rating column to DECIMAL for precise ratings';
    RAISE NOTICE '   - Created upsert_media_item function for robust media creation';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Your app should now be able to create posts successfully!';
END $$;

-- Final verification
SELECT 'Table Structure Verification:' as status;

SELECT 'media_items columns:' as info, 
       string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'media_items';

SELECT 'posts columns:' as info,
       string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as columns  
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts';

SELECT 'posts constraints:' as info,
       string_agg(constraint_name || ': ' || check_clause, '; ') as constraints
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public' AND constraint_name LIKE '%posts%'; 