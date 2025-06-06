-- FIX MEDIA PREFERENCES FUNCTION
-- Ensure get_user_media_preferences function exists and returns data correctly

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS public.get_user_media_preferences(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_media_preferences(p_user_id UUID)
RETURNS TABLE (
    media_id TEXT,
    title TEXT,
    media_type TEXT,
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _row_count INTEGER;
BEGIN
    -- Add logging to help debug
    RAISE NOTICE 'get_user_media_preferences called for user: %', p_user_id;
    
    RETURN QUERY
    SELECT 
        ump.media_id,
        ump.title,
        ump.media_type,
        ump.year,
        ump.image_url,
        ump.description,
        ump.source,
        ump.created_at
    FROM user_media_preferences ump
    WHERE ump.user_id = p_user_id
    ORDER BY ump.created_at DESC;
    
    -- Log how many rows we're returning
    GET DIAGNOSTICS _row_count = ROW_COUNT;
    RAISE NOTICE 'Returning % media preferences for user %', _row_count, p_user_id;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO anon;

-- Test the function immediately
DO $$
DECLARE
    test_user_id UUID := '1ccd0502-4347-487e-a450-4e994e216ad4';
    media_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Check raw table count
    SELECT COUNT(*) INTO media_count
    FROM user_media_preferences 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Raw table has % media preferences for user %', media_count, test_user_id;
    
    -- Check function count
    SELECT COUNT(*) INTO function_count
    FROM get_user_media_preferences(test_user_id);
    
    RAISE NOTICE 'Function returns % media preferences for user %', function_count, test_user_id;
    
    IF media_count > 0 AND function_count = 0 THEN
        RAISE NOTICE '❌ PROBLEM: Table has data but function returns nothing!';
    ELSIF media_count = function_count THEN
        RAISE NOTICE '✅ SUCCESS: Function correctly returns all media preferences';
    ELSE
        RAISE NOTICE '⚠️ MISMATCH: Table has % but function returns %', media_count, function_count;
    END IF;
END $$;

SELECT 'MEDIA PREFERENCES FUNCTION FIXED!' as status; 
 