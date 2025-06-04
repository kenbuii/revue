-- FIX REMOVE_BOOKMARK FUNCTION OVERLOADING CONFLICT
-- Drop all versions and create one canonical version

-- =========================
-- FIX 1: Drop ALL versions of remove_bookmark function
-- =========================

-- Nuclear approach - drop all remove_bookmark functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE 'Dropping all remove_bookmark functions...';
    
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
    
    RAISE NOTICE '✅ All remove_bookmark functions dropped!';
END $$;

-- =========================
-- FIX 2: Create ONE canonical remove_bookmark function
-- =========================

CREATE OR REPLACE FUNCTION public.remove_bookmark(
    target_user_id UUID,
    p_post_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'remove_bookmark called with target_user_id: %, p_post_id: %', target_user_id, p_post_id;
    
    -- Delete the bookmark from user_bookmarks table
    DELETE FROM user_bookmarks 
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Bookmark removed successfully',
            'target_user_id', target_user_id,
            'post_id', p_post_id,
            'deleted_count', deleted_count
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Bookmark not found',
            'target_user_id', target_user_id,
            'post_id', p_post_id,
            'deleted_count', 0
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO anon;

-- =========================
-- VERIFICATION
-- =========================

DO $$
BEGIN
    RAISE NOTICE '🔧 BOOKMARK FUNCTION CONFLICT FIX COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Issues:';
    RAISE NOTICE '   - Dropped all conflicting remove_bookmark functions';
    RAISE NOTICE '   - Created single canonical version: remove_bookmark(target_user_id, p_post_id)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Bookmark removal should now work without conflicts!';
END $$;

-- Verify only one function exists now
SELECT 
    '✅ Canonical remove_bookmark function:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'remove_bookmark'; 