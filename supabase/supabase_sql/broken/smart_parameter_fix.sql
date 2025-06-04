-- SMART PARAMETER MISMATCH FIX
-- This version checks what exists and only fixes what's actually broken

-- STEP 1: Diagnosis and Smart Cleanup
DO $$
DECLARE
    func_record RECORD;
    functions_found INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 DIAGNOSING FUNCTION PARAMETER MISMATCHES...';
    RAISE NOTICE '';
    
    -- Check save_user_onboarding_data functions
    RAISE NOTICE '📋 Checking save_user_onboarding_data functions:';
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'save_user_onboarding_data'
    LOOP
        functions_found := functions_found + 1;
        RAISE NOTICE '   Found: % with args: %', func_record.proname, func_record.args;
        
        -- Drop if it doesn't have target_user_id
        IF func_record.args NOT LIKE '%target_user_id%' THEN
            RAISE NOTICE '   ❌ Wrong parameters - DROPPING: %', func_record.oid::regprocedure;
            EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
        ELSE
            RAISE NOTICE '   ✅ Correct parameters - KEEPING';
        END IF;
    END LOOP;
    
    IF functions_found = 0 THEN
        RAISE NOTICE '   ❌ No save_user_onboarding_data functions found';
    END IF;
    
    -- Reset counter
    functions_found := 0;
    
    -- Check get_user_bookmarks functions
    RAISE NOTICE '';
    RAISE NOTICE '📋 Checking get_user_bookmarks functions:';
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'get_user_bookmarks'
    LOOP
        functions_found := functions_found + 1;
        RAISE NOTICE '   Found: % with args: %', func_record.proname, func_record.args;
        
        IF func_record.args NOT LIKE '%target_user_id%' THEN
            RAISE NOTICE '   ❌ Wrong parameters - DROPPING: %', func_record.oid::regprocedure;
            EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
        ELSE
            RAISE NOTICE '   ✅ Correct parameters - KEEPING';
        END IF;
    END LOOP;
    
    IF functions_found = 0 THEN
        RAISE NOTICE '   ❌ No get_user_bookmarks functions found';
    END IF;
    
    -- Reset counter
    functions_found := 0;
    
    -- Check add_bookmark functions
    RAISE NOTICE '';
    RAISE NOTICE '📋 Checking add_bookmark functions:';
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_catalog.pg_get_function_arguments(p.oid) as args
        FROM pg_catalog.pg_proc p
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'add_bookmark'
    LOOP
        functions_found := functions_found + 1;
        RAISE NOTICE '   Found: % with args: %', func_record.proname, func_record.args;
        
        IF func_record.args NOT LIKE '%target_user_id%' THEN
            RAISE NOTICE '   ❌ Wrong parameters - DROPPING: %', func_record.oid::regprocedure;
            EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
        ELSE
            RAISE NOTICE '   ✅ Correct parameters - KEEPING';
        END IF;
    END LOOP;
    
    IF functions_found = 0 THEN
        RAISE NOTICE '   ❌ No add_bookmark functions found';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Cleanup complete. Creating missing functions with correct parameters...';
END $$;

-- STEP 2: Create save_user_onboarding_data with correct parameters (only if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'save_user_onboarding_data'
        AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
    ) THEN
        RAISE NOTICE '📝 Creating save_user_onboarding_data function...';
        
        CREATE OR REPLACE FUNCTION public.save_user_onboarding_data(
            target_user_id UUID,
            display_name TEXT DEFAULT NULL,
            contact_sync_enabled BOOLEAN DEFAULT FALSE,
            avatar_url TEXT DEFAULT NULL,
            media_preferences JSONB DEFAULT '[]'::JSONB,
            onboarding_completed BOOLEAN DEFAULT FALSE,
            username TEXT DEFAULT NULL
        )
        RETURNS JSONB AS $func$
        DECLARE
            result JSONB;
            affected_rows INTEGER;
        BEGIN
            RAISE NOTICE 'save_user_onboarding_data called with target_user_id: %', target_user_id;
            
            -- Update user profile using 'id' column
            UPDATE user_profiles SET
                display_name = COALESCE(save_user_onboarding_data.display_name, user_profiles.display_name),
                avatar_url = COALESCE(save_user_onboarding_data.avatar_url, user_profiles.avatar_url),
                contact_sync_enabled = save_user_onboarding_data.contact_sync_enabled,
                onboarding_completed = save_user_onboarding_data.onboarding_completed,
                updated_at = NOW()
            WHERE id = target_user_id;
            
            GET DIAGNOSTICS affected_rows = ROW_COUNT;
            RAISE NOTICE 'Updated % rows in user_profiles', affected_rows;

            -- Handle media preferences if provided
            IF jsonb_array_length(media_preferences) > 0 THEN
                DELETE FROM user_media_preferences 
                WHERE user_id = target_user_id AND added_during_onboarding = TRUE;
                
                INSERT INTO user_media_preferences (
                    user_id, media_id, title, media_type, year, image_url, description, source, original_api_id, added_during_onboarding
                )
                SELECT 
                    target_user_id,
                    COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT),
                    (item->>'title')::TEXT,
                    COALESCE((item->>'type')::TEXT, (item->>'media_type')::TEXT),
                    (item->>'year')::TEXT,
                    COALESCE((item->>'image')::TEXT, (item->>'image_url')::TEXT),
                    (item->>'description')::TEXT,
                    (item->>'source')::TEXT,
                    COALESCE((item->>'originalId')::TEXT, (item->>'original_api_id')::TEXT),
                    TRUE
                FROM jsonb_array_elements(media_preferences) AS item
                WHERE COALESCE((item->>'id')::TEXT, (item->>'media_id')::TEXT) IS NOT NULL;
            END IF;

            result := jsonb_build_object(
                'success', true,
                'message', 'User onboarding data saved successfully',
                'rows_affected', affected_rows,
                'target_user_id', target_user_id
            );
            
            RETURN result;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'save_user_onboarding_data error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
                RETURN jsonb_build_object(
                    'success', false,
                    'error', SQLERRM,
                    'detail', SQLSTATE,
                    'target_user_id', target_user_id
                );
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE '✅ save_user_onboarding_data created successfully';
    ELSE
        RAISE NOTICE '✅ save_user_onboarding_data already exists with correct parameters';
    END IF;
