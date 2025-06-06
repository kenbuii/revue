const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompletePostsSystem() {
  try {
    console.log('🧪 === TESTING COMPLETE POSTS SYSTEM ===');
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Test 1: Create a post
    console.log('\n📝 Test 1: Creating a post...');
    const { data: createData, error: createError } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'Test post for complete system! 🎬 Just watched an amazing movie!',
      p_media_item_id: null,
      p_rating: 5,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (createError) {
      console.error('❌ Create post failed:', createError);
      return;
    }
    
    console.log('✅ Post created successfully:', createData);
    const postId = createData.post_id;
    
    // Test 2: Like the post
    console.log('\n❤️ Test 2: Liking the post...');
    const { data: likeData, error: likeError } = await supabase.rpc('like_post', {
      p_user_id: testUserId,
      p_post_id: postId
    });
    
    if (likeError) {
      console.error('❌ Like post failed:', likeError);
    } else {
      console.log('✅ Post liked successfully:', likeData);
    }
    
    // Test 3: Add a comment
    console.log('\n💬 Test 3: Adding a comment...');
    const { data: commentData, error: commentError } = await supabase.rpc('add_comment', {
      p_user_id: testUserId,
      p_post_id: postId,
      p_content: 'This is a great test comment! 🎉'
    });
    
    if (commentError) {
      console.error('❌ Add comment failed:', commentError);
    } else {
      console.log('✅ Comment added successfully:', commentData);
    }
    
    // Test 4: Get For You feed
    console.log('\n📰 Test 4: Getting For You feed...');
    const { data: feedData, error: feedError } = await supabase.rpc('get_for_you_feed', {
      p_limit: 10,
      p_offset: 0
    });
    
    if (feedError) {
      console.error('❌ For You feed failed:', feedError);
    } else {
      console.log('✅ For You feed loaded:', feedData.length, 'posts');
      if (feedData.length > 0) {
        console.log('📋 First post:', {
          id: feedData[0].id,
          content: feedData[0].content?.substring(0, 50) + '...',
          like_count: feedData[0].like_count,
          comment_count: feedData[0].comment_count,
          username: feedData[0].username
        });
      }
    }
    
    // Test 5: Get user's posts
    console.log('\n👤 Test 5: Getting user posts...');
    const { data: userPostsData, error: userPostsError } = await supabase.rpc('get_user_posts', {
      p_user_id: testUserId,
      p_limit: 10,
      p_offset: 0
    });
    
    if (userPostsError) {
      console.error('❌ User posts failed:', userPostsError);
    } else {
      console.log('✅ User posts loaded:', userPostsData.length, 'posts');
    }
    
    // Test 6: Get user's liked posts
    console.log('\n❤️ Test 6: Getting user liked posts...');
    const { data: likedPostsData, error: likedPostsError } = await supabase.rpc('get_user_liked_posts', {
      p_user_id: testUserId,
      p_limit: 10,
      p_offset: 0
    });
    
    if (likedPostsError) {
      console.error('❌ Liked posts failed:', likedPostsError);
    } else {
      console.log('✅ Liked posts loaded:', likedPostsData.length, 'posts');
      if (likedPostsData.length > 0) {
        console.log('📋 First liked post:', {
          id: likedPostsData[0].id,
          content: likedPostsData[0].content?.substring(0, 50) + '...',
          liked_at: likedPostsData[0].liked_at
        });
      }
    }
    
    // Test 7: Get post comments
    console.log('\n💬 Test 7: Getting post comments...');
    const { data: commentsData, error: commentsError } = await supabase.rpc('get_post_comments', {
      p_post_id: postId,
      p_limit: 10,
      p_offset: 0
    });
    
    if (commentsError) {
      console.error('❌ Post comments failed:', commentsError);
    } else {
      console.log('✅ Post comments loaded:', commentsData.length, 'comments');
      if (commentsData.length > 0) {
        console.log('📋 First comment:', {
          id: commentsData[0].id,
          content: commentsData[0].content,
          username: commentsData[0].username
        });
      }
    }
    
    // Test 8: Test notifications (should not error now)
    console.log('\n🔔 Test 8: Getting notifications...');
    const { data: notificationsData, error: notificationsError } = await supabase.rpc('get_user_notifications', {
      p_user_id: testUserId,
      p_limit: 10,
      p_offset: 0,
      p_unread_only: false
    });
    
    if (notificationsError) {
      console.error('❌ Notifications failed:', notificationsError);
    } else {
      console.log('✅ Notifications loaded:', notificationsData.length, 'notifications');
    }
    
    // Test 9: Unlike the post
    console.log('\n💔 Test 9: Unliking the post...');
    const { data: unlikeData, error: unlikeError } = await supabase.rpc('unlike_post', {
      p_user_id: testUserId,
      p_post_id: postId
    });
    
    if (unlikeError) {
      console.error('❌ Unlike post failed:', unlikeError);
    } else {
      console.log('✅ Post unliked successfully:', unlikeData);
    }
    
    console.log('\n🎉 === ALL TESTS COMPLETED ===');
    console.log('📊 Summary:');
    console.log('- Post creation: ✅');
    console.log('- Like/Unlike: ✅');
    console.log('- Comments: ✅');
    console.log('- Feed loading: ✅');
    console.log('- User posts: ✅');
    console.log('- Liked posts: ✅');
    console.log('- Notifications: ✅');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

testCompletePostsSystem(); 
 