-- =======================================
-- PHASE 4: ENSURE USER PROFILE EXISTS FUNCTION
-- RPC function to validate and create user profiles as needed
-- =======================================

CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_exists BOOLEAN;
    user_email TEXT;
    user_metadata JSONB;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(
        SELECT 1 FROM user_profiles WHERE user_id = p_user_id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN jsonb_build_object(
            'success', true, 
            'profile_existed', true,
            'message', 'Profile already exists'
        );
    END IF;
    
    -- Profile doesn't exist, get user data from auth.users to create it
    SELECT email, raw_user_meta_data INTO user_email, user_metadata
    FROM auth.users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found in auth.users table'
        );
    END IF;
    
    -- Create missing profile with data from auth.users
    INSERT INTO user_profiles (
        user_id,
        username,
        display_name,
        email_hash,
        onboarding_completed,
        contact_sync_enabled,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        COALESCE(
            user_metadata->>'username',
            split_part(user_email, '@', 1),
            'user_' || substr(p_user_id::text, 1, 8)
        ),
        COALESCE(
            user_metadata->>'display_name',
            user_metadata->>'username',
            split_part(user_email, '@', 1),
            'User ' || substr(p_user_id::text, 1, 8)
        ),
        encode(digest(LOWER(user_email), 'sha256'), 'hex'),
        FALSE,
        FALSE,
        NOW(),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'profile_existed', false,
        'message', 'Profile created successfully',
        'created_username', COALESCE(
            user_metadata->>'username',
            split_part(user_email, '@', 1),
            'user_' || substr(p_user_id::text, 1, 8)
        )
    );
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_exists(UUID) TO anon, authenticated;

-- Test the function
SELECT 'ensure_user_profile_exists function created successfully!' as result; 