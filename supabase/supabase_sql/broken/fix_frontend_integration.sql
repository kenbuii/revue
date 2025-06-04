-- FIX FRONTEND INTEGRATION - Match parameter names and return format

-- Drop and recreate get_user_media_preferences with correct parameter name and return format
DROP FUNCTION IF EXISTS public.get_user_media_preferences(UUID);

CREATE OR REPLACE FUNCTION public.get_user_media_preferences(
    p_user_id UUID  -- Frontend expects p_user_id, not target_user_id
)
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
    RAISE NOTICE 'get_user_media_preferences called with p_user_id: %', p_user_id;
    
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
    WHERE ump.user_id = p_user_id
    ORDER BY ump.created_at ASC;
    
    RAISE NOTICE 'Returned % media preferences', (SELECT COUNT(*) FROM user_media_preferences WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_media_preferences(UUID) TO anon;

-- Test the fixed function with your user ID
SELECT 'Frontend Integration Test:' as test_type,
       public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID) as result;

-- Verify we have media data
SELECT 
    'Media Count Check:' as status,
    COUNT(*) as total_items,
    string_agg(title, ', ' ORDER BY created_at) as titles
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Test the exact RPC call your frontend makes
DO $$
DECLARE
    frontend_result JSONB;
BEGIN
    RAISE NOTICE '🧪 Testing exact frontend RPC call...';
    
    -- This simulates your frontend call: callRPC('get_user_media_preferences', { p_user_id: targetUserId })
    SELECT to_jsonb(array_agg(row_to_json(t))) INTO frontend_result
    FROM (
        SELECT * FROM public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID)
    ) t;
    
    RAISE NOTICE '✅ Frontend would receive: %', frontend_result;
END $$; 