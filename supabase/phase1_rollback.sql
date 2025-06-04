-- =======================================
-- PHASE 1: ROLLBACK SCRIPT
-- Safely undoes Phase 1 migration
-- =======================================

BEGIN;

-- ==========================================
-- STEP 1: DROP FUNCTIONS
-- ==========================================

DROP FUNCTION IF EXISTS get_post_comments(UUID) CASCADE;
DROP FUNCTION IF EXISTS toggle_comment_like(UUID) CASCADE;
DROP FUNCTION IF EXISTS toggle_post_like(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_comment(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS hide_post(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS unhide_post(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_hidden_posts(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_post_likes(UUID) CASCADE;

-- ==========================================
-- STEP 2: DROP TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes CASCADE;
DROP TRIGGER IF EXISTS post_likes_count_trigger ON post_likes CASCADE;
DROP TRIGGER IF EXISTS post_comments_count_trigger ON comments CASCADE;

-- ==========================================
-- STEP 3: DROP TRIGGER FUNCTIONS
-- ==========================================

DROP FUNCTION IF EXISTS update_comment_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_post_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_post_comment_count() CASCADE;

-- ==========================================
-- STEP 4: DROP RLS POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Users can view comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can manage own comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can view own hidden posts" ON hidden_posts;
DROP POLICY IF EXISTS "Users can manage own hidden posts" ON hidden_posts;

-- ==========================================
-- STEP 5: DROP TABLES
-- ==========================================

DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS hidden_posts CASCADE;

-- ==========================================
-- STEP 6: DROP COLUMN
-- ==========================================

-- Remove like_count column from comments if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'like_count'
    ) THEN
        ALTER TABLE comments DROP COLUMN like_count;
    END IF;
END $$;

COMMIT;

-- Success message
SELECT 'Phase 1 rollback completed successfully' as status,
       'All Phase 1 changes have been undone' as details; 