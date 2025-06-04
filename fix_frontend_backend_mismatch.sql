-- FIX FRONTEND-BACKEND PARAMETER MISMATCH
-- The frontend calls with p_* parameters, but our functions expect different names
-- This script creates functions that match EXACTLY what the frontend sends

-- Drop the incorrectly parameterized function
DROP FUNCTION IF EXISTS public.save_user_onboarding_data;

-- Create save_user_onboarding_data with EXACT parameter names the frontend uses
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_display_name TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_avatar_url TEXT DEFAULT NULL,
    p_media_preferences JSONB DEFAULT '[]'::JSONB,
    p_onboarding_completed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
    media_errors INTEGER := 0;
    media_items_saved INTEGER := 0;
BEGIN
    RAISE NOTICE 'save_user_onboarding_data called with p_user_id: %', p_user_id;
    RAISE NOTICE 'p_media_preferences: %', p_media_preferences;
    
    -- Update user profile using 'id' column (not user_id)
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % rows in user_profiles', affected_rows;

    -- Handle media preferences if provided
    IF p_media_preferences IS NOT NULL AND jsonb_array_length(p_media_preferences) > 0 THEN
        RAISE NOTICE 'Processing % media preferences...', jsonb_array_length(p_media_preferences);
        
        -- Clear existing onboarding media preferences
        DELETE FROM user_media_preferences 
        WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences one by one for better error handling
        DECLARE
            item JSONB;
            media_id_val TEXT;
            title_val TEXT;
            type_val TEXT;
            year_val TEXT;
            image_val TEXT;
            desc_val TEXT;
            source_val TEXT;
            orig_id_val TEXT;
        BEGIN
            FOR item IN SELECT * FROM jsonb_array_elements(p_media_preferences)
            LOOP
                BEGIN
                    -- Extract values with robust field mapping
                    media_id_val := COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT);
                    title_val := (item->>'title')::TEXT;
                    type_val := COALESCE((item->>'type')::TEXT, (item->>'media_type')::TEXT);
                    year_val := (item->>'year')::TEXT;
                    image_val := COALESCE((item->>'image')::TEXT, (item->>'image_url')::TEXT);
                    desc_val := (item->>'description')::TEXT;
                    source_val := (item->>'source')::TEXT;
                    orig_id_val := COALESCE((item->>'originalId')::TEXT, (item->>'original_api_id')::TEXT);
                    
                    -- Map sources to valid constraint values
                    source_val := CASE 
                        WHEN source_val = 'google_books' THEN 'google_books'
                        WHEN source_val = 'tmdb' THEN 'tmdb'
                        WHEN source_val = 'nyt_bestsellers' THEN 'google_books'  -- Map nyt to google_books
                        WHEN source_val = 'imdb' THEN 'tmdb'  -- Map imdb to tmdb
                        WHEN source_val = 'goodreads' THEN 'google_books'  -- Map goodreads to google_books
                        ELSE 'popular'  -- Default fallback
                    END;
                    
                    RAISE NOTICE 'Inserting media: % (%, %)', title_val, type_val, source_val;
                    
                    -- Only insert if we have required fields
                    IF media_id_val IS NOT NULL AND title_val IS NOT NULL THEN
                        INSERT INTO user_media_preferences (
                            user_id, media_id, title, media_type, year, image_url, 
                            description, source, original_api_id, added_during_onboarding, created_at
                        ) VALUES (
                            p_user_id, media_id_val, title_val, type_val, year_val, image_val,
                            desc_val, source_val, orig_id_val, TRUE, NOW()
                        );
                        
                        media_items_saved := media_items_saved + 1;
                        RAISE NOTICE 'Successfully saved media item %', media_items_saved;
                    ELSE
                        RAISE NOTICE 'Skipping invalid media item: media_id=%, title=%', media_id_val, title_val;
                        media_errors := media_errors + 1;
                    END IF;
                    
                EXCEPTION
                    WHEN others THEN
                        RAISE NOTICE 'Error saving media item: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
                        media_errors := media_errors + 1;
                END;
            END LOOP;
        END;
    ELSE
        RAISE NOTICE 'No media preferences to process';
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows,
        'user_id', p_user_id,
        'media_items_saved', media_items_saved,
        'media_errors', media_errors
    );
    
    RAISE NOTICE 'Final result: %', result;
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'save_user_onboarding_data error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', p_user_id,
            'media_items_saved', media_items_saved,
            'media_errors', media_errors
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon;

-- Test query to verify function exists
SELECT 
    'Fixed function:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'save_user_onboarding_data'
ORDER BY proname;

-- Also verify the get function exists with correct parameters
SELECT 
    'Existing function:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'get_user_media_preferences'
ORDER BY proname; 