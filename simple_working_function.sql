-- SIMPLE WORKING SOLUTION
-- Create ONE function that works with the current app

CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    p_user_id UUID,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,  
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_media_preferences JSONB DEFAULT '[]'::JSONB,
    p_onboarding_completed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
BEGIN
    -- Just update the profile - keep it simple
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Profile updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 