-- Fix the source constraint in user_media_preferences table
-- to allow 'nyt_bestsellers' as a valid source value

-- Drop the existing constraint
ALTER TABLE user_media_preferences 
DROP CONSTRAINT IF EXISTS user_media_preferences_source_check;

-- Add the updated constraint that includes 'nyt_bestsellers'
ALTER TABLE user_media_preferences 
ADD CONSTRAINT user_media_preferences_source_check 
CHECK (source IN ('tmdb', 'google_books', 'popular', 'nyt_bestsellers'));

-- Verify the constraint was updated (using the correct column for newer PostgreSQL)
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'user_media_preferences_source_check'; 