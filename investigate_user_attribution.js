const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateUserAttribution() {
  console.log('🔍 === INVESTIGATING USER ATTRIBUTION ISSUE ===');
  
  // Step 1: Check raw posts table
  console.log('\n📊 Step 1: Raw posts table data...');
  const { data: rawPosts, error: postsError } = await supabase
    .from('posts')
    .select('id, user_id, content, media_item_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (postsError) {
    console.log('❌ Posts query failed:', postsError.message);
  } else {
    console.log('✅ Found', rawPosts.length, 'posts in database');
    console.log('📋 Post user_ids:', [...new Set(rawPosts.map(p => p.user_id))]);
    console.log('📋 Media item IDs:', rawPosts.map(p => ({ id: p.id.substring(0, 8), media_item_id: p.media_item_id })));
  }
  
  // Step 2: Check user_profiles table
  console.log('\n👤 Step 2: User profiles data...');
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id, username, display_name')
    .limit(10);
    
  if (profilesError) {
    console.log('❌ Profiles query failed:', profilesError.message);
  } else {
    console.log('✅ Found', profiles.length, 'user profiles');
    profiles.forEach(p => {
      console.log(`👤 ${p.user_id.substring(0, 8)}: ${p.username} (${p.display_name})`);
    });
  }
  
  // Step 3: Test the RPC function directly
  console.log('\n🔧 Step 3: Testing RPC function directly...');
  const { data: rpcPosts, error: rpcError } = await supabase.rpc('get_for_you_feed', {
    p_limit: 5,
    p_offset: 0
  });
  
  if (rpcError) {
    console.log('❌ RPC failed:', rpcError.message);
  } else {
    console.log('✅ RPC returned', rpcPosts.length, 'posts');
    
    rpcPosts.forEach((post, i) => {
      console.log(`📋 Post ${i + 1}: ${post.id.substring(0, 8)}`);
      console.log(`   - user_id: ${post.user_id.substring(0, 8)}`);
      console.log(`   - username: ${post.username}`);
      console.log(`   - display_name: ${post.display_name}`);
      console.log(`   - media_item_id: ${post.media_item_id}`);
      console.log(`   - content: ${post.content?.substring(0, 30)}...`);
    });
  }
  
  // Step 4: Check current user session
  console.log('\n🔑 Step 4: Current user session...');
  console.log('Expected user ID: 1ccd0502-4347-487e-a450-4e994e216ad4');
  console.log('Expected username: kilobyte');
  console.log('Expected display_name: Ken Bui');
  
  // Step 5: Manual join query to verify
  console.log('\n🔗 Step 5: Manual join verification...');
  const { data: joinedData, error: joinError } = await supabase
    .from('posts')
    .select(`
      id,
      user_id,
      content,
      media_item_id,
      created_at,
      user_profiles!inner (
        username,
        display_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (joinError) {
    console.log('❌ Manual join failed:', joinError.message);
  } else {
    console.log('✅ Manual join returned', joinedData.length, 'posts');
    
    joinedData.forEach((post, i) => {
      console.log(`📋 Joined Post ${i + 1}: ${post.id.substring(0, 8)}`);
      console.log(`   - post.user_id: ${post.user_id.substring(0, 8)}`);
      console.log(`   - profile.username: ${post.user_profiles.username}`);
      console.log(`   - profile.display_name: ${post.user_profiles.display_name}`);
      console.log(`   - media_item_id: ${post.media_item_id}`);
    });
  }
  
  console.log('\n🎯 === INVESTIGATION COMPLETE ===');
  console.log('💡 This will show us:');
  console.log('   1. How many different users actually exist');
  console.log('   2. Which user_ids the posts belong to');  
  console.log('   3. If the RPC function is working correctly');
  console.log('   4. Why all posts show the same user');
}

investigateUserAttribution(); 