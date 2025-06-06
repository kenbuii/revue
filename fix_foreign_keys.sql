-- Fix foreign key relationships for feed service joins
-- This will allow the REST API to perform joins between posts and user_profiles

-- Add foreign key constraint from posts.user_id to user_profiles.user_id
ALTER TABLE posts 
ADD CONSTRAINT fk_posts_user_id 
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key constraint from posts.media_item_id to media_items.id  
ALTER TABLE posts 
ADD CONSTRAINT fk_posts_media_item_id 
FOREIGN KEY (media_item_id) REFERENCES media_items(id) 
ON DELETE SET NULL;

-- Add foreign key constraint from post_likes.post_id to posts.id
ALTER TABLE post_likes 
ADD CONSTRAINT fk_post_likes_post_id 
FOREIGN KEY (post_id) REFERENCES posts(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from post_likes.user_id to user_profiles.user_id
ALTER TABLE post_likes 
ADD CONSTRAINT fk_post_likes_user_id 
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) 
ON DELETE CASCADE;

-- Refresh the schema cache to recognize new relationships
NOTIFY pgrst, 'reload schema'; 
 