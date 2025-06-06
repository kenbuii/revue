-- =======================================
-- FIX COMMENT COUNT DISPLAY IN FEED
-- Ensure posts.comment_count stays in sync with actual comments
-- =======================================

-- Issue: Feed shows stale comment counts because posts.comment_count isn't updated

-- Step 1: Ensure posts table has comment_count column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Step 2: Create/update trigger to maintain comment_count in posts table
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment count for the post
        UPDATE posts 
        SET comment_count = COALESCE(comment_count, 0) + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comment count for the post
        UPDATE posts 
        SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger on comments table to update post comment counts
DROP TRIGGER IF EXISTS post_comment_count_trigger ON comments;
CREATE TRIGGER post_comment_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Step 4: Initialize comment_count for existing posts (count actual comments)
UPDATE posts 
SET comment_count = (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.post_id = posts.id
) 
WHERE comment_count IS NULL OR comment_count = 0;

-- Step 5: Verify the counts are correct
SELECT 'Comment count sync completed!' as result;

-- Optional: Show current state for verification
SELECT 
    p.id,
    p.title,
    p.comment_count as stored_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as actual_count
FROM posts p
LIMIT 5; 