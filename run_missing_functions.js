const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Direct SQL execution using HTTP
async function executeSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_query: sql }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

async function createMissingFunctions() {
  console.log('🔧 === CREATING MISSING FUNCTIONS ===');
  
  const functions = [
    // Like function
    `CREATE OR REPLACE FUNCTION like_post(p_post_id UUID)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      current_user_id UUID;
    BEGIN
      current_user_id := auth.uid();
      
      IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
      END IF;
      
      IF EXISTS (SELECT 1 FROM post_likes WHERE post_id = p_post_id AND user_id = current_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'Post already liked');
      END IF;
      
      INSERT INTO post_likes (post_id, user_id, created_at)
      VALUES (p_post_id, current_user_id, NOW());
      
      UPDATE posts SET like_count = like_count + 1 WHERE id = p_post_id;
      
      RETURN json_build_object('success', true, 'message', 'Post liked successfully');
    END;
    $$;`,
    
    // Unlike function
    `CREATE OR REPLACE FUNCTION unlike_post(p_post_id UUID)
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      current_user_id UUID;
    BEGIN
      current_user_id := auth.uid();
      
      IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM post_likes WHERE post_id = p_post_id AND user_id = current_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'Post not liked');
      END IF;
      
      DELETE FROM post_likes WHERE post_id = p_post_id AND user_id = current_user_id;
      
      UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_post_id;
      
      RETURN json_build_object('success', true, 'message', 'Post unliked successfully');
    END;
    $$;`,
    
    // Add comment function
    `CREATE OR REPLACE FUNCTION add_comment(p_post_id UUID, p_content TEXT, p_parent_comment_id UUID DEFAULT NULL)
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
      
      INSERT INTO post_comments (post_id, user_id, content, parent_comment_id, created_at)
      VALUES (p_post_id, current_user_id, TRIM(p_content), p_parent_comment_id, NOW())
      RETURNING id INTO new_comment_id;
      
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
      
      RETURN json_build_object('success', true, 'message', 'Comment added successfully', 'comment_id', new_comment_id);
    END;
    $$;`
  ];
  
  for (let i = 0; i < functions.length; i++) {
    console.log(`\n🔧 Creating function ${i + 1}/3...`);
    
    try {
      await executeSQL(functions[i]);
      console.log('✅ Success');
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
  
  // Test the functions
  console.log('\n🧪 Testing created functions...');
  
  try {
    const { data: likeTest, error: likeError } = await supabase.rpc('like_post', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862'
    });
    
    if (likeError) {
      console.log('❌ Like function failed:', likeError.message);
    } else {
      console.log('✅ Like function works:', likeTest);
    }
  } catch (error) {
    console.log('❌ Like test failed:', error.message);
  }
  
  try {
    const { data: commentTest, error: commentError } = await supabase.rpc('add_comment', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862',
      p_content: 'Test comment from function creation'
    });
    
    if (commentError) {
      console.log('❌ Comment function failed:', commentError.message);
    } else {
      console.log('✅ Comment function works:', commentTest);
    }
  } catch (error) {
    console.log('❌ Comment test failed:', error.message);
  }
  
  console.log('\n🎯 === FUNCTIONS CREATED ===');
}

createMissingFunctions(); 