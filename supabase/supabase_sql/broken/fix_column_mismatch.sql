-- ============================================================================
-- FIX COLUMN NAME MISMATCH
-- Corrects the user_profiles table structure and foreign key references
-- ============================================================================

-- Step 1: Check current user_profiles table structure
\d user_profiles

-- Step 2: If the table has 'id' instead of 'user_id', we need to fix the schema
-- Option A: Add user_id column that references the id (if id exists)
-- Option B: Fix all references to use 'id' instead of 'user_id'

-- Let's go with Option B: Fix all references to use the correct column name

-- Step 3: Drop existing trigger (it's using wrong column name)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 4: Check what column actually exists in user_profiles
DO $$
DECLARE
    col_exists_id BOOLEAN;
    col_exists_user_id BOOLEAN;
BEGIN
    -- Check if 'id' column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'id'
    ) INTO col_exists_id;
    
    -- Check if 'user_id' column exists  
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'user_id'
    ) INTO col_exists_user_id;
    
    RAISE NOTICE 'user_profiles.id exists: %', col_exists_id;
    RAISE NOTICE 'user_profiles.user_id exists: %', col_exists_user_id;
    
    -- Determine which fix to apply
    IF col_exists_id AND NOT col_exists_user_id THEN
        RAISE NOTICE 'Will create trigger using "id" column';
    ELSIF col_exists_user_id AND NOT col_exists_id THEN
        RAISE NOTICE 'Will create trigger using "user_id" column';
    ELSIF col_exists_id AND col_exists_user_id THEN
        RAISE NOTICE 'Both columns exist, will use "user_id"';
    ELSE
        RAISE NOTICE 'Neither column exists - need to create table properly';
    END IF;
END $$;

-- Step 5: Create corrected trigger that uses the right column name
-- First, let's create a flexible function that works with the existing structure

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    col_name TEXT;
    insert_sql TEXT;
BEGIN
    -- Determine which column exists
    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_profiles' AND column_name = 'user_id'
            ) THEN 'user_id'
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'user_profiles' AND column_name = 'id'
            ) THEN 'id'
            ELSE NULL
        END INTO col_name;
    
    IF col_name IS NULL THEN
        RAISE WARNING 'No suitable primary key column found in user_profiles table';
        RETURN NEW;
    END IF;
    
    RAISE NOTICE 'Using column: % for user_profiles', col_name;
    
    -- Build dynamic SQL based on column structure
    IF col_name = 'user_id' THEN
        INSERT INTO public.user_profiles (
            user_id,
            username,
            display_name,
            email_hash,
            onboarding_completed,
            contact_sync_enabled
        )
        VALUES (
            NEW.id,
            COALESCE(
                NEW.raw_user_meta_data->>'username',
                split_part(NEW.email, '@', 1),
                'user_' || substr(NEW.id::text, 1, 8)
            ),
            COALESCE(
                NEW.raw_user_meta_data->>'display_name',
                NEW.raw_user_meta_data->>'username',
                split_part(NEW.email, '@', 1)
            ),
            encode(digest(NEW.email, 'sha256'), 'hex'),
            FALSE,
            FALSE
        );
    ELSE -- col_name = 'id'
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
            COALESCE(
                NEW.raw_user_meta_data->>'username',
                split_part(NEW.email, '@', 1),
                'user_' || substr(NEW.id::text, 1, 8)
            ),
            COALESCE(
                NEW.raw_user_meta_data->>'display_name',
                NEW.raw_user_meta_data->>'username',
                split_part(NEW.email, '@', 1)
            ),
            encode(digest(NEW.email, 'sha256'), 'hex'),
            FALSE,
            FALSE
        );
    END IF;
    
    RAISE NOTICE 'Created user profile for user: % using column: %', NEW.id, col_name;
    RETURN NEW;
    
EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 8: Fix the find_users_by_email_hash function to use correct column
CREATE OR REPLACE FUNCTION public.find_users_by_email_hash(email_hashes TEXT[])
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    -- Check which column exists and adapt query accordingly
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'user_id'
    ) THEN
        -- Table has user_id column
        RETURN QUERY
        SELECT 
            up.user_id,
            up.username,
            up.display_name,
            up.avatar_url
        FROM user_profiles up
        WHERE up.email_hash = ANY(email_hashes)
        AND up.onboarding_completed = TRUE;
    ELSE
        -- Table has id column, return it as user_id for compatibility
        RETURN QUERY
        SELECT 
            up.id as user_id,
            up.username,
            up.display_name,
            up.avatar_url
        FROM user_profiles up
        WHERE up.email_hash = ANY(email_hashes)
        AND up.onboarding_completed = TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Verify the fixes
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Step 10: Success message
DO $$
BEGIN
    RAISE NOTICE '🔧 Column mismatch fixes applied!';
    RAISE NOTICE '✅ Trigger now uses correct column name';
    RAISE NOTICE '✅ Functions updated to handle both id and user_id columns';
    RAISE NOTICE '🧪 Test with: node test_user_profile_creation.js';
END $$; 