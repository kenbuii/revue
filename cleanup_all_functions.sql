-- AGGRESSIVE CLEANUP - Drop ALL possible function variations
-- Run this FIRST, then run schema_comprehensive.sql

-- Drop all possible variations of find_users_by_email_hash
DROP FUNCTION IF EXISTS public.find_users_by_email_hash(TEXT[]);
DROP FUNCTION IF EXISTS public.find_users_by_email_hash(email_hashes TEXT[]);
DROP FUNCTION IF EXISTS public.find_users_by_email_hash(p_email_hashes TEXT[]);
DROP FUNCTION IF EXISTS public.find_users_by_email_hash(hashes TEXT[]);
DROP FUNCTION IF EXISTS public.find_users_by_email_hash(text[]);

-- Drop all possible variations of save_user_onboarding_data
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_username TEXT, p_display_name TEXT, p_avatar_url TEXT, p_onboarding_completed BOOLEAN, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_avatar_url TEXT, p_contact_sync_enabled BOOLEAN, p_display_name TEXT, p_media_preferences JSONB, p_onboarding_completed BOOLEAN);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_display_name TEXT, p_avatar_url TEXT, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB, p_onboarding_completed BOOLEAN);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(target_user_id UUID, p_display_name TEXT, p_avatar_url TEXT, p_onboarding_completed BOOLEAN, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB);
DROP FUNCTION IF EXISTS public.save_user_onboarding_data(p_user_id UUID, p_display_name TEXT, p_avatar_url TEXT, p_contact_sync_enabled BOOLEAN, p_media_preferences JSONB, p_onboarding_completed BOOLEAN);

-- Drop all possible variations of get_user_media_preferences
DROP FUNCTION IF EXISTS public.get_user_media_preferences(UUID);
DROP FUNCTION IF EXISTS public.get_user_media_preferences(target_user_id UUID);
DROP FUNCTION IF EXISTS public.get_user_media_preferences(p_user_id UUID);
DROP FUNCTION IF EXISTS public.get_user_media_preferences(user_id UUID);

-- Drop all possible variations of get_user_bookmarks
DROP FUNCTION IF EXISTS public.get_user_bookmarks(UUID);
DROP FUNCTION IF EXISTS public.get_user_bookmarks(target_user_id UUID);
DROP FUNCTION IF EXISTS public.get_user_bookmarks(p_user_id UUID);
DROP FUNCTION IF EXISTS public.get_user_bookmarks(user_id UUID);

-- Drop all possible variations of add_bookmark
DROP FUNCTION IF EXISTS public.add_bookmark(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.add_bookmark(target_user_id UUID, p_post_id TEXT, p_media_id TEXT, p_media_title TEXT, p_media_type TEXT, p_media_cover TEXT, p_post_title TEXT, p_post_content TEXT, p_post_author_name TEXT, p_post_author_avatar TEXT, p_post_date TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.add_bookmark(p_user_id UUID, p_post_id TEXT, p_media_id TEXT, p_media_title TEXT, p_media_type TEXT, p_media_cover TEXT, p_post_title TEXT, p_post_content TEXT, p_post_author_name TEXT, p_post_author_avatar TEXT, p_post_date TIMESTAMP WITH TIME ZONE);

-- Drop all possible variations of remove_bookmark
DROP FUNCTION IF EXISTS public.remove_bookmark(UUID, TEXT);
DROP FUNCTION IF EXISTS public.remove_bookmark(target_user_id UUID, p_post_id TEXT);
DROP FUNCTION IF EXISTS public.remove_bookmark(p_user_id UUID, p_post_id TEXT);
DROP FUNCTION IF EXISTS public.remove_bookmark(user_id UUID, post_id TEXT);

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Drop handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop any other utility functions that might exist
DROP FUNCTION IF EXISTS update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE '🧹 All function cleanup completed!';
    RAISE NOTICE '✅ Now you can safely run schema_comprehensive.sql';
END $$; 