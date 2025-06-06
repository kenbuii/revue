-- =======================================
-- CREATE TEST DATA FOR FEED TESTING
-- Generates sample posts and media items to test enhanced feed functions
-- =======================================

-- Step 1: Create some test media items
INSERT INTO media_items (id, title, media_type, author, description, cover_image_url, created_at, updated_at)
VALUES 
    ('movie_dune_2021', 'Dune', 'movie', 'Denis Villeneuve', 'A noble family becomes embroiled in a war for control over the galaxy''s most valuable asset.', 'https://via.placeholder.com/300x450/FF6B6B/white?text=Dune', NOW(), NOW()),
    ('book_1984_orwell', '1984', 'book', 'George Orwell', 'A dystopian social science fiction novel about totalitarian control.', 'https://via.placeholder.com/300x450/45B7D1/white?text=1984', NOW(), NOW()),
    ('tv_stranger_things', 'Stranger Things', 'tv', 'The Duffer Brothers', 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces.', 'https://via.placeholder.com/300x450/4ECDC4/white?text=Stranger+Things', NOW(), NOW()),
    ('movie_oppenheimer_2023', 'Oppenheimer', 'movie', 'Christopher Nolan', 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.', 'https://via.placeholder.com/300x450/FF6B6B/white?text=Oppenheimer', NOW(), NOW()),
    ('book_hobbit_tolkien', 'The Hobbit', 'book', 'J.R.R. Tolkien', 'A reluctant Hobbit, Bilbo Baggins, sets out to the Lonely Mountain with a spirited group of dwarves.', 'https://via.placeholder.com/300x450/45B7D1/white?text=The+Hobbit', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 2: Create test posts for existing users
-- This will create 2-3 posts per user who has completed onboarding
INSERT INTO posts (user_id, content, title, media_item_id, rating, visibility, is_public, created_at, updated_at)
SELECT 
    up.user_id,
    CASE 
        WHEN row_number() OVER (PARTITION BY up.user_id ORDER BY random()) = 1 THEN
            'Just watched this and wow! The cinematography was absolutely stunning. ' || mi.title || ' really exceeded my expectations. The way they handled the source material was brilliant.'
        WHEN row_number() OVER (PARTITION BY up.user_id ORDER BY random()) = 2 THEN
            'Been thinking about ' || mi.title || ' for days now. ' || mi.description || ' This one really stays with you long after you finish it.'
        ELSE
            'Finally got around to ' || mi.title || ' and I can see why everyone''s talking about it! Definitely worth the hype. What did everyone else think?'
    END as content,
    CASE 
        WHEN row_number() OVER (PARTITION BY up.user_id ORDER BY random()) = 1 THEN 'Absolutely Stunning'
        WHEN row_number() OVER (PARTITION BY up.user_id ORDER BY random()) = 2 THEN 'Still Thinking About This'
        ELSE 'Worth the Hype!'
    END as title,
    mi.id as media_item_id,
    (RANDOM() * 4 + 6)::INTEGER as rating, -- Random rating between 6-10
    'public' as visibility,
    true as is_public,
    NOW() - (RANDOM() * INTERVAL '7 days') as created_at, -- Random time in last 7 days
    NOW() as updated_at
FROM user_profiles up
CROSS JOIN (
    SELECT * FROM media_items ORDER BY random() LIMIT 3
) mi
WHERE up.onboarding_completed = true
  AND row_number() OVER (PARTITION BY up.user_id ORDER BY random()) <= 2; -- Max 2 posts per user

-- Step 3: Create some post likes for engagement
-- This will create likes from other users on the posts we just created
INSERT INTO post_likes (post_id, user_id, created_at)
SELECT DISTINCT
    p.id as post_id,
    up.user_id,
    NOW() - (RANDOM() * INTERVAL '5 days') as created_at
FROM posts p
CROSS JOIN user_profiles up
WHERE up.user_id != p.user_id  -- Don't like your own posts
  AND up.onboarding_completed = true
  AND RANDOM() < 0.4  -- 40% chance of liking each post
ON CONFLICT (post_id, user_id) DO NOTHING;

-- Step 4: Update like counts on posts
UPDATE posts 
SET like_count = (
    SELECT COUNT(*) 
    FROM post_likes pl 
    WHERE pl.post_id = posts.id
);

-- Step 5: Verify the test data
DO $$
DECLARE
    post_count INTEGER;
    media_count INTEGER;
    like_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO post_count FROM posts;
    SELECT COUNT(*) INTO media_count FROM media_items;
    SELECT COUNT(*) INTO like_count FROM post_likes;
    SELECT COUNT(*) INTO user_count FROM user_profiles WHERE onboarding_completed = true;
    
    RAISE NOTICE 'Test data created successfully!';
    RAISE NOTICE '- Posts: %', post_count;
    RAISE NOTICE '- Media items: %', media_count;
    RAISE NOTICE '- Post likes: %', like_count;
    RAISE NOTICE '- Onboarded users: %', user_count;
    
    IF post_count > 0 THEN
        RAISE NOTICE '✅ Ready to test enhanced feed functions!';
    ELSE
        RAISE WARNING '⚠️ No posts created - check user_profiles.onboarding_completed status';
    END IF;
END $$;

SELECT 'Test data creation completed!' as result; 