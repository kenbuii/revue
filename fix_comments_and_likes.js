const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCommentsAndLikes() {
  console.log('🔧 === FIXING COMMENTS AND LIKES FUNCTIONS ===');
  
  // Step 1: Check current function conflicts
  console.log('\n📋 Checking current comment functions...');
  try {
    const { data: commentTest, error: commentError } = await supabase.rpc('get_post_comments', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862',
      p_limit: 5
    });
    
    if (commentError) {
      console.log('❌ Comment function has overloading issue:', commentError.message);
    } else {
      console.log('✅ Comment function works');
    }
  } catch (error) {
    console.log('❌ Comment function test failed:', error.message);
  }
  
  // Step 2: Check like functions
  console.log('\n❤️ Testing like functions...');
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
    console.log('❌ Like function test failed:', error.message);
  }
  
  // Step 3: Check unlike function
  try {
    const { data: unlikeTest, error: unlikeError } = await supabase.rpc('unlike_post', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862'
    });
    
    if (unlikeError) {
      console.log('❌ Unlike function failed:', unlikeError.message);
    } else {
      console.log('✅ Unlike function works:', unlikeTest);
    }
  } catch (error) {
    console.log('❌ Unlike function test failed:', error.message);
  }
  
  // Step 4: Check comment creation
  console.log('\n💬 Testing comment creation...');
  try {
    const { data: createCommentTest, error: createCommentError } = await supabase.rpc('add_comment', {
      p_post_id: '92f00965-0b76-4bed-90c4-fe1491113862',
      p_content: 'Test comment from diagnostic'
    });
    
    if (createCommentError) {
      console.log('❌ Comment creation failed:', createCommentError.message);
    } else {
      console.log('✅ Comment creation works:', createCommentTest);
    }
  } catch (error) {
    console.log('❌ Comment creation test failed:', error.message);
  }
  
  // Step 5: Check what tables exist
  console.log('\n📊 Checking table structure...');
  try {
    const { data: posts } = await supabase.from('posts').select('id,like_count,comment_count').limit(1);
    console.log('✅ Posts table columns exist:', Object.keys(posts[0] || {}));
  } catch (error) {
    console.log('❌ Posts table issue:', error.message);
  }
  
  try {
    const { data: comments } = await supabase.from('post_comments').select('*').limit(1);
    console.log('✅ Comments table exists, columns:', Object.keys(comments[0] || {}));
  } catch (error) {
    console.log('❌ Comments table issue:', error.message);
  }
  
  try {
    const { data: likes } = await supabase.from('post_likes').select('*').limit(1);
    console.log('✅ Likes table exists, columns:', Object.keys(likes[0] || {}));
  } catch (error) {
    console.log('❌ Likes table issue:', error.message);
  }
  
  console.log('\n🎯 === DIAGNOSTIC COMPLETE ===');
  console.log('💡 Issues found:');
  console.log('   - Comment function overloading needs resolution');
  console.log('   - Check if comment creation references wrong columns');
  console.log('   - Verify like/unlike functions work in app environment');
}

fixCommentsAndLikes(); 