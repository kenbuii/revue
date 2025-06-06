-- Test get_user_media_preferences function for current user
DO $$
DECLARE
    test_user_id UUID := '1ccd0502-4347-487e-a450-4e994e216ad4';
    media_result RECORD;
    count_result INTEGER;
BEGIN
    RAISE NOTICE '🔍 Testing get_user_media_preferences function for user: %', test_user_id;
    
    -- First check if user has data in user_media_preferences table
    SELECT COUNT(*) INTO count_result
    FROM user_media_preferences 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '📊 Raw table count: % media preferences found', count_result;
    
    -- If count > 0, show some raw data
    IF count_result > 0 THEN
        RAISE NOTICE '📋 Sample raw data:';
        FOR media_result IN 
            SELECT media_id, title, media_type, source 
            FROM user_media_preferences 
            WHERE user_id = test_user_id 
            LIMIT 2
        LOOP
            RAISE NOTICE '  - ID: %, Title: %, Type: %, Source: %', 
                media_result.media_id, 
                media_result.title, 
                media_result.media_type,
                media_result.source;
        END LOOP;
    END IF;
    
    -- Now test the function
    RAISE NOTICE '🔧 Testing get_user_media_preferences function...';
    
    SELECT count(*) INTO count_result
    FROM get_user_media_preferences(test_user_id);
    
    RAISE NOTICE '✅ Function returned % rows', count_result;
    
    -- Show first few results from function
    IF count_result > 0 THEN
        RAISE NOTICE '📋 Function results:';
        FOR media_result IN 
            SELECT * FROM get_user_media_preferences(test_user_id) LIMIT 2
        LOOP
            RAISE NOTICE '  - Function result: %', media_result;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ Function returned NO data despite table having % rows', 
            (SELECT COUNT(*) FROM user_media_preferences WHERE user_id = test_user_id);
    END IF;
    
END $$; 