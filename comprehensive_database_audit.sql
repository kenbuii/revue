-- COMPREHENSIVE DATABASE AUDIT FOR POSTS SYSTEM
-- Check what exists vs what's needed for full posts/comments/likes functionality

DO $$
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    function_exists BOOLEAN;
    table_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 === COMPREHENSIVE DATABASE AUDIT ===';
    
    -- ========================================
    -- CHECK CORE TABLES EXISTENCE
    -- ========================================
    RAISE NOTICE '';
    RAISE NOTICE '📋 === TABLE EXISTENCE CHECK ===';
    
    -- Check posts table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'posts'
    ) INTO table_exists;
    RAISE NOTICE 'posts table exists: %', table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO table_count FROM posts;
        RAISE NOTICE '  - posts table has % rows', table_count;
    END IF;
    
    -- Check comments table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'comments'
    ) INTO table_exists;
    RAISE NOTICE 'comments table exists: %', table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO table_count FROM comments;
        RAISE NOTICE '  - comments table has % rows', table_count;
    END IF;
    
    -- Check likes table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'likes'
    ) INTO table_exists;
    RAISE NOTICE 'likes table exists: %', table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO table_count FROM likes;
        RAISE NOTICE '  - likes table has % rows', table_count;
    END IF;
    
    -- Check user_liked_posts table (alternative)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_liked_posts'
    ) INTO table_exists;
    RAISE NOTICE 'user_liked_posts table exists: %', table_exists;
    
    -- Check notifications table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    RAISE NOTICE 'notifications table exists: %', table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO table_count FROM notifications;
        RAISE NOTICE '  - notifications table has % rows', table_count;
    END IF;
    
    -- ========================================
    -- CHECK POSTS TABLE STRUCTURE (if exists)
    -- ========================================
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'posts'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '🗂️ === POSTS TABLE STRUCTURE ===';
        
        -- Check expected columns
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'id'
        ) INTO column_exists;
        RAISE NOTICE 'posts.id exists: %', column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'user_id'
        ) INTO column_exists;
        RAISE NOTICE 'posts.user_id exists: %', column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'content'
        ) INTO column_exists;
        RAISE NOTICE 'posts.content exists: %', column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'media_id'
        ) INTO column_exists;
        RAISE NOTICE 'posts.media_id exists: %', column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'media_title'
        ) INTO column_exists;
        RAISE NOTICE 'posts.media_title exists: %', column_exists;
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'created_at'
        ) INTO column_exists;
        RAISE NOTICE 'posts.created_at exists: %', column_exists;
        
        -- Show actual posts table structure
        RAISE NOTICE '';
        RAISE NOTICE 'Posts table actual columns:';
        FOR column_exists IN
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'posts'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %', column_exists;
        END LOOP;
    END IF;
    
    -- ========================================
    -- CHECK NOTIFICATIONS TABLE STRUCTURE
    -- ========================================
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '🔔 === NOTIFICATIONS TABLE STRUCTURE ===';
        
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id'
        ) INTO column_exists;
        RAISE NOTICE 'notifications.user_id exists: %', column_exists;
        
        -- Show actual notifications table structure
        RAISE NOTICE 'Notifications table actual columns:';
        FOR column_exists IN
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'notifications'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %', column_exists;
        END LOOP;
    END IF;
    
    -- ========================================
    -- CHECK CRITICAL FUNCTIONS
    -- ========================================
    RAISE NOTICE '';
    RAISE NOTICE '⚙️ === FUNCTION EXISTENCE CHECK ===';
    
    -- Check feed functions
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'get_for_you_feed'
    ) INTO function_exists;
    RAISE NOTICE 'get_for_you_feed function exists: %', function_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'get_friends_feed'
    ) INTO function_exists;
    RAISE NOTICE 'get_friends_feed function exists: %', function_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'get_user_posts'
    ) INTO function_exists;
    RAISE NOTICE 'get_user_posts function exists: %', function_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'get_user_liked_posts'
    ) INTO function_exists;
    RAISE NOTICE 'get_user_liked_posts function exists: %', function_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'create_post'
    ) INTO function_exists;
    RAISE NOTICE 'create_post function exists: %', function_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'add_comment'
    ) INTO function_exists;
    RAISE NOTICE 'add_comment function exists: %', function_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_name = 'like_post'
    ) INTO function_exists;
    RAISE NOTICE 'like_post function exists: %', function_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ === AUDIT COMPLETE ===';
    
END $$; 
 