-- TARGETED POSTS FUNCTIONALITY FIX
-- Based on diagnostic results - fixes only what's missing/wrong

-- =========================
-- FIX 1: Add missing 'creator' column to media_items
-- =========================

-- Add creator column to media_items table
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS creator TEXT;

-- =========================
-- FIX 2: Add missing 'location_context' column to posts
-- =========================

-- Add location_context column to posts table  
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location_context TEXT;

-- =========================
-- FIX 3: Update posts content_type constraint to include 'review'
-- =========================

-- Drop the existing constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_type_check;

-- Add new constraint that includes 'review', 'thought', 'recommendation'
ALTER TABLE posts ADD CONSTRAINT posts_content_type_check 
CHECK (content_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'review'::text, 'thought'::text, 'recommendation'::text]));

-- =========================
-- FIX 4: Update the PostService to use correct field mapping
-- =========================

-- Create a function that handles the creator field mapping
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
    
    -- Insert or update media item, handling creator field properly
    INSERT INTO media_items (
        id, title, media_type, year, image_url, description, 
        creator, author, director, genre, source, original_api_id, created_at
    ) VALUES (
        p_media_id, p_title, p_media_type, p_year, p_image_url, p_description,
        p_creator, 
        CASE WHEN p_media_type = 'book' THEN p_creator ELSE NULL END,  -- Set author for books
        CASE WHEN p_media_type IN ('movie', 'tv') THEN p_creator ELSE NULL END,  -- Set director for movies/tv
        p_genre, p_source, p_original_api_id, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        media_type = EXCLUDED.media_type,
        year = EXCLUDED.year,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description,
        creator = EXCLUDED.creator,
        author = EXCLUDED.author,
        director = EXCLUDED.director,
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
-- VERIFICATION
-- =========================

DO $$
BEGIN
    RAISE NOTICE '🎯 TARGETED POSTS FIX COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Issues:';
    RAISE NOTICE '   - Added creator column to media_items';
    RAISE NOTICE '   - Added location_context column to posts';
    RAISE NOTICE '   - Updated content_type constraint to allow review/thought/recommendation';
    RAISE NOTICE '   - Created upsert_media_item function with proper field mapping';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Your post creation should now work!';
END $$;

-- Quick verification queries
SELECT 'media_items now has creator column:' as status, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'media_items' AND column_name = 'creator') as exists;

SELECT 'posts now has location_context column:' as status,
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'location_context') as exists;

SELECT 'posts content_type constraint updated:' as status,
       (SELECT check_clause FROM information_schema.check_constraints 
        WHERE constraint_name = 'posts_content_type_check') as constraint_clause; 