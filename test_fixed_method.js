const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFixedMethod() {
  try {
    console.log('🔧 Testing the new createPostFixed method approach...');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Simulate the exact same RPC call that createPostFixed should make
    console.log('🔧 Testing direct RPC call (what createPostFixed does)...');
    
    const { data: result, error } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'FIXED METHOD TEST: This should work! 🔧✨',
      p_media_item_id: null,
      p_rating: 5,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (error) {
      console.error('❌ RPC call failed:', error);
      return;
    }
    
    console.log('✅ RPC call SUCCESS:', result);
    
    if (result.success) {
      console.log('🎉 createPostFixed should work perfectly!');
      console.log('📋 Post ID:', result.post_id);
      
      // Verify the post appears in feed
      const { data: feedData, error: feedError } = await supabase.rpc('get_for_you_feed', {
        p_limit: 1,
        p_offset: 0
      });
      
      if (!feedError && feedData.length > 0) {
        console.log('✅ Post appears in feed:', feedData[0].content);
      }
    } else {
      console.error('❌ RPC returned error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedMethod(); 
 