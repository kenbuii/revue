-- Fix Partial Schema Application
-- This script handles existing objects and only applies what's missing

-- Enable necessary extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure user_profiles table has all required columns
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add email_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'email_hash') THEN
        ALTER TABLE user_profiles ADD COLUMN email_hash TEXT;
        CREATE INDEX IF NOT EXISTS idx_user_profiles_email_hash ON user_profiles(email_hash);
    END IF;
    
    -- Add onboarding_completed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add contact_sync_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'contact_sync_enabled') THEN
        ALTER TABLE user_profiles ADD COLUMN contact_sync_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create user_media_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_media_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    media_id TEXT NOT NULL,
    title TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'book')),
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT NOT NULL CHECK (source IN ('tmdb', 'google_books', 'popular')),
    original_api_id TEXT,
    added_during_onboarding BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, media_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_hash ON user_profiles(email_hash);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_user_id ON user_media_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_preferences_media_type ON user_media_preferences(media_type);

-- **CRITICAL: Fix the user creation trigger**
-- Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the user creation function
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
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'email_hash', encode(digest(NEW.email, 'sha256'), 'hex')),
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

-- Create essential RPC functions if they don't exist

-- Function for saving onboarding data
CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
    target_user_id UUID,
    p_avatar_url TEXT DEFAULT NULL,
    p_contact_sync_enabled BOOLEAN DEFAULT FALSE,
    p_display_name TEXT DEFAULT NULL,
    p_media_preferences JSONB DEFAULT '[]'::JSONB,
    p_onboarding_completed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Update user profile
    UPDATE user_profiles SET
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        contact_sync_enabled = p_contact_sync_enabled,
        onboarding_completed = p_onboarding_completed,
        updated_at = NOW()
    WHERE id = target_user_id;

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
        FROM jsonb_array_elements(p_media_preferences) AS item;
    END IF;

    result := jsonb_build_object(
        'success', true,
        'message', 'User onboarding data saved successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for finding users by email hash
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

-- Function to get user's media preferences
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO anon, authenticated;
GRANT ALL ON user_media_preferences TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO anon, authenticated;

-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_media_preferences ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create basic RLS policies for user_media_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_media_preferences;
CREATE POLICY "Users can view own preferences" ON user_media_preferences
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_media_preferences;
CREATE POLICY "Users can insert own preferences" ON user_media_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_media_preferences;
CREATE POLICY "Users can update own preferences" ON user_media_preferences
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON user_media_preferences;
CREATE POLICY "Users can delete own preferences" ON user_media_preferences
    FOR DELETE USING (auth.uid() = user_id); 