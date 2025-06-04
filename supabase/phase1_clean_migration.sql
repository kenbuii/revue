-- =======================================
-- PHASE 1: CLEAN IDEMPOTENT MIGRATION
-- Handles existing state properly, no tech debt
-- =======================================

BEGIN;

-- ==========================================
-- STEP 1: CLEAN UP EXISTING CONFLICTING ITEMS
-- ==========================================

-- Drop existing functions that might conflict (in dependency order)
DROP FUNCTION IF EXISTS get_post_comments(UUID) CASCADE;
DROP FUNCTION IF EXISTS toggle_comment_like(UUID) CASCADE;
DROP FUNCTION IF EXISTS toggle_post_like(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_comment(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS hide_post(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS unhide_post(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_hidden_posts(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_post_likes(UUID) CASCADE;

-- Drop existing triggers (if they exist)
DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes CASCADE;
DROP TRIGGER IF EXISTS post_likes_count_trigger ON post_likes CASCADE;
DROP TRIGGER IF EXISTS post_comments_count_trigger ON comments CASCADE;

-- Drop existing trigger functions (if they exist)
DROP FUNCTION IF EXISTS update_comment_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_post_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_post_comment_count() CASCADE;

-- Drop existing RLS policies (if they exist)
DROP POLICY IF EXISTS "Users can view comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can manage own comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can view own hidden posts" ON hidden_posts;
DROP POLICY IF EXISTS "Users can manage own hidden posts" ON hidden_posts;

-- ==========================================
-- STEP 2: CREATE/EXTEND TABLES SAFELY
-- ==========================================

-- Add like_count column to comments if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'like_count'
    ) THEN
        ALTER TABLE comments ADD COLUMN like_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create comment_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (comment_id, user_id)
);

-- Create hidden_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS hidden_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hidden_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT DEFAULT 'user_hidden' CHECK (reason IN ('user_hidden', 'reported', 'blocked_user')),
    UNIQUE (user_id, post_id)
);

-- ==========================================
-- STEP 3: CREATE INDEXES (IDEMPOTENT)
-- ==========================================

-- Create indexes only if they don't exist
DO $$ 
BEGIN
    -- Comment likes indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_comment_likes_comment_id') THEN
        CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_comment_likes_user_id') THEN
        CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);
    END IF;
    
    -- Hidden posts indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_hidden_posts_user_id') THEN
        CREATE INDEX idx_hidden_posts_user_id ON hidden_posts(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_hidden_posts_post_id') THEN
        CREATE INDEX idx_hidden_posts_post_id ON hidden_posts(post_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_hidden_posts_hidden_at') THEN
        CREATE INDEX idx_hidden_posts_hidden_at ON hidden_posts(hidden_at);
    END IF;
    
    -- Additional performance indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_post_likes_user_id') THEN
        CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_comments_user_id') THEN
        CREATE INDEX idx_comments_user_id ON comments(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_comments_parent_id') THEN
        CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
    END IF;
END $$;

-- ==========================================
-- STEP 4: CREATE TRIGGER FUNCTIONS
-- ==========================================

-- Function to update comment like count
CREATE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments 
        SET like_count = like_count + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post like count
CREATE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts 
        SET like_count = like_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comment count
CREATE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.parent_comment_id IS NULL THEN
            UPDATE posts 
            SET comment_count = comment_count + 1 
            WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.parent_comment_id IS NULL THEN
            UPDATE posts 
            SET comment_count = GREATEST(comment_count - 1, 0) 
            WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 5: CREATE TRIGGERS
-- ==========================================

CREATE TRIGGER comment_likes_count_trigger
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

CREATE TRIGGER post_likes_count_trigger
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

CREATE TRIGGER post_comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ==========================================
-- STEP 6: CREATE API FUNCTIONS
-- ==========================================

-- Toggle comment like
CREATE FUNCTION toggle_comment_like(p_comment_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    new_like_count INTEGER;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM comment_likes 
        WHERE comment_id = p_comment_id AND user_id = current_user_id
    ) INTO like_exists;

    IF like_exists THEN
        DELETE FROM comment_likes 
        WHERE comment_id = p_comment_id AND user_id = current_user_id;
    ELSE
        INSERT INTO comment_likes (comment_id, user_id) 
        VALUES (p_comment_id, current_user_id);
    END IF;

    SELECT like_count INTO new_like_count 
    FROM comments WHERE id = p_comment_id;

    RETURN jsonb_build_object(
        'success', true, 
        'isLiked', NOT like_exists,
        'likeCount', new_like_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle post like
CREATE FUNCTION toggle_post_like(p_post_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    new_like_count INTEGER;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM post_likes 
        WHERE post_id = p_post_id AND user_id = current_user_id
    ) INTO like_exists;

    IF like_exists THEN
        DELETE FROM post_likes 
        WHERE post_id = p_post_id AND user_id = current_user_id;
    ELSE
        INSERT INTO post_likes (post_id, user_id) 
        VALUES (p_post_id, current_user_id);
    END IF;

    SELECT like_count INTO new_like_count 
    FROM posts WHERE id = p_post_id;

    RETURN jsonb_build_object(
        'success', true, 
        'isLiked', NOT like_exists,
        'likeCount', new_like_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create comment
CREATE FUNCTION create_comment(
    p_post_id UUID,
    p_content TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    new_comment_id UUID;
    comment_result JSONB;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    IF p_content IS NULL OR LENGTH(TRIM(p_content)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comment content cannot be empty');
    END IF;

    INSERT INTO comments (post_id, user_id, content, parent_comment_id)
    VALUES (p_post_id, current_user_id, TRIM(p_content), p_parent_comment_id)
    RETURNING id INTO new_comment_id;

    SELECT jsonb_build_object(
        'success', true,
        'comment', jsonb_build_object(
            'id', c.id,
            'content', c.content,
            'user_id', c.user_id,
            'username', up.username,
            'display_name', up.display_name,
            'avatar_url', up.avatar_url,
            'parent_comment_id', c.parent_comment_id,
            'like_count', c.like_count,
            'is_liked_by_user', false,
            'created_at', c.created_at,
            'updated_at', c.updated_at
        )
    ) INTO comment_result
    FROM comments c
    JOIN user_profiles up ON c.user_id = up.user_id
    WHERE c.id = new_comment_id;

    RETURN comment_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hide post
CREATE FUNCTION hide_post(p_post_id UUID, p_reason TEXT DEFAULT 'user_hidden')
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    IF p_reason NOT IN ('user_hidden', 'reported', 'blocked_user') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reason');
    END IF;

    INSERT INTO hidden_posts (user_id, post_id, reason) 
    VALUES (current_user_id, p_post_id, p_reason)
    ON CONFLICT (user_id, post_id) DO UPDATE SET
        reason = EXCLUDED.reason,
        hidden_at = NOW();

    RETURN jsonb_build_object('success', true, 'hidden_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unhide post
CREATE FUNCTION unhide_post(p_post_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    rows_affected INTEGER;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    DELETE FROM hidden_posts 
    WHERE user_id = current_user_id AND post_id = p_post_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true, 
        'was_hidden', rows_affected > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user hidden posts
CREATE FUNCTION get_user_hidden_posts(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    post_id UUID,
    reason TEXT,
    hidden_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    IF target_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        hp.post_id,
        hp.reason,
        hp.hidden_at
    FROM hidden_posts hp
    WHERE hp.user_id = target_user_id
    ORDER BY hp.hidden_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get post likes
CREATE FUNCTION get_post_likes(p_post_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    liked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.user_id,
        up.username,
        up.display_name,
        up.avatar_url,
        pl.created_at as liked_at
    FROM post_likes pl
    JOIN user_profiles up ON pl.user_id = up.user_id
    WHERE pl.post_id = p_post_id
    ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get post comments
CREATE FUNCTION get_post_comments(p_post_id UUID)
RETURNS TABLE (
    id UUID,
    content TEXT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    parent_comment_id UUID,
    like_count INTEGER,
    is_liked_by_user BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        c.id,
        c.content,
        c.user_id,
        up.username,
        up.display_name,
        up.avatar_url,
        c.parent_comment_id,
        c.like_count,
        CASE 
            WHEN current_user_id IS NOT NULL THEN 
                EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = current_user_id)
            ELSE false 
        END as is_liked_by_user,
        c.created_at,
        c.updated_at
    FROM comments c
    JOIN user_profiles up ON c.user_id = up.user_id
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 7: ENABLE RLS ON NEW TABLES
-- ==========================================

-- Enable RLS on new tables (only if they exist and don't already have RLS enabled)
DO $$
BEGIN
    -- Enable RLS on comment_likes if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comment_likes') THEN
        ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on hidden_posts if table exists  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hidden_posts') THEN
        ALTER TABLE hidden_posts ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies (already dropped existing ones above)
CREATE POLICY "Users can view comment likes" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own comment likes" ON comment_likes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own hidden posts" ON hidden_posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own hidden posts" ON hidden_posts
    FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- STEP 8: INITIALIZE DATA
-- ==========================================

-- Initialize like counts for existing data
UPDATE comments SET like_count = (
    SELECT COUNT(*) FROM comment_likes 
    WHERE comment_likes.comment_id = comments.id
) WHERE like_count = 0;

UPDATE posts SET like_count = (
    SELECT COUNT(*) FROM post_likes 
    WHERE post_likes.post_id = posts.id
) WHERE like_count = 0;

UPDATE posts SET comment_count = (
    SELECT COUNT(*) FROM comments 
    WHERE comments.post_id = posts.id AND comments.parent_comment_id IS NULL
) WHERE comment_count = 0;

COMMIT;

-- Success message
SELECT 'Phase 1 Clean Migration completed successfully! 🎉' as status,
       'All functions, tables, and triggers created without conflicts' as details; 