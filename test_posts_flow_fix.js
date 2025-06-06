const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPostsFlowFix() {
  try {
    console.log('🧪 Testing Posts Flow Fix...');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Simulate what the posts flow does - call create_post RPC
    console.log('📝 Testing create_post RPC (what app should use)...');
    
    const { data: createResult, error: createError } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'Test post from posts flow! 🎬',
      p_media_item_id: 'test_movie_flow',
      p_rating: 4,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (createError) {
      console.error('❌ create_post RPC failed:', createError);
      return;
    }
    
    console.log('✅ create_post RPC works:', createResult);
    
    // Test the problematic direct insertion that was causing the error
    console.log('\n🚫 Testing problematic direct insertion (what was broken)...');
    
    const { data: directResult, error: directError } = await supabase
      .from('posts')
      .insert({
        user_id: testUserId,
        content: 'Test direct insertion',
        content_type: 'review', // ❌ This column doesn't exist!
        title: 'Test Title',     // ❌ This column doesn't exist!
        tags: ['test'],          // ❌ This column doesn't exist!
        is_public: true          // ❌ This column doesn't exist!
      });
    
    if (directError) {
      console.error('❌ Direct insertion failed (expected):', directError.message);
      console.log('💡 This confirms the column mismatch issue');
    } else {
      console.log('⚠️ Unexpected: Direct insertion worked?', directResult);
    }
    
    // Test correct direct insertion
    console.log('\n✅ Testing corrected direct insertion...');
    
    const { data: correctResult, error: correctError } = await supabase
      .from('posts')
      .insert({
        user_id: testUserId,
        content: 'Test corrected insertion',
        media_item_id: 'test_movie_corrected',
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
      console.log('✅ Corrected insertion works:', correctResult[0]?.id);
    }
    
    console.log('\n🎉 Posts flow testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPostsFlowFix(); 