-- =======================================
-- TARGETED COMMENTS FIX
-- Based on diagnostic results - only fix what's broken
-- =======================================

-- Issue 1: Add missing like_count column to existing comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Issue 2: Create missing comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Issue 3: Fix duplicate get_post_comments functions
-- Drop the conflicting versions and create single canonical one
DROP FUNCTION IF EXISTS get_post_comments(p_post_id uuid);
DROP FUNCTION IF EXISTS get_post_comments(p_post_id uuid, p_limit integer, p_offset integer);

-- Create single canonical get_post_comments function
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
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
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
        COALESCE(c.like_count, 0) as like_count,
        CASE 
            WHEN current_user_id IS NOT NULL THEN 
                EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = current_user_id)
            ELSE false 
        END as is_liked_by_user,
        c.created_at,
        c.updated_at
    FROM comments c
    INNER JOIN user_profiles up ON c.user_id = up.user_id
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Issue 4: Ensure the existing update_comment_like_count trigger function works with new table
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        UPDATE comments 
        SET like_count = COALESCE(like_count, 0) + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
        UPDATE comments 
        SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Issue 5: Create trigger for comment_likes table (connect to existing trigger function)
DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER comment_likes_count_trigger
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Issue 6: Ensure existing create_comment function works with like_count column
-- (Keep existing create_comment and add_comment functions, just ensure they set like_count)

-- Issue 7: Grant permissions for the fixed function
GRANT EXECUTE ON FUNCTION get_post_comments(UUID) TO anon, authenticated;

-- Issue 8: Initialize like_count for any existing comments (there are 0, but just in case)
UPDATE comments SET like_count = 0 WHERE like_count IS NULL;

SELECT 'Targeted comments fix applied successfully!' as result; 