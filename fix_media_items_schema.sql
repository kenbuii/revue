-- First, update the media_items table schema if needed
DO $$ 
BEGIN
    -- Rename columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'media_items' AND column_name = 'image_url') THEN
        ALTER TABLE media_items RENAME COLUMN image_url TO cover_image_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'media_items' AND column_name = 'creator') THEN
        ALTER TABLE media_items RENAME COLUMN creator TO author;
    END IF;

    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'media_items' AND column_name = 'isbn') THEN
        ALTER TABLE media_items ADD COLUMN isbn TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'media_items' AND column_name = 'average_rating') THEN
        ALTER TABLE media_items ADD COLUMN average_rating FLOAT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'media_items' AND column_name = 'total_ratings') THEN
        ALTER TABLE media_items ADD COLUMN total_ratings INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'media_items' AND column_name = 'popularity_score') THEN
        ALTER TABLE media_items ADD COLUMN popularity_score FLOAT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'media_items' AND column_name = 'external_id') THEN
        ALTER TABLE media_items ADD COLUMN external_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'media_items' AND column_name = 'metadata') THEN
        ALTER TABLE media_items ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Now update the upsert_media_item function to match the new schema
CREATE OR REPLACE FUNCTION public.upsert_media_item(
    p_media_id TEXT,
    p_title TEXT,
    p_media_type TEXT,
    p_year TEXT DEFAULT NULL,
    p_cover_image_url TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_author TEXT DEFAULT NULL,
    p_genre TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'popular',
    p_original_api_id TEXT DEFAULT NULL,
    p_isbn TEXT DEFAULT NULL,
    p_average_rating FLOAT DEFAULT 0,
    p_total_ratings INTEGER DEFAULT 0,
    p_popularity_score FLOAT DEFAULT 0,
    p_external_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_id TEXT;
BEGIN
    -- Insert the media item with the updated schema
    INSERT INTO media_items (
        id,
        title,
        media_type,
        publication_date,
        cover_image_url,
        description,
        author,
        isbn,
        average_rating,
        total_ratings,
        popularity_score,
        external_id,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        p_media_id,
        p_title,
        p_media_type,
        CASE 
            WHEN p_year IS NOT NULL THEN make_date(p_year::integer, 1, 1)
            ELSE NULL
        END,
        p_cover_image_url,
        p_description,
        p_author,
        p_isbn,
        p_average_rating,
        p_total_ratings,
        p_popularity_score,
        p_external_id,
        jsonb_build_object(
            'genre', p_genre,
            'source', p_source,
            'original_api_id', p_original_api_id
        ) || COALESCE(p_metadata, '{}'::jsonb),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        media_type = EXCLUDED.media_type,
        publication_date = EXCLUDED.publication_date,
        cover_image_url = EXCLUDED.cover_image_url,
        description = EXCLUDED.description,
        author = EXCLUDED.author,
        isbn = EXCLUDED.isbn,
        average_rating = EXCLUDED.average_rating,
        total_ratings = EXCLUDED.total_ratings,
        popularity_score = EXCLUDED.popularity_score,
        external_id = EXCLUDED.external_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING id INTO result_id;

    -- Return the media item ID
    RETURN result_id;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error in upsert_media_item: % %', SQLERRM, SQLSTATE;
        RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.upsert_media_item(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, FLOAT, INTEGER, FLOAT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_media_item(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, FLOAT, INTEGER, FLOAT, TEXT, JSONB) TO anon; 