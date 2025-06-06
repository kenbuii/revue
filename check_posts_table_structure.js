const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPostsTableStructure() {
  try {
    console.log('🔍 Checking actual posts table structure...');
    
    // Get a sample post to see actual data types
    const { data: samplePost, error: sampleError } = await supabase
      .from('posts')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('❌ Error getting sample post:', sampleError);
      return;
    }
    
    if (samplePost && samplePost.length > 0) {
      console.log('📋 Sample post data:');
      console.log(JSON.stringify(samplePost[0], null, 2));
      
      console.log('\n📊 Column analysis:');
      Object.entries(samplePost[0]).forEach(([key, value], index) => {
        console.log(`${index + 1}. ${key}: ${typeof value} - "${value}"`);
      });
    } else {
      console.log('⚠️ No posts found to analyze');
    }
    
    // Also test the feed function directly to see what it returns
    console.log('\n🧪 Testing get_for_you_feed function...');
    
    const { data: feedData, error: feedError } = await supabase.rpc('get_for_you_feed', {
      p_limit: 1,
      p_offset: 0
    });
    
    if (feedError) {
      console.error('❌ Feed function error:', feedError);
      console.log('💡 This tells us about the column type mismatch');
    } else {
      console.log('✅ Feed function works');
      if (feedData && feedData.length > 0) {
        console.log('📋 Feed return structure:');
        Object.entries(feedData[0]).forEach(([key, value], index) => {
          console.log(`${index + 1}. ${key}: ${typeof value} - "${value}"`);
        });
      }
    }
    
    // Check notifications function issue
    console.log('\n🔔 Testing notifications function...');
    
    const { data: notifData, error: notifError } = await supabase.rpc('get_user_notifications', {
      p_user_id: '1ccd0502-4347-487e-a450-4e994e216ad4',
      p_limit: 1,
      p_offset: 0,
      p_unread_only: false
    });
    
    if (notifError) {
      console.error('❌ Notifications error:', notifError);
      console.log('💡 This tells us about the notifications table structure issue');
    } else {
      console.log('✅ Notifications function works');
    }
    
  } catch (error) {
    console.error('❌ Structure check failed:', error);
  }
}

checkPostsTableStructure(); 
 