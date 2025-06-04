-- SAVE FULL ONBOARDING DATA - All 9 items you actually selected

-- Clear test data and save your real choices
DELETE FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Save your complete 9-item onboarding selection
DO $$
DECLARE
    save_result JSONB;
BEGIN
    RAISE NOTICE '🎯 Saving your FULL 9-item onboarding selection...';
    
    SELECT public.save_user_onboarding_data(
        NULL::TEXT,
        FALSE::BOOLEAN,
        'Test Guy'::TEXT,
        '[
            {"description": "The suspicious death of her son pushes a former secret agent back into action, investigating a series of crimes that grows increasingly sinister.", "id": "tmdb_tv_291256", "image": "https://image.tmdb.org/t/p/w500/nqKP7dOzbtP2Pmvec0ntOJDM6mb.jpg", "originalId": "291256", "rating": 10, "source": "tmdb", "title": "Sara - Woman in the Shadows", "type": "tv", "year": "2025"},
            {"description": "Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone. What starts as a small job soon becomes a brutal, heartbreaking journey, as they both must traverse the United States and depend on each other for survival.", "id": "tmdb_tv_100088", "image": "https://image.tmdb.org/t/p/w500/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg", "originalId": "100088", "rating": 8.533, "source": "tmdb", "title": "The Last of Us", "type": "tv", "year": "2023"},
            {"author": "Emily Henry", "description": "A writer looking for her big break competes against a Pulitzer winner to tell the story of an octogenarian with a storied past.", "id": "nyt_9780593441299", "image": "https://static01.nyt.com/bestsellers/images/9780593441299.jpg", "originalId": "9780593441299", "rating": 2.9, "source": "nyt_bestsellers", "title": "Great Big Beautiful Life", "type": "book", "year": "2025"},
            {"description": "Trying to leave their troubled lives behind, twin brothers return to their hometown to start again, only to discover that an even greater evil is waiting to welcome them back.", "id": "tmdb_movie_1233413", "image": "https://image.tmdb.org/t/p/w500/jYfMTSiFFK7ffbY2lay4zyvTkEk.jpg", "originalId": "1233413", "rating": 7.5, "source": "tmdb", "title": "Sinners", "type": "movie", "year": "2025"},
            {"description": "Two mob families clash in a war that threatens to topple empires and lives.", "id": "tmdb_tv_247718", "image": "https://image.tmdb.org/t/p/w500/abeH7n5pcuQcwYcTxG6DTZvXLP1.jpg", "originalId": "247718", "rating": 8.56, "source": "tmdb", "title": "MobLand", "type": "tv", "year": "2025"},
            {"description": "On the rugged isle of Berk, where Vikings and dragons have been bitter enemies for generations, Hiccup stands apart, defying centuries of tradition when he befriends Toothless, a feared Night Fury dragon. Their unlikely bond reveals the true nature of dragons, challenging the very foundations of Viking society.", "id": "tmdb_movie_1087192", "image": "https://image.tmdb.org/t/p/w500/47HoQdGvW4Jy4ntUbsQ3bEnJHDh.jpg", "originalId": "1087192", "rating": 9.1, "source": "tmdb", "title": "How to Train Your Dragon", "type": "movie", "year": "2025"},
            {"author": "Michael Connelly", "description": "The Los Angeles County sheriff detective Stilwell gets reassigned to Catalina Island, where he investigates a poaching case and a Jane Doe found in the harbor.", "id": "nyt_9780316588485", "image": "https://static01.nyt.com/bestsellers/images/9780316588485.jpg", "originalId": "9780316588485", "rating": 2.7, "source": "nyt_bestsellers", "title": "Nightshade", "type": "book", "year": "2025"},
            {"description": "Taking place during the events of John Wick: Chapter 3 – Parabellum, Eve Macarro begins her training in the assassin traditions of the Ruska Roma.", "id": "tmdb_movie_541671", "image": "https://image.tmdb.org/t/p/w500/mKp4euM5Cv3m2U1Vmby3OGwcD5y.jpg", "originalId": "541671", "rating": 6.7, "source": "tmdb", "title": "Ballerina", "type": "movie", "year": "2025"},
            {"author": "Rachel Gillig", "description": "Sybil Delling, who is gifted with the power of foresight, forms an alliance with a heretical knight when her sister Diviners disappear.", "id": "nyt_9780316588447", "image": "https://static01.nyt.com/bestsellers/images/9780316588447.jpg", "originalId": "9780316588447", "rating": 2.9, "source": "nyt_bestsellers", "title": "The Knight and the Moth", "type": "book", "year": "2025"}
        ]'::JSONB,
        TRUE::BOOLEAN,
        '670e0647-bfcb-4322-aa76-059452af9e01'::UUID
    ) INTO save_result;
    
    RAISE NOTICE '✅ Your full onboarding save result: %', save_result;
END $$;

-- Verify all 9 items saved correctly
SELECT 
    'Your Complete Bookshelf:' as status,
    COUNT(*) as total_items,
    COUNT(CASE WHEN media_type = 'tv' THEN 1 END) as tv_shows,
    COUNT(CASE WHEN media_type = 'movie' THEN 1 END) as movies,
    COUNT(CASE WHEN media_type = 'book' THEN 1 END) as books,
    string_agg(DISTINCT source, ', ') as sources_used
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- List all your saved media titles
SELECT 
    media_type,
    title,
    source,
    year
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01'
ORDER BY media_type, title;

-- Now test the bookshelf function with your real data
SELECT 'Bookshelf Function Result:' as test, 
       public.get_user_media_preferences('670e0647-bfcb-4322-aa76-059452af9e01'::UUID) as your_bookshelf; 