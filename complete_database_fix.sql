-- COMPLETE DATABASE FIX
-- This script fixes all PGRST202 errors and missing user profile issues

BEGIN;

-- ===========================================
-- PART 0: DROP ALL EXISTING CONFLICTING FUNCTIONS
-- ===========================================

-- Drop all existing functions that might have wrong signatures
DROP FUNCTION IF EXISTS public.get_user_bookmarks(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_media_preferences(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(uuid, text, text, text, boolean, boolean, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(uuid, text, boolean, text, jsonb, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.add_bookmark(uuid, text, text, text, text, text, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.remove_bookmark(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.find_users_by_email_hash(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ===========================================
-- PART 1: FIX FUNCTION PARAMETER MISMATCHES
-- ===========================================

-- Fix get_user_bookmarks to accept target_user_id parameter
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
    post_date TEXT,
    created_at TIMESTAMPTZ
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
        ub.created_at
    FROM user_bookmarks ub
    WHERE ub.user_id = target_user_id
    ORDER BY ub.created_at DESC;
END;
$$;

-- Create the correct save_user_onboarding_data function that matches app calls
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

    -- Handle media preferences if provided
    IF p_media_preferences IS NOT NULL AND jsonb_array_length(p_media_preferences) > 0 THEN
        -- Clear existing preferences
        DELETE FROM user_media_preferences WHERE user_id = p_user_id;
        
        -- Insert new preferences
        INSERT INTO user_media_preferences (user_id, media_id, media_title, media_type, preference_score, created_at)
        SELECT 
            p_user_id,
            (pref->>'id')::text,
            (pref->>'title')::text,
            (pref->>'type')::text,
            5.0, -- Default preference score
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

-- Create add_bookmark function that matches app calls
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
    -- Insert bookmark
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
        created_at
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
        p_post_date,
        NOW()
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

-- Create remove_bookmark function
CREATE OR REPLACE FUNCTION public.remove_bookmark(
    target_user_id UUID,
    p_media_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    result JSONB;
BEGIN
    DELETE FROM user_bookmarks 
    WHERE user_id = target_user_id AND media_id = p_media_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', 'Bookmark removed successfully'
    );
    
    RETURN result;
END;
$$;

-- ===========================================
-- PART 2: CREATE MISSING CORE FUNCTIONS
-- ===========================================

-- Create get_user_media_preferences function
CREATE OR REPLACE FUNCTION public.get_user_media_preferences(p_user_id UUID)
RETURNS TABLE (
    media_id TEXT,
    media_title TEXT,
    media_type TEXT,
    preference_score DECIMAL,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ump.media_id,
        ump.media_title,
        ump.media_type,
        ump.preference_score,
        ump.created_at
    FROM user_media_preferences ump
    WHERE ump.user_id = p_user_id
    ORDER BY ump.created_at DESC;
END;
$$;

-- Create find_users_by_email_hash function
CREATE OR REPLACE FUNCTION public.find_users_by_email_hash(p_email_hash TEXT)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.username,
        up.display_name,
        up.avatar_url
    FROM user_profiles up
    WHERE up.email_hash = p_email_hash
    ORDER BY up.created_at DESC;
END;
$$;

-- ===========================================
-- PART 3: CREATE USER PROFILE TRIGGER
-- ===========================================

-- Create handle_new_user function for auth trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
        false,
        false,
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- PART 4: GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon;

GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

COMMIT;

-- ===========================================
-- VERIFICATION
-- ===========================================

SELECT 'Database functions fixed successfully!' as status;

-- Show created functions
SELECT 
    'Functions created:' as info,
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_bookmarks',
    'save_user_onboarding_data', 
    'add_bookmark',
    'remove_bookmark',
    'get_user_media_preferences',
    'find_users_by_email_hash',
    'handle_new_user'
)
ORDER BY routine_name; 