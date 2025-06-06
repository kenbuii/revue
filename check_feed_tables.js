const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFeedTables() {
  console.log('🔍 === CHECKING FEED-RELATED TABLES ===');
  
  // Check if user_profiles table exists and has onboarding_completed column
  console.log('\n👤 Checking user_profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .limit(1);
    
  if (profilesError) {
    console.error('❌ user_profiles issue:', profilesError.message);
  } else {
    console.log('✅ user_profiles table exists and has onboarding_completed');
  }
  
  // Check if media_items table exists
  console.log('\n🎬 Checking media_items table...');
  const { data: media, error: mediaError } = await supabase
    .from('media_items')
    .select('*')
    .limit(1);
    
  if (mediaError) {
    console.error('❌ media_items issue:', mediaError.message);
  } else {
    console.log('✅ media_items table exists');
  }
  
  // Check if post_likes table exists
  console.log('\n❤️ Checking post_likes table...');
  const { data: likes, error: likesError } = await supabase
    .from('post_likes')
    .select('*')
    .limit(1);
    
  if (likesError) {
    console.error('❌ post_likes issue:', likesError.message);
  } else {
    console.log('✅ post_likes table exists');
  }
  
  // Test the exact REST API call that's failing
  console.log('\n🧪 Testing exact REST API call from feed service...');
  const { data: testFeed, error: testFeedError } = await supabase
    .from('posts')
    .select('*,user_profiles!inner(*),media_items(*)')
    .eq('visibility', 'public')
    .eq('user_profiles.onboarding_completed', true)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (testFeedError) {
    console.error('❌ Feed REST API call failed:', testFeedError.message);
  } else {
    console.log('✅ Feed REST API call works:', testFeed.length, 'posts');
  }
}

checkFeedTables(); 
 