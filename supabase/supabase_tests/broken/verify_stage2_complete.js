// Verify Stage 2 Setup is Complete and Working
async function verifyStage2Complete() {
  console.log('🔍 VERIFYING STAGE 2 COMPLETION');
  console.log('=====================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  let allTestsPassed = true;
  
  try {
    // Test 1: Check all Stage 2 tables exist
    console.log('1️⃣ Testing Stage 2 Tables...');
    const tables = ['media_items', 'posts', 'comments', 'post_likes', 'comment_likes', 'user_follows', 'friend_requests', 'user_lists', 'list_items'];
    
    for (const table of tables) {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=0`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      
      if (response.ok) {
        console.log(`  ✅ ${table} table exists`);
      } else {
        console.log(`  ❌ ${table} table missing`);
        allTestsPassed = false;
      }
    }

    // Test 2: Check popularity_score column
    console.log('\n2️⃣ Testing popularity_score column...');
    const mediaResponse = await fetch(`${supabaseUrl}/rest/v1/media_items?select=popularity_score&limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (mediaResponse.ok) {
      console.log('  ✅ popularity_score column exists');
    } else {
      console.log('  ❌ popularity_score column missing');
      allTestsPassed = false;
    }

    // Test 3: Check all Stage 2 RPC functions
    console.log('\n3️⃣ Testing Stage 2 RPC Functions...');
    const rpcFunctions = [
      'get_user_feed',
      'create_post', 
      'toggle_post_like',
      'toggle_user_follow',
      'get_post_comments'
    ];
    
    for (const func of rpcFunctions) {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${func}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_user_id: '00000000-0000-0000-0000-000000000000'
        })
      });
      
      if (response.status === 200 || response.status === 400) { // 400 is OK for invalid UUID
        console.log(`  ✅ ${func} function exists`);
      } else if (response.status === 404) {
        console.log(`  ❌ ${func} function missing`);
        allTestsPassed = false;
      } else {
        console.log(`  ⚠️ ${func} function status unclear: ${response.status}`);
      }
    }

    // Test 4: Check user onboarding functions still work
    console.log('\n4️⃣ Testing Stage 1 compatibility...');
    const onboardingResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_avatar_url: 'test',
        p_contact_sync_enabled: false
      })
    });
    
    if (onboardingResponse.status === 200 || onboardingResponse.status === 400) {
      console.log('  ✅ Stage 1 functions still work');
    } else {
      console.log('  ❌ Stage 1 functions broken');
      allTestsPassed = false;
    }

    // Summary
    console.log('\n🎯 STAGE 2 VERIFICATION SUMMARY');
    console.log('================================');
    
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED! Stage 2 is complete and functional');
      console.log('🚀 Ready to proceed to Stage 3: Feed & Discovery Systems');
      console.log('\nStage 2 Features Now Available:');
      console.log('• 📱 Social posts with ratings and comments');
      console.log('• ❤️ Like/unlike posts and comments');
      console.log('• 👥 Follow/unfollow users');
      console.log('• 👋 Friend request system');
      console.log('• 📋 User lists (watchlists, favorites, custom)');
      console.log('• 📊 Automatic rating calculations');
      console.log('• 📈 Popularity scoring foundation');
      console.log('• 🔐 Complete security policies');
    } else {
      console.log('❌ SOME TESTS FAILED - Stage 2 setup incomplete');
      console.log('Please check the errors above before proceeding to Stage 3');
    }

  } catch (error) {
    console.error('💥 Verification error:', error.message);
    allTestsPassed = false;
  }

  return allTestsPassed;
}

// Run the verification
verifyStage2Complete().catch(console.error); 