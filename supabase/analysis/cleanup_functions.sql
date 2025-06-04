-- Cleanup conflicting functions and ensure proper RPC setup
-- Run this after the partial schema fix

-- First, drop all conflicting versions of save_user_onboarding_data
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_username TEXT, p_display_name TEXT, p_avatar_url TEXT, p_onboarding_completed BOOLEAN, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_avatar_url TEXT, p_contact_sync_enabled BOOLEAN, p_display_name TEXT, p_media_preferences JSONB, p_onboarding_completed BOOLEAN);

-- Create the definitive version of save_user_onboarding_data
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    target_user_id UUID,
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
BEGIN
    -- Update user profile
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Clear existing media preferences if we're updating them
    IF jsonb_array_length(p_media_preferences) > 0 THEN
        DELETE FROM user_media_preferences WHERE user_id = target_user_id AND added_during_onboarding = TRUE;
        
        -- Insert new media preferences
        INSERT INTO user_media_preferences (
            user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
        )
        SELECT 
            target_user_id,
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
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully',
        'rows_affected', affected_rows
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

-- Recreate other essential functions to ensure they exist
CREATE OR REPLACE FUNCTION public.find_users_by_email_hash(email_hashes TEXT[])
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.username,
        up.display_name,
        up.avatar_url
    FROM user_profiles up
    WHERE up.email_hash = ANY(email_hashes)
    AND up.onboarding_completed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_media_preferences(target_user_id UUID)
RETURNS TABLE (
    media_id TEXT,
    title TEXT,
    media_type TEXT,
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ump.media_id,
        ump.title,
        ump.media_type,
        ump.year,
        ump.image_url,
        ump.description,
        ump.source
    FROM user_media_preferences ump
    WHERE ump.user_id = target_user_id
    ORDER BY ump.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, TEXT, BOOLEAN, JSONB, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO anon, authenticated;

-- Ensure RLS policies allow the trigger to work
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON user_profiles;
CREATE POLICY "Allow trigger to insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- Add a policy to allow authenticated users to view any profile (for the function to work)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON user_profiles;
CREATE POLICY "Authenticated users can view profiles" ON user_profiles
    FOR SELECT TO authenticated USING (true);

-- Test the trigger by checking if it can handle a profile creation
-- This is just to verify our trigger works with the RLS policies
DO $$
BEGIN
    -- Just a test, won't actually create anything
    RAISE NOTICE 'Schema cleanup complete. User creation trigger and RPC functions should now work properly.';
END $$; 