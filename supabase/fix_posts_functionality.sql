-- Update posts table to use TEXT for media_item_id
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_item_id_fkey;
ALTER TABLE posts ALTER COLUMN media_item_id TYPE TEXT USING media_item_id::TEXT;
ALTER TABLE posts ADD CONSTRAINT posts_media_item_id_fkey FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE SET NULL; 