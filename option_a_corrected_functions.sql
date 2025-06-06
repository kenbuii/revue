-- OPTION A: CORRECTED FUNCTIONS FOR ACTUAL DATABASE SCHEMA
-- These functions match the actual table structure we discovered

BEGIN;

-- ===========================================
-- DROP EXISTING FUNCTIONS WITH WRONG COLUMN REFERENCES
-- ===========================================

DROP FUNCTION IF EXISTS public.get_user_media_preferences(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_bookmarks(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) CASCADE;

-- ===========================================
-- CORRECTED FUNCTIONS WITH ACTUAL COLUMN NAMES
-- ===========================================

-- Fix get_user_media_preferences to use actual column names
CREATE OR REPLACE FUNCTION public.get_user_media_preferences(p_user_id UUID)
RETURNS TABLE (
    media_id TEXT,
    title TEXT,          -- Changed from media_title to title
    media_type TEXT,
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ump.media_id,
        ump.title,           -- Actual column name
        ump.media_type,
        ump.year,
        ump.image_url,
        ump.description,
        ump.source,
        ump.created_at
    FROM user_media_preferences ump
    WHERE ump.user_id = p_user_id
    ORDER BY ump.created_at DESC;
END;
$$;

-- Fix get_user_bookmarks to use actual column names  
CREATE OR REPLACE FUNCTION public.get_user_bookmarks(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    post_id TEXT,
    media_id TEXT,
    media_title TEXT,
    media_type TEXT,
    media_cover TEXT,
    post_title TEXT,
    post_content TEXT,
    post_author_name TEXT,
    post_author_avatar TEXT,
    post_date TIMESTAMPTZ,
    bookmarked_at TIMESTAMPTZ    -- Changed from created_at to bookmarked_at
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.post_id,
        ub.media_id,
        ub.media_title,
        ub.media_type,
        ub.media_cover,
        ub.post_title,
        ub.post_content,
        ub.post_author_name,
        ub.post_author_avatar,
        ub.post_date,
        ub.bookmarked_at        -- Actual column name
    FROM user_bookmarks ub
    WHERE ub.user_id = target_user_id
    ORDER BY ub.bookmarked_at DESC;
END;
$$;

-- Fix save_user_onboarding_data to use actual table structure
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT false,
    p_display_name TEXT DEFAULT NULL,
    p_media_preferences JSONB DEFAULT '[]'::jsonb,
    p_onboarding_completed BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INTEGER := 0;
    result JSONB;
BEGIN
    -- Insert or update user_profiles
    INSERT INTO user_profiles (
        user_id,
        username,
        display_name,
        avatar_url,
        onboarding_completed,
        contact_sync_enabled,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        COALESCE(p_display_name, 'user_' || SUBSTRING(p_user_id::text, 1, 8)),
        p_display_name,
        p_avatar_url,
        p_onboarding_completed,
        p_contact_sync_enabled,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        onboarding_completed = COALESCE(EXCLUDED.onboarding_completed, user_profiles.onboarding_completed),
        contact_sync_enabled = COALESCE(EXCLUDED.contact_sync_enabled, user_profiles.contact_sync_enabled),
        updated_at = NOW();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Handle media preferences - insert into user_media_preferences table with correct columns
    IF p_media_preferences IS NOT NULL AND jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing preferences  
        DELETE FROM user_media_preferences WHERE user_id = p_user_id;
        
        -- Insert new preferences using actual column names
        INSERT INTO user_media_preferences (
            user_id, 
            media_id, 
            title,              -- Using 'title' not 'media_title'
            media_type,
            year,
            image_url, 
            description,
            source,
            original_api_id,
            added_during_onboarding,
            created_at
        )
        SELECT 
            p_user_id,
            (pref->>'id')::text,
            (pref->>'title')::text,     -- Maps to 'title' column
            (pref->>'type')::text,
            (pref->>'year')::text,
            (pref->>'image')::text,     -- Assuming this maps to image_url
            (pref->>'description')::text,
            COALESCE((pref->>'source')::text, 'onboarding'),
            (pref->>'id')::text,        -- Store original ID
            true,                       -- Mark as added during onboarding
            NOW()
        FROM jsonb_array_elements(p_media_preferences) AS pref;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows,
        'user_id', p_user_id
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', p_user_id
        );
END;
$$;

-- Add the other functions that were working but might need column fixes
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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bookmark_id UUID;
    result JSONB;
BEGIN
    -- Insert bookmark using actual column names
    INSERT INTO user_bookmarks (
        user_id,
        post_id,
        media_id,
        media_title,
        media_type,
        media_cover,
        post_title,
        post_content,
        post_author_name,
        post_author_avatar,
        post_date,
        bookmarked_at       -- Use actual column name
    ) VALUES (
        target_user_id,
        p_post_id,
        p_media_id,
        p_media_title,
        p_media_type,
        p_media_cover,
        p_post_title,
        p_post_content,
        p_post_author_name,
        p_post_author_avatar,
        CASE WHEN p_post_date IS NOT NULL 
             THEN p_post_date::timestamptz 
             ELSE NULL END,
        NOW()               -- Use actual column name
    )
    RETURNING id INTO bookmark_id;

    result := jsonb_build_object(
        'success', true,
        'bookmark_id', bookmark_id,
        'message', 'Bookmark added successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Bookmark already exists'
        );
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon;

GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

COMMIT;

-- Verification
SELECT 'CORRECTED FUNCTIONS CREATED SUCCESSFULLY!' as status;
SELECT 
    routine_name as function_name,
    'Updated to use actual column names' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_media_preferences',
    'get_user_bookmarks', 
    'save_user_onboarding_data',
    'add_bookmark'
)
ORDER BY routine_name; 