-- FINAL FIX FOR REMOVE_BOOKMARK FUNCTION
-- Match the app's actual usage: TEXT parameter and user_bookmarks table

-- STEP 1: Nuclear cleanup of all remove_bookmark functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE '🧹 Final cleanup of all remove_bookmark functions...';
    
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

-- STEP 2: Create remove_bookmark function that matches your app's actual usage
CREATE OR REPLACE FUNCTION public.remove_bookmark(
    target_user_id UUID,
    p_post_id TEXT  -- ❗ Changed from UUID to TEXT to match your app
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'remove_bookmark called with target_user_id: %, p_post_id: %', target_user_id, p_post_id;
    
    -- Delete the bookmark from user_bookmarks table (not bookmarks table)
    DELETE FROM user_bookmarks 
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
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(UUID, TEXT) TO anon;

-- STEP 4: Final verification
DO $$
BEGIN
    RAISE NOTICE '🎯 REMOVE_BOOKMARK FINAL FIX COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Function now matches your app exactly:';
    RAISE NOTICE '   - Parameter: p_post_id TEXT (not UUID)';
    RAISE NOTICE '   - Table: user_bookmarks (not bookmarks)';
    RAISE NOTICE '   - remove_bookmark(target_user_id UUID, p_post_id TEXT)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Should now work with media IDs like "media_tmdb_movie_541671"!';
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