-- FIX REMOVE_BOOKMARK CONFLICT
-- Drop all conflicting remove_bookmark functions and create single canonical version

-- STEP 1: Nuclear cleanup of all remove_bookmark functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '🧹 Starting cleanup of all remove_bookmark functions...';
    
    -- Find and drop ALL functions named remove_bookmark
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'remove_bookmark'
    LOOP
        RAISE NOTICE 'Dropping function: % with args: %', func_record.proname, func_record.args;
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    RAISE NOTICE '✅ All conflicting remove_bookmark functions dropped!';
END $$;

-- STEP 2: Create single canonical remove_bookmark function
CREATE OR REPLACE FUNCTION public.remove_bookmark(
    target_user_id UUID,
    p_post_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'remove_bookmark called with target_user_id: %, p_post_id: %', target_user_id, p_post_id;
    
    -- Delete the bookmark
    DELETE FROM bookmarks 
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Bookmark removed successfully',
            'deleted_count', deleted_count,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Bookmark not found',
            'deleted_count', 0,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'remove_bookmark error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, UUID) TO anon;

-- STEP 4: Final verification
DO $$
BEGIN
    RAISE NOTICE '🎯 REMOVE_BOOKMARK CONFLICT FIXED! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Single canonical function created:';
    RAISE NOTICE '   - remove_bookmark(target_user_id UUID, p_post_id UUID)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test this function now!';
END $$;

-- Verification query
SELECT 
    'remove_bookmark functions:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'remove_bookmark'
ORDER BY proname; 