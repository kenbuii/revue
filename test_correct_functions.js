const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCorrectFunctions() {
  console.log('🧪 === TESTING CORRECT FUNCTION NAMES ===');
  
  // Test toggle_post_like (what the app actually calls)
  console.log('\n❤️ Testing toggle_post_like...');
  try {
    const { data: toggleTest, error: toggleError } = await supabase.rpc('toggle_post_like', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862'
    });
    
    if (toggleError) {
      console.log('❌ toggle_post_like failed:', toggleError.message);
    } else {
      console.log('✅ toggle_post_like works:', toggleTest);
    }
  } catch (error) {
    console.log('❌ toggle_post_like error:', error.message);
  }
  
  // Test get_post_likes
  console.log('\n👥 Testing get_post_likes...');
  try {
    const { data: likesTest, error: likesError } = await supabase.rpc('get_post_likes', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862'
    });
    
    if (likesError) {
      console.log('❌ get_post_likes failed:', likesError.message);
    } else {
      console.log('✅ get_post_likes works:', likesTest);
    }
  } catch (error) {
    console.log('❌ get_post_likes error:', error.message);
  }
  
  // Test create_comment (from the SQL file)
  console.log('\n💬 Testing create_comment...');
  try {
    const { data: commentTest, error: commentError } = await supabase.rpc('create_comment', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862',
      p_content: 'Test comment from function test'
    });
    
    if (commentError) {
      console.log('❌ create_comment failed:', commentError.message);
    } else {
      console.log('✅ create_comment works:', commentTest);
    }
  } catch (error) {
    console.log('❌ create_comment error:', error.message);
  }
  
  // Test add_comment (what the app might be calling)
  console.log('\n💬 Testing add_comment...');
  try {
    const { data: addCommentTest, error: addCommentError } = await supabase.rpc('add_comment', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862',
      p_content: 'Test comment from add_comment'
    });
    
    if (addCommentError) {
      console.log('❌ add_comment failed:', addCommentError.message);
    } else {
      console.log('✅ add_comment works:', addCommentError);
    }
  } catch (error) {
    console.log('❌ add_comment error:', error.message);
  }
  
  console.log('\n🎯 === TEST COMPLETE ===');
}

testCorrectFunctions(); 