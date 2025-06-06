const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCommentsTable() {
  console.log('🔍 === CHECKING COMMENTS TABLE STRUCTURE ===');
  
  // Check post_comments table structure
  try {
    console.log('\n📋 Checking post_comments table...');
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ Error querying post_comments:', error.message);
    } else {
      if (comments.length > 0) {
        console.log('✅ post_comments table columns:', Object.keys(comments[0]));
      } else {
        console.log('✅ post_comments table exists but is empty');
        
        // Try to get column info another way
        const { data: emptyQuery } = await supabase
          .from('post_comments')
          .select('id,content,user_id,post_id,created_at,updated_at,parent_comment_id')
          .limit(0);
          
        console.log('📋 Expected columns: id,content,user_id,post_id,created_at,updated_at,parent_comment_id');
      }
    }
  } catch (error) {
    console.log('❌ Error checking post_comments:', error.message);
  }
  
  // Check if comments table also exists (from the SQL file)
  try {
    console.log('\n📋 Checking if comments table also exists...');
    const { data: commentsAlt, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(1);
      
    if (commentsError) {
      console.log('❌ comments table does not exist:', commentsError.message);
    } else {
      if (commentsAlt.length > 0) {
        console.log('✅ comments table columns:', Object.keys(commentsAlt[0]));
      } else {
        console.log('✅ comments table exists but is empty');
      }
    }
  } catch (error) {
    console.log('❌ Error checking comments table:', error.message);
  }
  
  console.log('\n💡 DIAGNOSIS:');
  console.log('The create_comment function expects a "comments" table with like_count column');
  console.log('But your app uses "post_comments" table without like_count column');
  console.log('This is why you get "column c.like_count does not exist" error');
  
  console.log('\n🔧 SOLUTION:');
  console.log('Create a new create_comment function that works with post_comments table');
}

checkCommentsTable(); 