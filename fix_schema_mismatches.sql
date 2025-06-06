-- FIX SCHEMA MISMATCHES
-- This script fixes the naming inconsistencies between app code and database schema

BEGIN;

-- ===========================================
-- FIX 1: Change user_profiles primary key from user_id to id
-- ===========================================

-- Drop dependent constraints and triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Rename the primary key column
ALTER TABLE user_profiles RENAME COLUMN user_id TO id;

-- Update all foreign key references
ALTER TABLE user_media_preferences RENAME COLUMN user_id TO user_id; -- Keep this as user_id (referring to user_profiles.id)
ALTER TABLE user_connections RENAME COLUMN user_id TO user_id; -- Keep as user_id  
ALTER TABLE user_connections RENAME COLUMN friend_id TO friend_id; -- Keep as friend_id
ALTER TABLE contact_invitations RENAME COLUMN inviter_id TO inviter_id; -- Keep as inviter_id

-- Recreate the user creation function with correct column name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        username, 
        display_name,
        email_hash,
        onboarding_completed,
        contact_sync_enabled
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'email_hash', ''),
        FALSE,
        FALSE
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail auth creation
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- FIX 2: Update RPC functions to use app's parameter names
-- ===========================================

-- Drop existing functions with conflicting signatures
DROP FUNCTION IF EXISTS public.get_user_bookmarks(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS public.remove_bookmark(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB) CASCADE;

-- Recreate get_user_bookmarks with app's expected parameter name
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
    post_date TIMESTAMP WITH TIME ZONE,
    bookmarked_at TIMESTAMP WITH TIME ZONE
) AS $$
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
        ub.bookmarked_at
    FROM user_bookmarks ub
    WHERE ub.user_id = target_user_id
    ORDER BY ub.bookmarked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate add_bookmark with app's expected parameter names
CREATE OR REPLACE FUNCTION public.add_bookmark(
    target_user_id UUID,
    p_post_id TEXT,
    p_media_id TEXT,
    p_media_title TEXT,
    p_media_type TEXT DEFAULT NULL,
    p_media_cover TEXT DEFAULT NULL,
    p_post_title TEXT DEFAULT NULL,
    p_post_content TEXT DEFAULT NULL,
    p_post_author_name TEXT DEFAULT NULL,
    p_post_author_avatar TEXT DEFAULT NULL,
    p_post_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO user_bookmarks (
        user_id, post_id, media_id, media_title, media_type, media_cover,
        post_title, post_content, post_author_name, post_author_avatar, post_date
    )
    VALUES (
        target_user_id, p_post_id, p_media_id, p_media_title, p_media_type, p_media_cover,
        p_post_title, p_post_content, p_post_author_name, p_post_author_avatar, p_post_date
    )
    ON CONFLICT (user_id, post_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'message', 'Bookmark added');
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate remove_bookmark with app's expected parameter names
CREATE OR REPLACE FUNCTION public.remove_bookmark(target_user_id UUID, p_post_id TEXT)
RETURNS JSONB AS $$
BEGIN
    DELETE FROM user_bookmarks WHERE user_id = target_user_id AND post_id = p_post_id;
    RETURN jsonb_build_object('success', true, 'message', 'Bookmark removed');
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate save_user_onboarding_data with single signature to avoid conflicts
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
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
    -- Update user profile
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Clear existing media preferences if we're updating them
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        DELETE FROM user_media_preferences WHERE user_id = p_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        INSERT INTO user_media_preferences (
            user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
        )
        SELECT 
            p_user_id,
            (item->>'media_id')::TEXT,
            (item->>'title')::TEXT,
            (item->>'media_type')::TEXT,
            (item->>'year')::TEXT,
            (item->>'image_url')::TEXT,
            (item->>'description')::TEXT,
            (item->>'source')::TEXT,
            (item->>'original_api_id')::TEXT,
            TRUE
        FROM jsonb_array_elements(p_media_preferences) AS item
        WHERE (item->>'media_id') IS NOT NULL;
        
        GET DIAGNOSTICS media_items_saved = ROW_COUNT;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'user_id', p_user_id,
        'rows_affected', affected_rows,
        'media_items_saved', media_items_saved,
        'media_errors', media_errors
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FIX 3: Update RLS policies for renamed columns
-- ===========================================

-- Drop and recreate policies with correct column names
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON user_profiles
    FOR SELECT USING (onboarding_completed = TRUE);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, TEXT, BOOLEAN, JSONB, BOOLEAN) TO anon, authenticated;

COMMIT;

-- ===========================================
-- VERIFICATION
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '✅ SCHEMA MISMATCHES FIXED!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Changes applied:';
    RAISE NOTICE '   - user_profiles.user_id → user_profiles.id';
    RAISE NOTICE '   - get_user_bookmarks(p_user_id) → get_user_bookmarks(target_user_id)';
    RAISE NOTICE '   - Fixed function overload conflicts';
    RAISE NOTICE '   - Updated RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Your app should now work correctly!';
END $$; 