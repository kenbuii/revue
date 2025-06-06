-- Fix comment function overloading issue
-- Drop all existing get_post_comments functions to clear conflicts

DROP FUNCTION IF EXISTS get_post_comments(uuid);
DROP FUNCTION IF EXISTS get_post_comments(uuid, integer, integer);

-- Create a single canonical get_post_comments function
CREATE OR REPLACE FUNCTION get_post_comments(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  comments_json JSON;
BEGIN
  -- Get comments for the post with user info
  SELECT json_agg(
    json_build_object(
      'id', c.id,
      'content', c.content,
      'created_at', c.created_at,
      'user_id', c.user_id,
      'username', up.username,
      'display_name', up.display_name,
      'avatar_url', up.avatar_url
    )
    ORDER BY c.created_at ASC
  )
  INTO comments_json
  FROM post_comments c
  LEFT JOIN user_profiles up ON c.user_id = up.user_id
  WHERE c.post_id = p_post_id
  LIMIT p_limit
  OFFSET p_offset;
  
  -- Return empty array if no comments
  RETURN COALESCE(comments_json, '[]'::json);
END;
$$; 