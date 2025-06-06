-- CREATE MISSING USER PROFILE
-- This script creates a user profile for any authenticated user that doesn't have one

-- Function to create profile for current user
CREATE OR REPLACE FUNCTION public.create_profile_for_current_user()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_profile_count INTEGER;
    result JSONB;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No authenticated user found'
        );
    END IF;
    
    -- Check if profile already exists
    SELECT COUNT(*) INTO existing_profile_count
    FROM user_profiles 
    WHERE user_id = current_user_id;
    
    IF existing_profile_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Profile already exists',
            'user_id', current_user_id,
            'action', 'none'
        );
    END IF;
    
    -- Create profile for current user
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
        current_user_id,
        'user_' || SUBSTRING(current_user_id::text, 1, 8),
        'User',
        NULL,
        false,
        false,
        NOW(),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile created successfully',
        'user_id', current_user_id,
        'action', 'created'
    );
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'user_id', current_user_id
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_profile_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_for_current_user() TO anon;

-- Test the function
SELECT public.create_profile_for_current_user() as result; 