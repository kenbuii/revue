-- FIX BOOKMARK FUNCTIONS - Create missing and update existing to match app expectations
-- Your app expects richer bookmark functionality with metadata

-- STEP 1: Drop the simple add_bookmark we created earlier
DROP FUNCTION IF EXISTS public.add_bookmark(target_user_id UUID, post_id UUID);

-- STEP 2: Create the add_bookmark function your app actually expects
CREATE OR REPLACE FUNCTION public.add_bookmark(
    p_media_cover TEXT,
    p_media_id TEXT,
    p_media_title TEXT,
    p_media_type TEXT,
    p_post_author_avatar TEXT,
    p_post_author_name TEXT,
    p_post_content TEXT,
    p_post_date TIMESTAMPTZ,
    p_post_id TEXT,
    target_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    bookmark_id UUID;
    existing_bookmark UUID;
BEGIN
    RAISE NOTICE 'add_bookmark called with target_user_id: %, p_post_id: %', target_user_id, p_post_id;
    
    -- Check if bookmark already exists in user_bookmarks table
    SELECT id INTO existing_bookmark
    FROM user_bookmarks 
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    IF existing_bookmark IS NOT NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Bookmark already exists',
            'bookmark_id', existing_bookmark,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
    ELSE
        -- Create new bookmark in user_bookmarks table with all metadata
        INSERT INTO user_bookmarks (
            user_id,
            post_id,
            media_id,
            media_title,
            media_type,
            media_cover,
            post_title,
            post_content,
            post_author_name,
            post_author_avatar,
            post_date,
            bookmarked_at
        ) VALUES (
            target_user_id,
            p_post_id,
            p_media_id,
            p_media_title,
            p_media_type,
            p_media_cover,
            p_media_title, -- Using media_title as post_title fallback
            p_post_content,
            p_post_author_name,
            p_post_author_avatar,
            p_post_date,
            NOW()
        ) RETURNING id INTO bookmark_id;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Bookmark added successfully',
            'bookmark_id', bookmark_id,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'add_bookmark error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Create the missing remove_bookmark function
CREATE OR REPLACE FUNCTION public.remove_bookmark(
    p_post_id TEXT,
    target_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    affected_rows INTEGER;
    existing_bookmark UUID;
BEGIN
    RAISE NOTICE 'remove_bookmark called with target_user_id: %, p_post_id: %', target_user_id, p_post_id;
    
    -- Check if bookmark exists
    SELECT id INTO existing_bookmark
    FROM user_bookmarks 
    WHERE user_id = target_user_id AND post_id = p_post_id;
    
    IF existing_bookmark IS NULL THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Bookmark not found',
            'target_user_id', target_user_id,
            'post_id', p_post_id
        );
    ELSE
        -- Remove the bookmark
        DELETE FROM user_bookmarks 
        WHERE user_id = target_user_id AND post_id = p_post_id;
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Bookmark removed successfully',
            'rows_affected', affected_rows,
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

-- STEP 4: Update get_user_bookmarks to work with user_bookmarks table
DROP FUNCTION IF EXISTS public.get_user_bookmarks(target_user_id UUID);

CREATE OR REPLACE FUNCTION public.get_user_bookmarks(
    target_user_id UUID
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    post_id TEXT,
    media_id TEXT,
    media_title TEXT,
    media_type TEXT,
    media_cover TEXT,
    post_title TEXT,
    post_content TEXT,
    post_author_name TEXT,
    post_author_avatar TEXT,
    post_date TIMESTAMPTZ,
    bookmarked_at TIMESTAMPTZ
) AS $$
BEGIN
    RAISE NOTICE 'get_user_bookmarks called with target_user_id: %', target_user_id;
    
    RETURN QUERY
    SELECT 
        ub.id,
        ub.user_id,
        ub.post_id,
        ub.media_id,
        ub.media_title,
        ub.media_type,
        ub.media_cover,
        ub.post_title,
        ub.post_content,
        ub.post_author_name,
        ub.post_author_avatar,
        ub.post_date,
        ub.bookmarked_at
    FROM user_bookmarks ub
    WHERE ub.user_id = target_user_id
    ORDER BY ub.bookmarked_at DESC;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'get_user_bookmarks error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Grant permissions on all bookmark functions
GRANT EXECUTE ON FUNCTION public.add_bookmark(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_bookmark(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.remove_bookmark(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_bookmark(TEXT, UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon;

-- STEP 6: Verification
DO $$
BEGIN
    RAISE NOTICE '🎯 BOOKMARK FUNCTIONS FIX COMPLETE! 🎯';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions now match your app expectations:';
    RAISE NOTICE '   - add_bookmark(p_media_cover, p_media_id, p_media_title, p_media_type, p_post_author_avatar, p_post_author_name, p_post_content, p_post_date, p_post_id, target_user_id)';
    RAISE NOTICE '   - remove_bookmark(p_post_id, target_user_id)';
    RAISE NOTICE '   - get_user_bookmarks(target_user_id) - updated to return rich data';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Now using user_bookmarks table with full metadata support';
END $$;

-- Final verification query
SELECT 
    'Fixed Bookmark Functions:' as status,
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('add_bookmark', 'remove_bookmark', 'get_user_bookmarks')
ORDER BY proname; 