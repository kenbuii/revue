const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFixedPostsFlow() {
  try {
    console.log('🎉 Testing FIXED Posts Flow...');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Test 1: Create post using RPC (should work now)
    console.log('\n✅ Test 1: Creating post using fixed RPC function...');
    
    const { data: createResult, error: createError } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'TEST: Posts flow is now fixed! 🎬✨',
      p_media_item_id: null,
      p_rating: 5,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (createError) {
      console.error('❌ RPC create failed:', createError);
      return;
    }
    
    console.log('✅ RPC create SUCCESS:', createResult);
    const postId = createResult.post_id;
    
    // Test 2: Verify broken direct insertion still fails (should fail as expected)
    console.log('\n❌ Test 2: Verifying broken direct insertion still fails (expected)...');
    
    const { data: directResult, error: directError } = await supabase
      .from('posts')
      .insert({
        user_id: testUserId,
        content: 'This should fail',
        content_type: 'review', // ❌ Non-existent column
        title: 'Should fail',     // ❌ Non-existent column
      });
    
    if (directError) {
      console.log('✅ Direct insertion failed as expected:', directError.message);
    } else {
      console.log('⚠️ Unexpected: Direct insertion worked?');
    }
    
    // Test 3: Test corrected direct insertion (should work)
    console.log('\n✅ Test 3: Testing corrected direct insertion...');
    
    const { data: correctResult, error: correctError } = await supabase
      .from('posts')
      .insert({
        user_id: testUserId,
        content: 'Direct insertion with correct columns',
        media_item_id: null,
        rating: 3,
        contains_spoilers: false,
        visibility: 'public',
        like_count: 0,
        comment_count: 0
      })
      .select();
    
    if (correctError) {
      console.error('❌ Corrected insertion failed:', correctError);
    } else {
      console.log('✅ Corrected insertion SUCCESS:', correctResult[0]?.id);
    }
    
    // Test 4: Test feed loading (should work now)
    console.log('\n✅ Test 4: Testing feed loading...');
    
    const { data: feedData, error: feedError } = await supabase.rpc('get_for_you_feed', {
      p_limit: 5,
      p_offset: 0
    });
    
    if (feedError) {
      console.error('❌ Feed loading failed:', feedError);
    } else {
      console.log('✅ Feed loading SUCCESS:', feedData.length, 'posts loaded');
      if (feedData.length > 0) {
        console.log('📋 Latest post:', {
          id: feedData[0].id,
          content: feedData[0].content?.substring(0, 50) + '...',
          username: feedData[0].username
        });
      }
    }
    
    console.log('\n🎉 === ALL TESTS COMPLETED ===');
    console.log('📊 Posts flow should now work correctly in the app!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedPostsFlow(); 
 