const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCommentFunctionOverload() {
  console.log('🔧 === FIXING COMMENT FUNCTION OVERLOAD ===');
  
  const sqlCommands = [
    `DROP FUNCTION IF EXISTS get_post_comments(uuid);`,
    `DROP FUNCTION IF EXISTS get_post_comments(uuid, integer, integer);`,
    `CREATE OR REPLACE FUNCTION get_post_comments(
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
      
      RETURN COALESCE(comments_json, '[]'::json);
    END;
    $$;`
  ];
  
  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i];
    console.log(`\n🔧 Step ${i + 1}: ${sql.substring(0, 50)}...`);
    
    try {
      // Use direct SQL execution
      const response = await fetch(`${supabaseUrl}/rest/v1/query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/vnd.pgrst.object+json',
        },
        body: sql,
      });
      
      if (response.ok) {
        console.log('✅ Success');
      } else {
        const errorText = await response.text();
        console.log('⚠️ Response:', response.status, errorText);
      }
    } catch (error) {
      console.log('⚠️ Error:', error.message);
    }
  }
  
  // Test the fixed function
  console.log('\n🧪 Testing fixed comment function...');
  try {
    const { data: testComments, error: testError } = await supabase.rpc('get_post_comments', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862', // Use the post ID from the logs
      p_limit: 5
    });
    
    if (testError) {
      console.error('❌ Comment function still broken:', testError.message);
    } else {
      console.log('✅ Comment function works! Found', testComments?.length || 0, 'comments');
    }
  } catch (error) {
    console.error('❌ Error testing comments:', error.message);
  }
}

fixCommentFunctionOverload(); 