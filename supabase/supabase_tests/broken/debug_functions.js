// Debug RPC Function Creation Issues
async function debugFunctions() {
  console.log('🔍 DEBUGGING RPC FUNCTION ISSUES');
  console.log('==================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  try {
    console.log('1️⃣ Testing each function individually...\n');
    
    // Test get_user_feed with more detail
    console.log('Testing get_user_feed:');
    const feedResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_feed`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '71a36ee6-8ef6-4272-950f-25ab54de806d',
        p_limit: 5
      })
    });
    
    console.log(`  Status: ${feedResponse.status}`);
    if (!feedResponse.ok) {
      const errorText = await feedResponse.text();
      console.log(`  Error: ${errorText}`);
    } else {
      const data = await feedResponse.json();
      console.log(`  Success: Got ${Array.isArray(data) ? data.length : 'unknown'} results`);
    }

    // Test create_post
    console.log('\nTesting create_post:');
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_post`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '71a36ee6-8ef6-4272-950f-25ab54de806d',
        p_content: 'Test post from debug'
      })
    });
    
    console.log(`  Status: ${createResponse.status}`);
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log(`  Error: ${errorText}`);
    } else {
      const data = await createResponse.json();
      console.log(`  Success: Created post with ID ${data}`);
    }

    // Test toggle_post_like
    console.log('\nTesting toggle_post_like:');
    const likeResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/toggle_post_like`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '71a36ee6-8ef6-4272-950f-25ab54de806d',
        p_post_id: '00000000-0000-0000-0000-000000000000'
      })
    });
    
    console.log(`  Status: ${likeResponse.status}`);
    if (!likeResponse.ok) {
      const errorText = await likeResponse.text();
      console.log(`  Error: ${errorText}`);
    } else {
      const data = await likeResponse.json();
      console.log(`  Success: Like toggled, result: ${data}`);
    }

    // Test toggle_user_follow
    console.log('\nTesting toggle_user_follow:');
    const followResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/toggle_user_follow`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_follower_id: '71a36ee6-8ef6-4272-950f-25ab54de806d',
        p_following_id: '00000000-0000-0000-0000-000000000000'
      })
    });
    
    console.log(`  Status: ${followResponse.status}`);
    if (!followResponse.ok) {
      const errorText = await followResponse.text();
      console.log(`  Error: ${errorText}`);
    } else {
      const data = await followResponse.json();
      console.log(`  Success: Follow toggled, result: ${data}`);
    }

    // Test get_post_comments
    console.log('\nTesting get_post_comments:');
    const commentsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_post_comments`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_post_id: '00000000-0000-0000-0000-000000000000'
      })
    });
    
    console.log(`  Status: ${commentsResponse.status}`);
    if (!commentsResponse.ok) {
      const errorText = await commentsResponse.text();
      console.log(`  Error: ${errorText}`);
    } else {
      const data = await commentsResponse.json();
      console.log(`  Success: Got ${Array.isArray(data) ? data.length : 'unknown'} comments`);
    }

    // Test Stage 1 functions to compare
    console.log('\n2️⃣ Testing Stage 1 functions for comparison...\n');
    
    console.log('Testing save_user_onboarding_data:');
    const onboardingResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '71a36ee6-8ef6-4272-950f-25ab54de806d',
        p_avatar_url: 'https://example.com/test.jpg',
        p_contact_sync_enabled: false
      })
    });
    
    console.log(`  Status: ${onboardingResponse.status}`);
    if (!onboardingResponse.ok) {
      const errorText = await onboardingResponse.text();
      console.log(`  Error: ${errorText}`);
    } else {
      console.log('  Success: Stage 1 function working');
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('If Stage 1 functions work but Stage 2 functions return 404,');
    console.log('it suggests the Stage 2 functions were not created properly.');
    console.log('Possible causes:');
    console.log('• SQL execution failed silently');
    console.log('• Transaction rollback');
    console.log('• Permission issues');
    console.log('• Function signature mismatch');

  } catch (error) {
    console.error('💥 Debug error:', error.message);
  }
}

// Run the debug
debugFunctions().catch(console.error); 