-- COMPREHENSIVE PARAMETER MISMATCH FIX
-- Fixes save_user_onboarding_data and add_bookmark to match frontend calls exactly

-- =========================
-- FIX 1: save_user_onboarding_data
-- =========================

-- Drop any existing versions
DROP FUNCTION IF EXISTS public.save_user_onboarding_data CASCADE;

-- Create with EXACT parameters the frontend sends
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_display_name TEXT DEFAULT NULL,
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
    
    -- Update user profile
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
        
        -- Insert new media preferences
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
                        WHEN source_val = 'nyt_bestsellers' THEN 'google_books'
                        WHEN source_val = 'imdb' THEN 'tmdb'
                        WHEN source_val = 'goodreads' THEN 'google_books'
                        ELSE 'popular'
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

-- =========================
-- FIX 2: add_bookmark (Rich Bookmark Data)
-- =========================

-- Drop any existing versions
DROP FUNCTION IF EXISTS public.add_bookmark CASCADE;

-- Create with EXACT complex parameters the frontend sends
CREATE OR REPLACE FUNCTION public.add_bookmark(
    target_user_id UUID,
    p_post_id TEXT,
    p_media_id TEXT,
    p_media_title TEXT,
    p_media_type TEXT,
    p_media_cover TEXT,
    p_post_title TEXT DEFAULT NULL,
    p_post_content TEXT DEFAULT NULL,
    p_post_author_name TEXT DEFAULT NULL,
    p_post_author_avatar TEXT DEFAULT NULL,
    p_post_date TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    bookmark_id UUID;
    existing_bookmark UUID;
    safe_post_date TIMESTAMPTZ;
BEGIN
    RAISE NOTICE 'add_bookmark called with target_user_id: %, p_post_id: %', target_user_id, p_post_id;
    RAISE NOTICE 'Media: % (%, %)', p_media_title, p_media_type, p_media_id;
    
    -- Convert p_post_date to proper timestamp
    BEGIN
        IF p_post_date IS NOT NULL AND p_post_date != '' THEN
            safe_post_date := p_post_date::TIMESTAMPTZ;
        ELSE
            safe_post_date := NOW();
        END IF;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Invalid date format, using current time: %', p_post_date;
            safe_post_date := NOW();
    END;
    
    -- Check if bookmark already exists
    SELECT id INTO existing_bookmark
    FROM user_bookmarks 
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    IF existing_bookmark IS NOT NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Bookmark already exists',
            'bookmark_id', existing_bookmark,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
    ELSE
        -- Create new rich bookmark
        INSERT INTO user_bookmarks (
            user_id, post_id, media_id, media_title, media_type, media_cover,
            post_title, post_content, post_author_name, post_author_avatar, 
            post_date, created_at
        ) VALUES (
            target_user_id, p_post_id, p_media_id, p_media_title, p_media_type, p_media_cover,
            p_post_title, p_post_content, p_post_author_name, p_post_author_avatar,
            safe_post_date, NOW()
        ) RETURNING id INTO bookmark_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Rich bookmark added successfully',
            'bookmark_id', bookmark_id,
            'target_user_id', target_user_id,
            'post_id', p_post_id,
            'media_title', p_media_title
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'add_bookmark error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FIX 3: remove_bookmark
-- =========================

-- Create remove_bookmark function to match the frontend call
CREATE OR REPLACE FUNCTION public.remove_bookmark(
    target_user_id UUID,
    p_post_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'remove_bookmark called with target_user_id: %, p_post_id: %', target_user_id, p_post_id;
    
    -- Delete the bookmark
    DELETE FROM user_bookmarks 
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Bookmark removed successfully',
            'target_user_id', target_user_id,
            'post_id', p_post_id,
            'deleted_count', deleted_count
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Bookmark not found',
            'target_user_id', target_user_id,
            'post_id', p_post_id,
            'deleted_count', 0
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'remove_bookmark error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- PERMISSIONS
-- =========================

-- Grant permissions for save_user_onboarding_data
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon;

-- Grant permissions for add_bookmark
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Grant permissions for remove_bookmark
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO anon;

-- =========================
-- VERIFICATION
-- =========================

DO $$
BEGIN
    RAISE NOTICE '🎯 COMPREHENSIVE PARAMETER MISMATCH FIX COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Functions:';
    RAISE NOTICE '   - save_user_onboarding_data(p_user_id, p_avatar_url, p_contact_sync_enabled, p_display_name, p_media_preferences, p_onboarding_completed)';
    RAISE NOTICE '   - add_bookmark(target_user_id, p_post_id, p_media_id, p_media_title, p_media_type, p_media_cover, ...)';
    RAISE NOTICE '   - remove_bookmark(target_user_id, p_post_id)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 All functions now match frontend parameter signatures exactly!';
END $$;

-- Verification query
SELECT 
    '✅ Updated Functions:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('save_user_onboarding_data', 'add_bookmark', 'remove_bookmark')
ORDER BY proname; 