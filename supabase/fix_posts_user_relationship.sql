-- =======================================
-- FIX POSTS-USER_PROFILES RELATIONSHIP
-- Adds missing foreign key constraint to enable PostgREST joins
-- =======================================

-- Step 1: Check for orphaned posts (posts without corresponding user_profiles)
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM posts p
    LEFT JOIN user_profiles up ON p.user_id = up.user_id
    WHERE up.user_id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE WARNING 'Found % posts without corresponding user_profiles. These need to be fixed before adding FK constraint.', orphaned_count;
        
        -- Log the orphaned post IDs for investigation
        RAISE NOTICE 'Orphaned post user_ids: %', (
            SELECT string_agg(DISTINCT p.user_id::text, ', ')
            FROM posts p
            LEFT JOIN user_profiles up ON p.user_id = up.user_id
            WHERE up.user_id IS NULL
        );
    ELSE
        RAISE NOTICE 'All posts have corresponding user_profiles. Safe to add FK constraint.';
    END IF;
END $$;

-- Step 2: Create any missing user_profiles for posts (safety measure)
INSERT INTO user_profiles (user_id, username, display_name, onboarding_completed)
SELECT DISTINCT 
    p.user_id,
    'user_' || substr(p.user_id::text, 1, 8) as username,
    'User ' || substr(p.user_id::text, 1, 8) as display_name,
    false as onboarding_completed
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Add the foreign key constraint
ALTER TABLE posts 
ADD CONSTRAINT posts_user_profile_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- Step 5: Test the new relationship with a sample query
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    -- This should now work without errors
    SELECT COUNT(*) INTO test_count
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.user_id
    WHERE up.onboarding_completed = true;
    
    RAISE NOTICE 'Test query successful: Found % posts from onboarded users', test_count;
END $$;

SELECT 'Foreign key constraint added successfully!' as result; 