// Debug Stage 2 Implementation Error
async function debugStage2Error() {
  console.log('🔍 DEBUGGING STAGE 2 ERROR: popularity_score column missing');
  console.log('===========================================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  try {
    // Test 1: Check if media_items table exists
    console.log('1️⃣ Checking if media_items table exists...');
    const tableResponse = await fetch(`${supabaseUrl}/rest/v1/media_items?limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (tableResponse.ok) {
      console.log('✅ media_items table exists');
    } else if (tableResponse.status === 404) {
      console.log('❌ media_items table does NOT exist');
    } else {
      console.log('⚠️ media_items table status unclear:', tableResponse.status);
    }

    // Test 2: Check if posts table exists  
    console.log('\n2️⃣ Checking if posts table exists...');
    const postsResponse = await fetch(`${supabaseUrl}/rest/v1/posts?limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (postsResponse.ok) {
      console.log('✅ posts table exists');
    } else if (postsResponse.status === 404) {
      console.log('❌ posts table does NOT exist');
    } else {
      console.log('⚠️ posts table status unclear:', postsResponse.status);
    }

    // Test 3: Check if user_follows table exists
    console.log('\n3️⃣ Checking if user_follows table exists...');
    const followsResponse = await fetch(`${supabaseUrl}/rest/v1/user_follows?limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (followsResponse.ok) {
      console.log('✅ user_follows table exists');
    } else if (followsResponse.status === 404) {
      console.log('❌ user_follows table does NOT exist');
    } else {
      console.log('⚠️ user_follows table status unclear:', followsResponse.status);
    }

    // Test 4: Check Stage 2 RPC functions
    console.log('\n4️⃣ Testing Stage 2 RPC functions...');
    
    // Test get_user_feed
    const feedResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_feed`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_limit: 5
      })
    });
    
    if (feedResponse.status === 200) {
      console.log('✅ get_user_feed function exists and working');
    } else if (feedResponse.status === 404) {
      console.log('❌ get_user_feed function does NOT exist');
    } else {
      console.log('⚠️ get_user_feed function status:', feedResponse.status);
    }

    // Test create_post  
    const createPostResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_post`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_content: 'Test post'
      })
    });
    
    if (createPostResponse.status === 200) {
      console.log('✅ create_post function exists and working');
    } else if (createPostResponse.status === 404) {
      console.log('❌ create_post function does NOT exist');
    } else {
      console.log('⚠️ create_post function status:', createPostResponse.status);
    }

    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('The "popularity_score" error suggests:');
    console.log('1. media_items table creation may have failed');
    console.log('2. But index creation tried to reference missing column'); 
    console.log('3. Script execution stopped at that point');
    console.log('\n💡 SOLUTION: Run the fix script to complete Stage 2 setup');

  } catch (error) {
    console.error('💥 Diagnostic error:', error.message);
  }
}

// Run the diagnostic
debugStage2Error().catch(console.error); 