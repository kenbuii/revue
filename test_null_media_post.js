const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNullMediaPost() {
  try {
    console.log('🧪 Testing post creation with null media_item_id...');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Test create_post with null media_item_id (should work)
    const { data: result, error } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'Test post without media reference! 📝',
      p_media_item_id: null, // This should be allowed
      p_rating: null,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (error) {
      console.error('❌ Failed:', error);
    } else {
      console.log('✅ Success! Post created with null media_item_id:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNullMediaPost(); 