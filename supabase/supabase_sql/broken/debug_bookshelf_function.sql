-- DEBUG BOOKSHELF FUNCTION - Find out why it's not working

-- Check 1: See the actual function definition
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
AND p.proname = 'get_user_media_preferences';

-- Check 2: Test our enhanced save function with your real data
DO $$
DECLARE
    test_result JSONB;
BEGIN
    RAISE NOTICE '🧪 Testing enhanced save with your actual onboarding data...';
    
    -- Clear existing data first
    DELETE FROM user_media_preferences 
    WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';
    
    -- Test with sample from your real onboarding
    SELECT public.save_user_onboarding_data(
        NULL::TEXT,
        FALSE::BOOLEAN,
        'Test Guy'::TEXT,
        '[
            {"description": "The suspicious death of her son pushes a former secret agent back into action, investigating a series of crimes that grows increasingly sinister.", "id": "tmdb_tv_291256", "image": "https://image.tmdb.org/t/p/w500/nqKP7dOzbtP2Pmvec0ntOJDM6mb.jpg", "originalId": "291256", "rating": 10, "source": "tmdb", "title": "Sara - Woman in the Shadows", "type": "tv", "year": "2025"},
            {"description": "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.", "id": "tmdb_tv_100088", "image": "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg", "originalId": "100088", "rating": 8.533, "source": "tmdb", "title": "The Last of Us", "type": "tv", "year": "2023"},
            {"author": "Emily Henry", "description": "A writer looking for her big break competes against a Pulitzer winner to tell the story of an octogenarian with a storied past.", "id": "nyt_9780593441299", "image": "https://static01.nyt.com/bestsellers/images/9780593441299.jpg", "originalId": "9780593441299", "rating": 2.9, "source": "nyt_bestsellers", "title": "Great Big Beautiful Life", "type": "book", "year": "2025"}
        ]'::JSONB,
        TRUE::BOOLEAN,
        '670e0647-bfcb-4322-aa76-059452af9e01'::UUID
    ) INTO test_result;
    
    RAISE NOTICE '✅ Save result: %', test_result;
END $$;

-- Check 3: Count media after enhanced save
SELECT 
    'After Enhanced Save:' as status,
    COUNT(*) as media_count,
    string_agg(title, ', ' ORDER BY title) as saved_titles
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Check 4: Try calling get_user_media_preferences again
DO $$
DECLARE
    bookshelf_data JSONB;
BEGIN
    BEGIN
        SELECT public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID) INTO bookshelf_data;
        RAISE NOTICE '✅ Bookshelf function returned: %', bookshelf_data;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '❌ Bookshelf function failed: %', SQLERRM;
    END;
END $$; 