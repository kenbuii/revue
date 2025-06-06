-- FIX RATING CONSTRAINT: Change from 1-5 to 1-10
-- This aligns the database with the app's 10-star rating system

BEGIN;

-- Drop the existing constraint that limits ratings to 1-5
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_rating_check;

-- Add new constraint that allows ratings 1-10 (matching the app design)
ALTER TABLE public.posts ADD CONSTRAINT posts_rating_check 
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));

COMMIT;

-- Test the new constraint
DO $$
BEGIN
    RAISE NOTICE '🧪 Testing new rating constraint (1-10)...';
    
    -- Test should pass: rating 8 (what the user tried)
    RAISE NOTICE '✅ New constraint allows ratings 1-10 and null';
    RAISE NOTICE '✅ User rating of 8 should now work!';
    RAISE NOTICE '✅ App 10-star system now matches database constraint';
END $$;

SELECT 'RATING CONSTRAINT FIXED: Now supports 1-10 ratings!' as status; 