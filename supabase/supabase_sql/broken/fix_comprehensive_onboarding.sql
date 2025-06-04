-- COMPREHENSIVE ONBOARDING FIX - Handle ALL source values

-- Drop and recreate save_user_onboarding_data with better source mapping
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_avatar_url TEXT,
    p_contact_sync_enabled BOOLEAN,
    p_display_name TEXT,
    p_media_preferences JSONB,
    p_onboarding_completed BOOLEAN,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
    item JSONB;
    mapped_source TEXT;
    insert_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'save_user_onboarding_data called with p_user_id: %', p_user_id;
    RAISE NOTICE 'Media preferences count: %', COALESCE(jsonb_array_length(p_media_preferences), 0);
    
    -- Handle NULL values gracefully
    IF p_media_preferences IS NULL THEN
        p_media_preferences := '[]'::JSONB;
    END IF;
    
    -- UPSERT user profile
    INSERT INTO user_profiles (
        id,
        display_name,
        avatar_url,
        contact_sync_enabled,
        onboarding_completed,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_display_name,
        p_avatar_url,
        COALESCE(p_contact_sync_enabled, FALSE),
        COALESCE(p_onboarding_completed, FALSE),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        contact_sync_enabled = EXCLUDED.contact_sync_enabled,
        onboarding_completed = EXCLUDED.onboarding_completed,
        updated_at = NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Upserted % rows in user_profiles', affected_rows;

    -- Handle media preferences if provided
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Process each media item individually
        FOR item IN SELECT * FROM jsonb_array_elements(p_media_preferences)
        LOOP
            BEGIN
                -- Enhanced source mapping
                mapped_source := CASE 
                    WHEN (item->>'source')::TEXT = 'nyt_bestsellers' THEN 'google_books'
                    WHEN (item->>'source')::TEXT = 'tmdb' THEN 'tmdb'
                    WHEN (item->>'source')::TEXT = 'google_books' THEN 'google_books'
                    WHEN (item->>'source')::TEXT = 'popular' THEN 'popular'
                    WHEN (item->>'source')::TEXT = 'imdb' THEN 'tmdb'  -- Map IMDB to TMDB
                    WHEN (item->>'source')::TEXT = 'goodreads' THEN 'google_books'  -- Map Goodreads to Google Books
                    WHEN (item->>'source')::TEXT IS NULL THEN 'popular'  -- Default for null
                    ELSE 'popular'  -- Default fallback for any unknown source
                END;
                
                RAISE NOTICE 'Processing item: % with source: % -> %', (item->>'title'), (item->>'source'), mapped_source;
                
                INSERT INTO user_media_preferences (
                    user_id, 
                    media_id, 
                    title, 
                    media_type, 
                    year, 
                    image_url, 
                    description, 
                    source, 
                    original_api_id, 
                    added_during_onboarding
                ) VALUES (
                    p_user_id,
                    COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT),
                    (item->>'title')::TEXT,
                    COALESCE((item->>'type')::TEXT, (item->>'media_type')::TEXT),
                    (item->>'year')::TEXT,
                    COALESCE((item->>'image')::TEXT, (item->>'image_url')::TEXT),
                    (item->>'description')::TEXT,
                    mapped_source,
                    COALESCE((item->>'originalId')::TEXT, (item->>'original_api_id')::TEXT),
                    TRUE
                );
                
                insert_count := insert_count + 1;
                
            EXCEPTION
                WHEN others THEN
                    error_count := error_count + 1;
                    RAISE NOTICE 'Failed to insert media item: % - Error: %', (item->>'title'), SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Media processing complete: % successful, % errors', insert_count, error_count;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows,
        'media_items_saved', insert_count,
        'media_errors', error_count,
        'user_id', p_user_id
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'save_user_onboarding_data error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', p_user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, UUID) TO anon;

-- Test with a sample of your real data
DO $$
DECLARE
    test_result JSONB;
BEGIN
    RAISE NOTICE '🧪 Testing enhanced function with multiple sources...';
    
    SELECT public.save_user_onboarding_data(
        NULL::TEXT,
        FALSE::BOOLEAN,
        'Test Guy'::TEXT,
        '[
            {"id":"tmdb_tv_291256","title":"Sara - Woman in the Shadows","type":"tv","source":"tmdb","year":"2025"},
            {"id":"nyt_9780593441299","title":"Great Big Beautiful Life","type":"book","source":"nyt_bestsellers","year":"2025"},
            {"id":"tmdb_movie_1233413","title":"Sinners","type":"movie","source":"tmdb","year":"2025"}
        ]'::JSONB,
        TRUE::BOOLEAN,
        '670e0647-bfcb-4322-aa76-059452af9e01'::UUID
    ) INTO test_result;
    
    RAISE NOTICE '✅ Enhanced test result: %', test_result;
END $$; 