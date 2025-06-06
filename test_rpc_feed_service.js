const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test the RPC-based feed service approach
async function testRpcFeedService() {
  console.log('🧪 === TESTING RPC-BASED FEED SERVICE ===');
  
  // Test 1: Direct RPC calls (like the new feed service)
  console.log('\n📰 Testing get_for_you_feed RPC...');
  const { data: forYouFeed, error: forYouError } = await supabase.rpc('get_for_you_feed', {
    p_limit: 5,
    p_offset: 0
  });
  
  if (forYouError) {
    console.error('❌ For You feed RPC failed:', forYouError.message);
  } else {
    console.log('✅ For You feed RPC works:', forYouFeed.length, 'posts');
    if (forYouFeed.length > 0) {
      console.log('📋 Sample post structure:', Object.keys(forYouFeed[0]));
    }
  }
  
  // Test 2: User posts RPC
  console.log('\n👤 Testing get_user_posts RPC...');
  // Get a user ID from existing posts
  const { data: posts } = await supabase.from('posts').select('user_id').limit(1);
  if (posts && posts.length > 0) {
    const userId = posts[0].user_id;
    
    const { data: userPosts, error: userError } = await supabase.rpc('get_user_posts', {
      p_user_id: userId,
      p_limit: 5,
      p_offset: 0
    });
    
    if (userError) {
      console.error('❌ User posts RPC failed:', userError.message);
    } else {
      console.log('✅ User posts RPC works:', userPosts.length, 'posts');
    }
  }
  
  // Test 3: Liked posts RPC
  console.log('\n💝 Testing get_user_liked_posts RPC...');
  if (posts && posts.length > 0) {
    const userId = posts[0].user_id;
    
    const { data: likedPosts, error: likedError } = await supabase.rpc('get_user_liked_posts', {
      p_user_id: userId,
      p_limit: 5
    });
    
    if (likedError) {
      console.error('❌ Liked posts RPC failed:', likedError.message);
    } else {
      console.log('✅ Liked posts RPC works:', likedPosts.length, 'posts');
    }
  }
  
  // Test 4: Simple like check (like the transform function does)
  console.log('\n❤️ Testing like status check...');
  if (posts && posts.length > 0) {
    const userId = posts[0].user_id;
    
    // Get a post ID
    const { data: postData } = await supabase.from('posts').select('id').limit(1);
    if (postData && postData.length > 0) {
      const postId = postData[0].id;
      
      const { data: likeCheck, error: likeError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .limit(1);
        
      if (likeError) {
        console.error('❌ Like check failed:', likeError.message);
      } else {
        console.log('✅ Like check works:', likeCheck.length > 0 ? 'User liked this post' : 'User has not liked this post');
      }
    }
  }
  
  console.log('\n🎯 === FEED SERVICE TEST COMPLETE ===');
  console.log('💡 If all RPC calls work, your feed should load successfully now!');
}

testRpcFeedService(); 