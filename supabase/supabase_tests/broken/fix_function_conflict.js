const { createClient } = require('@supabase/supabase-js');

// Use the same credentials that worked in previous debug scripts
const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzE5NTEsImV4cCI6MjA0ODMwNzk1MX0.rF2MbdZTQKWkDNTELUJ5r0Rqz67XkWGKs5oW2_sX_2I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixFunctionConflict() {
  try {
    console.log('🔧 Fixing function parameter conflict...');
    
    // First, drop the specific conflicting function
    console.log('1. Dropping conflicting get_user_bookmarks function...');
    const { data: dropResult, error: dropError } = await supabase.rpc('drop_function_sql', {
      function_sql: 'DROP FUNCTION IF EXISTS get_user_bookmarks(uuid) CASCADE;'
    });
    
    if (dropError) {
      console.log('⚠️ Drop function error (might not exist):', dropError.message);
    } else {
      console.log('✅ Function dropped successfully');
    }
    
    // Now create the correct function with p_user_id parameter
    console.log('2. Creating correct get_user_bookmarks function...');
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.get_user_bookmarks(p_user_id UUID)
      RETURNS TABLE (
          id UUID,
          post_id TEXT,
          media_id TEXT,
          media_title TEXT,
          media_type TEXT,
          media_cover TEXT,
          post_title TEXT,
          post_content TEXT,
          post_author_name TEXT,
          post_author_avatar TEXT,
          post_date TIMESTAMP WITH TIME ZONE,
          bookmarked_at TIMESTAMP WITH TIME ZONE
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              ub.id,
              ub.post_id,
              ub.media_id,
              ub.media_title,
              ub.media_type,
              ub.media_cover,
              ub.post_title,
              ub.post_content,
              ub.post_author_name,
              ub.post_author_avatar,
              ub.post_date,
              ub.bookmarked_at
          FROM user_bookmarks ub
          WHERE ub.user_id = p_user_id
          ORDER BY ub.bookmarked_at DESC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { data: createResult, error: createError } = await supabase.rpc('execute_sql', {
      sql_query: createFunctionSQL
    });
    
    if (createError) {
      console.error('❌ Create function error:', createError);
    } else {
      console.log('✅ Function created successfully');
    }
    
    console.log('🎉 Function conflict fixed!');
    
  } catch (err) {
    console.error('💥 Script error:', err.message);
  }
}

fixFunctionConflict(); 