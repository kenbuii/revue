-- Create missing functions for likes and comments

-- Function to like a post
CREATE OR REPLACE FUNCTION like_post(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if already liked
  IF EXISTS (
    SELECT 1 FROM post_likes 
    WHERE post_id = p_post_id AND user_id = current_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Post already liked');
  END IF;
  
  -- Add like
  INSERT INTO post_likes (post_id, user_id, created_at)
  VALUES (p_post_id, current_user_id, NOW());
  
  -- Update like count
  UPDATE posts 
  SET like_count = like_count + 1 
  WHERE id = p_post_id;
  
  RETURN json_build_object('success', true, 'message', 'Post liked successfully');
END;
$$;

-- Function to unlike a post
CREATE OR REPLACE FUNCTION unlike_post(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if liked
  IF NOT EXISTS (
    SELECT 1 FROM post_likes 
    WHERE post_id = p_post_id AND user_id = current_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Post not liked');
  END IF;
  
  -- Remove like
  DELETE FROM post_likes 
  WHERE post_id = p_post_id AND user_id = current_user_id;
  
  -- Update like count
  UPDATE posts 
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = p_post_id;
  
  RETURN json_build_object('success', true, 'message', 'Post unliked successfully');
END;
$$;

-- Function to add a comment
CREATE OR REPLACE FUNCTION add_comment(
  p_post_id UUID,
  p_content TEXT,
  p_parent_comment_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  new_comment_id UUID;
  result JSON;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Validate content
  IF p_content IS NULL OR LENGTH(TRIM(p_content)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Comment content cannot be empty');
  END IF;
  
  -- Insert comment
  INSERT INTO post_comments (post_id, user_id, content, parent_comment_id, created_at)
  VALUES (p_post_id, current_user_id, TRIM(p_content), p_parent_comment_id, NOW())
  RETURNING id INTO new_comment_id;
  
  -- Update comment count
  UPDATE posts 
  SET comment_count = comment_count + 1 
  WHERE id = p_post_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Comment added successfully',
    'comment_id', new_comment_id
  );
END;
$$; 