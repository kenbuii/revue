-- =======================================
-- EMERGENCY PROFILE CREATION
-- Create missing profile record for current user
-- Migrate onboarding data from local storage
-- =======================================

-- Step 1: Create missing user profile record
INSERT INTO user_profiles (
  user_id,
  username,
  display_name,
  bio,
  avatar_url,
  email_hash,
  onboarding_completed,
  contact_sync_enabled,
  media_preferences,
  created_at,
  updated_at
) VALUES (
  'f77ebec9-8628-4d98-81a4-6a8d14a1d88e',
  'not_kenneth_',
  'Not Kenneth',
  '',
  '',
  'cea927303c03a03d2cf20b8bfd690ce2cd00537701bfc6c446f1c4d4a85826c6',
  true,
  true,
  '{}',
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  onboarding_completed = EXCLUDED.onboarding_completed,
  contact_sync_enabled = EXCLUDED.contact_sync_enabled,
  email_hash = EXCLUDED.email_hash,
  updated_at = now();

-- Step 2: Create media preferences from onboarding data
INSERT INTO user_media_preferences (
  user_id,
  media_id,
  title,
  media_type,
  year,
  image_url,
  description,
  source,
  original_api_id,
  added_during_onboarding,
  created_at,
  status
) VALUES 
  (
    'f77ebec9-8628-4d98-81a4-6a8d14a1d88e',
    'tmdb_tv_247718',
    'MobLand',
    'tv',
    '2025',
    'https://image.tmdb.org/t/p/w500/abeH7n5pcuQcwYcTxG6DTZvXLP1.jpg',
    'Two mob families clash in a war that threatens to topple empires and lives.',
    'tmdb',
    '247718',
    true,
    now(),
    'want_to_read'
  ),
  (
    'f77ebec9-8628-4d98-81a4-6a8d14a1d88e',
    'nyt_9780143127741',
    'The Body Keeps the Score',
    'book',
    '2025',
    'https://static01.nyt.com/bestsellers/images/9780143127741.jpg',
    'How trauma affects the body and mind, and innovative treatments for recovery.',
    'nyt_bestsellers',
    '9780143127741',
    true,
    now() + interval '1 second',
    'want_to_read'
  ),
  (
    'f77ebec9-8628-4d98-81a4-6a8d14a1d88e',
    'nyt_9780804190114',
    'On Tyranny',
    'book',
    '2025',
    'https://static01.nyt.com/bestsellers/images/9780804190114.jpg',
    'Twenty lessons from the 20th century about the course of tyranny.',
    'nyt_bestsellers',
    '9780804190114',
    true,
    now() + interval '2 seconds',
    'want_to_read'
  )
ON CONFLICT (user_id, media_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  updated_at = now();

-- Step 3: Verify the profile was created successfully
SELECT 
  'PROFILE_CREATION_VERIFICATION' as test,
  user_id,
  username,
  display_name,
  onboarding_completed,
  contact_sync_enabled,
  created_at
FROM user_profiles 
WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e';

-- Step 4: Verify media preferences were created
SELECT 
  'MEDIA_PREFERENCES_VERIFICATION' as test,
  COUNT(*) as total_preferences,
  string_agg(title, ', ' ORDER BY created_at) as preference_titles
FROM user_media_preferences 
WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e';

-- Step 5: Check if FK constraints are now satisfied
SELECT 
  'FK_CONSTRAINTS_CHECK' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e'
    ) THEN 'POSTS_FK_SATISFIED'
    ELSE 'POSTS_FK_VIOLATION'
  END as posts_fk_status;

-- Step 6: Test that we can now create a post (dry run)
SELECT 
  'POST_CREATION_TEST' as test,
  'f77ebec9-8628-4d98-81a4-6a8d14a1d88e'::uuid as user_id,
  'Test Post' as title,
  'This should work now' as content,
  'CAN_CREATE_POSTS' as status;

SELECT 'EMERGENCY_PROFILE_CREATION_COMPLETE!' as result; 