const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixMediaItemIdType() {
  try {
    // Drop existing foreign key constraint
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_item_id_fkey'
    });
    console.log('Dropped foreign key constraint');

    // Change media_item_id column to TEXT
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE posts ALTER COLUMN media_item_id TYPE TEXT USING media_item_id::TEXT'
    });
    console.log('Changed media_item_id column to TEXT');

    // Add back the foreign key constraint
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE posts ADD CONSTRAINT posts_media_item_id_fkey FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE SET NULL'
    });
    console.log('Added back foreign key constraint');

    // Update create_post function
    const createPostFn = `
    CREATE OR REPLACE FUNCTION public.create_post(
      p_user_id UUID,
      p_content TEXT,
      p_media_item_id TEXT DEFAULT NULL,
      p_rating INTEGER DEFAULT NULL,
      p_contains_spoilers BOOLEAN DEFAULT false,
      p_visibility TEXT DEFAULT 'public'
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        post_id UUID;
        result JSONB;
    BEGIN
        -- Insert new post using actual column names
        INSERT INTO public.posts (
            user_id,
            content,
            media_item_id,
            rating,
            contains_spoilers,
            visibility,
            like_count,
            comment_count,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_content,
            p_media_item_id,
            p_rating,
            p_contains_spoilers,
            p_visibility,
            0,
            0,
            NOW(),
            NOW()
        )
        RETURNING id INTO post_id;

        result := jsonb_build_object(
            'success', true,
            'post_id', post_id,
            'message', 'Post created successfully'
        );
        
        RETURN result;
    EXCEPTION
        WHEN others THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'detail', SQLSTATE
            );
    END;
    $$;`;

    await supabase.rpc('exec_sql', { sql: createPostFn });
    console.log('Updated create_post function');

    console.log('All changes completed successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixMediaItemIdType(); 