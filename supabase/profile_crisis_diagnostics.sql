-- =======================================
-- Profile Crisis Diagnostics
-- Validate schema mismatch and missing profile analysis
-- =======================================

-- Step 1: Verify user_profiles table structure
SELECT 'USER_PROFILES_TABLE_STRUCTURE' as test;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 2: Check if current user exists in auth vs user_profiles
SELECT 'CURRENT_USER_AUTH_VS_PROFILE_CHECK' as test;
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  up.user_id as profile_user_id,
  up.username,
  up.display_name,
  up.onboarding_completed,
  CASE WHEN up.user_id IS NULL THEN 'MISSING_PROFILE' ELSE 'HAS_PROFILE' END as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e';

-- Step 3: Check all users missing profiles
SELECT 'ALL_MISSING_PROFILES_AUDIT' as test;
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(up.user_id) as users_with_profiles,
  COUNT(*) - COUNT(up.user_id) as missing_profiles
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id;

-- Step 4: Check foreign key dependencies on user_profiles
SELECT 'USER_PROFILES_FK_DEPENDENCIES' as test;
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN (
    SELECT tc2.table_name
    FROM information_schema.table_constraints AS tc2 
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc2.constraint_name
    WHERE tc2.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'user_profiles'
  );

-- Step 5: Check posts table FK constraints
SELECT 'POSTS_TABLE_FK_CONSTRAINTS' as test;
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'posts';

-- Step 6: Check comments table FK constraints
SELECT 'COMMENTS_TABLE_FK_CONSTRAINTS' as test;
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'comments';

-- Step 7: Test if we can create profile record (DRY RUN)
SELECT 'PROFILE_CREATION_TEST' as test;
-- This would be the actual insert (commented for safety):
-- INSERT INTO user_profiles (
--   user_id,
--   username,
--   display_name,
--   bio,
--   onboarding_completed,
--   contact_sync_enabled
-- ) VALUES (
--   'f77ebec9-8628-4d98-81a4-6a8d14a1d88e',
--   'not_kenneth_',
--   'Not Kenneth',
--   '',
--   true,
--   true
-- ) ON CONFLICT (user_id) DO UPDATE SET
--   username = EXCLUDED.username,
--   display_name = EXCLUDED.display_name,
--   onboarding_completed = EXCLUDED.onboarding_completed,
--   updated_at = now();

-- Instead, just validate the data structure
SELECT 
  'f77ebec9-8628-4d98-81a4-6a8d14a1d88e'::uuid as user_id,
  'not_kenneth_' as username,
  'Not Kenneth' as display_name,
  true as onboarding_completed,
  'READY_FOR_INSERT' as status;

-- Step 8: Check current user_media_preferences state
SELECT 'CURRENT_MEDIA_PREFERENCES_STATE' as test;
SELECT 
  user_id,
  media_id,
  title,
  media_type,
  source,
  added_during_onboarding,
  created_at
FROM user_media_preferences 
WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e'
ORDER BY created_at;

-- Step 9: Check posts that should belong to current user
SELECT 'POTENTIAL_ORPHANED_POSTS' as test;
SELECT 
  id,
  user_id,
  title,
  content,
  created_at,
  'WOULD_FAIL_FK_CHECK' as issue
FROM posts 
WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e';

-- Step 10: Check if any RPC functions need user_profiles
SELECT 'RPC_FUNCTIONS_USING_USER_PROFILES' as test;
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%user_profiles%'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

SELECT 'PROFILE_CRISIS_DIAGNOSTICS_COMPLETE!' as result; 