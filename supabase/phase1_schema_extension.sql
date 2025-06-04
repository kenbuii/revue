-- =======================================
-- PHASE 1: SCHEMA EXTENSION
-- Adds comment likes and hidden posts functionality
-- =======================================

BEGIN;

-- ==========================================
-- Step 1.1: Extend Comments Schema
-- ==========================================

-- Add like_count column to existing comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create comment_likes table for tracking comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (comment_id, user_id)
);

-- ==========================================
-- Step 1.2: Extend Posts Schema
-- ==========================================

-- Create hidden_posts table for user-hidden posts
CREATE TABLE IF NOT EXISTS hidden_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hidden_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT DEFAULT 'user_hidden' CHECK (reason IN ('user_hidden', 'reported', 'blocked_user')),
    UNIQUE (user_id, post_id)
);

-- ==========================================
-- CREATE INDEXES
-- ==========================================

-- Indexes for comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Indexes for hidden_posts
CREATE INDEX IF NOT EXISTS idx_hidden_posts_user_id ON hidden_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_posts_post_id ON hidden_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_hidden_posts_hidden_at ON hidden_posts(hidden_at);

-- Additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);

-- ==========================================
-- CREATE TRIGGER FUNCTIONS
-- ==========================================

-- Function to update comment like count when comment_likes changes
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        UPDATE comments 
        SET like_count = like_count + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
        UPDATE comments 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post like count when post_likes changes
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        UPDATE posts 
        SET like_count = like_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
        UPDATE posts 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comment count when comments change
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment count (only for top-level comments)
        IF NEW.parent_comment_id IS NULL THEN
            UPDATE posts 
            SET comment_count = comment_count + 1 
            WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comment count (only for top-level comments)
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
-- CREATE TRIGGERS
-- ==========================================

-- Trigger for comment like count updates
DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER comment_likes_count_trigger
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Trigger for post like count updates
DROP TRIGGER IF EXISTS post_likes_count_trigger ON post_likes;
CREATE TRIGGER post_likes_count_trigger
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Trigger for post comment count updates
DROP TRIGGER IF EXISTS post_comments_count_trigger ON comments;
CREATE TRIGGER post_comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ==========================================
-- CREATE RPC FUNCTIONS
-- ==========================================

-- Function to toggle comment like
CREATE OR REPLACE FUNCTION toggle_comment_like(p_comment_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    new_like_count INTEGER;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Check if like already exists
    SELECT EXISTS(
        SELECT 1 FROM comment_likes 
        WHERE comment_id = p_comment_id AND user_id = current_user_id
    ) INTO like_exists;

    IF like_exists THEN
        -- Remove like
        DELETE FROM comment_likes 
        WHERE comment_id = p_comment_id AND user_id = current_user_id;
    ELSE
        -- Add like
        INSERT INTO comment_likes (comment_id, user_id) 
        VALUES (p_comment_id, current_user_id);
    END IF;

    -- Get updated like count
    SELECT like_count INTO new_like_count 
    FROM comments WHERE id = p_comment_id;

    RETURN jsonb_build_object(
        'success', true, 
        'isLiked', NOT like_exists,
        'likeCount', new_like_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle post like
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    new_like_count INTEGER;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Check if like already exists
    SELECT EXISTS(
        SELECT 1 FROM post_likes 
        WHERE post_id = p_post_id AND user_id = current_user_id
    ) INTO like_exists;

    IF like_exists THEN
        -- Remove like
        DELETE FROM post_likes 
        WHERE post_id = p_post_id AND user_id = current_user_id;
    ELSE
        -- Add like
        INSERT INTO post_likes (post_id, user_id) 
        VALUES (p_post_id, current_user_id);
    END IF;

    -- Get updated like count
    SELECT like_count INTO new_like_count 
    FROM posts WHERE id = p_post_id;

    RETURN jsonb_build_object(
        'success', true, 
        'isLiked', NOT like_exists,
        'likeCount', new_like_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new comment
CREATE OR REPLACE FUNCTION create_comment(
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
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Validate input
    IF p_content IS NULL OR LENGTH(TRIM(p_content)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comment content cannot be empty');
    END IF;

    -- Create the comment
    INSERT INTO comments (post_id, user_id, content, parent_comment_id)
    VALUES (p_post_id, current_user_id, TRIM(p_content), p_parent_comment_id)
    RETURNING id INTO new_comment_id;

    -- Get the created comment with user details
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

-- Function to hide a post
CREATE OR REPLACE FUNCTION hide_post(p_post_id UUID, p_reason TEXT DEFAULT 'user_hidden')
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Validate reason
    IF p_reason NOT IN ('user_hidden', 'reported', 'blocked_user') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reason');
    END IF;

    -- Insert hidden post record (ON CONFLICT DO NOTHING to avoid duplicates)
    INSERT INTO hidden_posts (user_id, post_id, reason) 
    VALUES (current_user_id, p_post_id, p_reason)
    ON CONFLICT (user_id, post_id) DO UPDATE SET
        reason = EXCLUDED.reason,
        hidden_at = NOW();

    RETURN jsonb_build_object('success', true, 'hidden_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unhide a post
CREATE OR REPLACE FUNCTION unhide_post(p_post_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    rows_affected INTEGER;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Remove hidden post record
    DELETE FROM hidden_posts 
    WHERE user_id = current_user_id AND post_id = p_post_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true, 
        'was_hidden', rows_affected > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's hidden posts
CREATE OR REPLACE FUNCTION get_user_hidden_posts(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    post_id UUID,
    reason TEXT,
    hidden_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Use provided user_id or current user
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

-- Function to get post likes with user details
CREATE OR REPLACE FUNCTION get_post_likes(p_post_id UUID)
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

-- Function to get post comments with user details and like status
CREATE OR REPLACE FUNCTION get_post_comments(p_post_id UUID)
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
-- ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_posts ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- CREATE RLS POLICIES
-- ==========================================

-- Comment likes policies
CREATE POLICY "Users can view comment likes" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own comment likes" ON comment_likes
    FOR ALL USING (auth.uid() = user_id);

-- Hidden posts policies
CREATE POLICY "Users can view own hidden posts" ON hidden_posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own hidden posts" ON hidden_posts
    FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- DATA MIGRATION & CLEANUP
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
SELECT 'Phase 1 Schema Extension completed successfully! 🎉' as status,
       'Added comment likes, hidden posts, and count triggers' as details; 