END $$;

-- STEP 3: Create get_user_bookmarks (only if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'get_user_bookmarks'
        AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
    ) THEN
        RAISE NOTICE '📝 Creating get_user_bookmarks function...';
        
        CREATE OR REPLACE FUNCTION public.get_user_bookmarks(
            target_user_id UUID
        )
        RETURNS TABLE(
            id UUID,
            user_id UUID,
            post_id UUID,
            created_at TIMESTAMPTZ,
            post_title TEXT,
            post_content TEXT,
            post_author_id UUID,
            post_created_at TIMESTAMPTZ
        ) AS $func$
        BEGIN
            RAISE NOTICE 'get_user_bookmarks called with target_user_id: %', target_user_id;
            
            RETURN QUERY
            SELECT 
                b.id,
                b.user_id,
                b.post_id,
                b.created_at,
                p.title as post_title,
                p.content as post_content,
                p.author_id as post_author_id,
                p.created_at as post_created_at
            FROM bookmarks b
            JOIN posts p ON b.post_id = p.id
            WHERE b.user_id = target_user_id
            ORDER BY b.created_at DESC;
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'get_user_bookmarks error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
                RETURN;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE '✅ get_user_bookmarks created successfully';
    ELSE
        RAISE NOTICE '✅ get_user_bookmarks already exists with correct parameters';
    END IF;
END $$;

-- STEP 4: Create add_bookmark (only if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'add_bookmark'
        AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%'
    ) THEN
        RAISE NOTICE '📝 Creating add_bookmark function...';
        
        CREATE OR REPLACE FUNCTION public.add_bookmark(
            target_user_id UUID,
            post_id UUID
        )
        RETURNS JSONB AS $func$
        DECLARE
            result JSONB;
            bookmark_id UUID;
            existing_bookmark UUID;
        BEGIN
            RAISE NOTICE 'add_bookmark called with target_user_id: %, post_id: %', target_user_id, post_id;
            
            SELECT id INTO existing_bookmark
            FROM bookmarks 
            WHERE user_id = target_user_id AND bookmarks.post_id = add_bookmark.post_id;
            
            IF existing_bookmark IS NOT NULL THEN
                result := jsonb_build_object(
                    'success', false,
                    'message', 'Bookmark already exists',
                    'bookmark_id', existing_bookmark,
                    'target_user_id', target_user_id,
                    'post_id', add_bookmark.post_id
                );
            ELSE
                INSERT INTO bookmarks (user_id, post_id, created_at)
                VALUES (target_user_id, add_bookmark.post_id, NOW())
                RETURNING id INTO bookmark_id;
                
                result := jsonb_build_object(
                    'success', true,
                    'message', 'Bookmark added successfully',
                    'bookmark_id', bookmark_id,
                    'target_user_id', target_user_id,
                    'post_id', add_bookmark.post_id
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
                    'post_id', add_bookmark.post_id
                );
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE '✅ add_bookmark created successfully';
    ELSE
        RAISE NOTICE '✅ add_bookmark already exists with correct parameters';
    END IF;
END $$;

-- STEP 5: Grant permissions
DO $$
BEGIN
    RAISE NOTICE '🔐 Setting up permissions...';
    
    GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.save_user_onboarding_data(UUID, TEXT, BOOLEAN, TEXT, JSONB, BOOLEAN, TEXT) TO anon;
    
    GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_user_bookmarks(UUID) TO anon;
    
    GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.add_bookmark(UUID, UUID) TO anon;
    
    RAISE NOTICE '✅ Permissions granted';
END $$;

-- STEP 6: Final verification
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SMART PARAMETER FIX COMPLETED! 🎯';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
    AND p.proname IN ('save_user_onboarding_data', 'get_user_bookmarks', 'add_bookmark')
    AND pg_get_function_arguments(p.oid) LIKE '%target_user_id%';
    
    RAISE NOTICE 'Created % functions with target_user_id parameter', func_count;
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test with your problematic user ID:';
    RAISE NOTICE '   SELECT public.get_user_bookmarks(''8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3''::UUID);';
    RAISE NOTICE '';
END $$;

-- Quick test query
SELECT 
    'Final Status:' as status,
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as parameters
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('save_user_onboarding_data', 'get_user_bookmarks', 'add_bookmark')
ORDER BY p.proname; 