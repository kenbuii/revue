const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createCorrectFunctions() {
  console.log('🔧 === CREATING CORRECT FUNCTION SIGNATURES ===');
  
  // Create the toggle_post_like function that the app expects
  console.log('\n❤️ Creating toggle_post_like function...');
  try {
    const toggleResult = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID)
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          current_user_id UUID;
          is_liked BOOLEAN;
          new_like_count INTEGER;
        BEGIN
          current_user_id := auth.uid();
          
          IF current_user_id IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'User not authenticated');
          END IF;
          
          -- Check if already liked
          SELECT EXISTS (
            SELECT 1 FROM post_likes 
            WHERE post_id = p_post_id AND user_id = current_user_id
          ) INTO is_liked;
          
          IF is_liked THEN
            -- Unlike the post
            DELETE FROM post_likes 
            WHERE post_id = p_post_id AND user_id = current_user_id;
            
            UPDATE posts 
            SET like_count = GREATEST(like_count - 1, 0) 
            WHERE id = p_post_id;
            
            SELECT like_count INTO new_like_count FROM posts WHERE id = p_post_id;
            
            RETURN json_build_object(
              'success', true, 
              'isLiked', false,
              'likeCount', new_like_count,
              'message', 'Post unliked'
            );
          ELSE
            -- Like the post
            INSERT INTO post_likes (post_id, user_id, created_at)
            VALUES (p_post_id, current_user_id, NOW());
            
            UPDATE posts 
            SET like_count = like_count + 1 
            WHERE id = p_post_id;
            
            SELECT like_count INTO new_like_count FROM posts WHERE id = p_post_id;
            
            RETURN json_build_object(
              'success', true, 
              'isLiked', true,
              'likeCount', new_like_count,
              'message', 'Post liked'
            );
          END IF;
        END;
        $$;
      `
    });
    
    if (toggleResult.error) {
      console.log('❌ Toggle function failed:', toggleResult.error.message);
    } else {
      console.log('✅ Toggle function created');
    }
  } catch (error) {
    console.log('❌ Toggle function error:', error.message);
  }
  
  // Create the get_post_likes function
  console.log('\n👥 Creating get_post_likes function...');
  try {
    const likesResult = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION get_post_likes(p_post_id UUID)
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          likes_json JSON;
        BEGIN
          SELECT json_agg(
            json_build_object(
              'user_id', pl.user_id,
              'username', up.username,
              'display_name', up.display_name,
              'avatar_url', up.avatar_url,
              'liked_at', pl.created_at
            )
            ORDER BY pl.created_at DESC
          )
          INTO likes_json
          FROM post_likes pl
          LEFT JOIN user_profiles up ON pl.user_id = up.user_id
          WHERE pl.post_id = p_post_id;
          
          RETURN COALESCE(likes_json, '[]'::json);
        END;
        $$;
      `
    });
    
    if (likesResult.error) {
      console.log('❌ Get likes function failed:', likesResult.error.message);
    } else {
      console.log('✅ Get likes function created');
    }
  } catch (error) {
    console.log('❌ Get likes function error:', error.message);
  }
  
  // Create the add_comment function
  console.log('\n💬 Creating add_comment function...');
  try {
    const commentResult = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION add_comment(p_post_id UUID, p_content TEXT)
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          current_user_id UUID;
          new_comment_id UUID;
        BEGIN
          current_user_id := auth.uid();
          
          IF current_user_id IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'User not authenticated');
          END IF;
          
          IF p_content IS NULL OR LENGTH(TRIM(p_content)) = 0 THEN
            RETURN json_build_object('success', false, 'error', 'Comment content cannot be empty');
          END IF;
          
          INSERT INTO post_comments (post_id, user_id, content, created_at)
          VALUES (p_post_id, current_user_id, TRIM(p_content), NOW())
          RETURNING id INTO new_comment_id;
          
          UPDATE posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
          
          RETURN json_build_object(
            'success', true, 
            'message', 'Comment added successfully',
            'comment_id', new_comment_id
          );
        END;
        $$;
      `
    });
    
    if (commentResult.error) {
      console.log('❌ Add comment function failed:', commentResult.error.message);
    } else {
      console.log('✅ Add comment function created');
    }
  } catch (error) {
    console.log('❌ Add comment function error:', error.message);
  }
  
  // Test the functions
  console.log('\n🧪 Testing functions...');
  
  try {
    const { data: toggleTest, error: toggleError } = await supabase.rpc('toggle_post_like', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862'
    });
    
    if (toggleError) {
      console.log('❌ Toggle test failed:', toggleError.message);
    } else {
      console.log('✅ Toggle test works:', toggleTest);
    }
  } catch (error) {
    console.log('❌ Toggle test error:', error.message);
  }
  
  console.log('\n🎯 === FUNCTIONS READY ===');
}

createCorrectFunctions(); 