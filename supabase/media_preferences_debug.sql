-- =======================================
-- Media Preferences Debug
-- Check why preferences aren't showing up
-- =======================================

-- Step 1: Verify media preferences exist in database
SELECT 'MEDIA_PREFERENCES_DATA_CHECK' as test;
SELECT 
  user_id,
  media_id,
  title,
  media_type,
  year,
  source,
  original_api_id,
  added_during_onboarding,
  created_at,
  status
FROM user_media_preferences 
WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e'
ORDER BY created_at;

-- Step 2: Check if get_user_media_preferences RPC function exists
SELECT 'RPC_FUNCTION_CHECK' as test;
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_user_media_preferences'
  AND routine_type = 'FUNCTION';

-- Step 3: Test the RPC function directly (if it exists)
SELECT 'RPC_FUNCTION_TEST' as test;
-- This would test the RPC function:
-- SELECT get_user_media_preferences('f77ebec9-8628-4d98-81a4-6a8d14a1d88e');

-- For now, just show what the function should return
SELECT 
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
  status,
  created_at
FROM user_media_preferences 
WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e'
ORDER BY created_at;

-- Step 4: Check table structure matches expected format
SELECT 'TABLE_STRUCTURE_CHECK' as test;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_media_preferences'
ORDER BY ordinal_position;

-- Step 5: Test direct PostgREST query format
SELECT 'POSTGREST_QUERY_TEST' as test;
SELECT 
  media_id,
  title,
  media_type,
  year,
  image_url,
  description,
  source
FROM user_media_preferences 
WHERE user_id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e'
ORDER BY created_at;

-- Step 6: Check if there are any constraint issues
SELECT 'CONSTRAINT_CHECK' as test;
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_media_preferences'
  AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK');

SELECT 'MEDIA_PREFERENCES_DEBUG_COMPLETE!' as result; 