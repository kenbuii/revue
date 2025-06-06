-- Drop and recreate the upsert_media_item function with proper error handling
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
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_id TEXT;
BEGIN
    -- Insert the media item directly into the media_items table
    INSERT INTO media_items (
        id,
        title,
        media_type,
        year,
        image_url,
        description,
        creator,
        genre,
        source,
        original_api_id,
        created_at,
        updated_at
    ) VALUES (
        p_media_id,
        p_title,
        p_media_type,
        p_year,
        p_image_url,
        p_description,
        p_creator,
        p_genre,
        p_source,
        p_original_api_id,
        NOW(),
        NOW()
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

    -- Return the media item ID
    RETURN result_id;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error in upsert_media_item: % %', SQLERRM, SQLSTATE;
        RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.upsert_media_item(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_media_item(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon; 