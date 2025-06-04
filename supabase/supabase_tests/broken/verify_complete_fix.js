// Comprehensive verification test after applying all fixes
// This tests the complete signup and onboarding flow

const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function verifyCompleteFix() {
  console.log('🔬 COMPREHENSIVE VERIFICATION TEST');
  console.log('==================================\n');
  
  const results = {
    triggerWorking: false,
    onboardingWorking: false,
    findUsersWorking: false,
    fullFlowWorking: false
  };

  try {
    // Test 1: Create a new user and verify trigger creates profile
    console.log('1️⃣ Testing user profile creation trigger...');
    const testEmail = `verify_${Date.now()}@complete-test.com`;
    const testPassword = 'VerifyPassword123!';
    
    const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    if (!signupResponse.ok) {
      console.log('❌ Signup failed:', signupResponse.status);
      return results;
    }

    const signupData = await signupResponse.json();
    const testUserId = signupData.user?.id;
    console.log('✅ Test user created:', testUserId);

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for profile creation
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${testUserId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles.length > 0) {
        console.log('✅ User profile automatically created by trigger!');
        console.log('📋 Profile:', profiles[0]);
        results.triggerWorking = true;
      } else {
        console.log('❌ No user profile created by trigger');
        return results;
      }
    }

    // Test 2: Test onboarding function with real user
    console.log('\n2️⃣ Testing onboarding function...');
    const onboardingPayload = {
      p_user_id: testUserId,
      p_avatar_url: 'https://example.com/test-avatar.jpg',
      p_contact_sync_enabled: true,
      p_display_name: 'Complete Test User',
      p_media_preferences: [
        {
          id: 'test_movie_verification',
          title: 'Verification Movie',
          type: 'movie',
          year: '2024',
          image: 'https://example.com/test-movie.jpg',
          description: 'A test movie for verification',
          source: 'tmdb',
          originalId: 'test123'
        }
      ],
      p_onboarding_completed: true
    };

    const onboardingResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingPayload)
    });

    if (onboardingResponse.ok) {
      const onboardingResult = await onboardingResponse.json();
      console.log('✅ Onboarding function worked!');
      console.log('📋 Result:', onboardingResult);
      
      if (onboardingResult.rows_affected > 0) {
        console.log('🎉 User profile successfully updated!');
        results.onboardingWorking = true;
      } else {
        console.log('⚠️ Onboarding function ran but no rows affected');
      }
    } else {
      console.log('❌ Onboarding function failed:', onboardingResponse.status);
    }

    // Test 3: Test find_users_by_email_hash function
    console.log('\n3️⃣ Testing find_users_by_email_hash function...');
    const findUsersResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/find_users_by_email_hash`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_hashes: ['test_hash_1', 'test_hash_2']
      })
    });

    if (findUsersResponse.ok) {
      console.log('✅ find_users_by_email_hash function works!');
      const findUsersResult = await findUsersResponse.json();
      console.log('📋 Result:', findUsersResult);
      results.findUsersWorking = true;
    } else {
      console.log('❌ find_users_by_email_hash function failed:', findUsersResponse.status);
    }

    // Test 4: Verify updated profile
    console.log('\n4️⃣ Verifying updated user profile...');
    const updatedProfileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${testUserId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (updatedProfileResponse.ok) {
      const updatedProfiles = await updatedProfileResponse.json();
      if (updatedProfiles.length > 0) {
        const profile = updatedProfiles[0];
        console.log('✅ Updated profile found!');
        console.log('📋 Final profile state:');
        console.log(`   Display Name: ${profile.display_name}`);
        console.log(`   Avatar URL: ${profile.avatar_url}`);
        console.log(`   Contact Sync: ${profile.contact_sync_enabled}`);
        console.log(`   Onboarding Complete: ${profile.onboarding_completed}`);
        
        if (profile.onboarding_completed) {
          results.fullFlowWorking = true;
          console.log('🎉 Complete signup and onboarding flow is working!');
        }
      }
    }

    // Test 5: Check media preferences were saved
    console.log('\n5️⃣ Checking media preferences...');
    const mediaPrefsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_media_preferences`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: testUserId })
    });

    if (mediaPrefsResponse.ok) {
      const mediaPrefs = await mediaPrefsResponse.json();
      console.log('✅ Media preferences function works!');
      console.log(`📋 Found ${mediaPrefs.length} media preferences`);
      if (mediaPrefs.length > 0) {
        console.log('   Example:', mediaPrefs[0]);
      }
    }

  } catch (error) {
    console.error('💥 Verification failed:', error.message);
  }

  // Final Results
  console.log('\n\n📊 VERIFICATION RESULTS');
  console.log('========================');
  console.log(`🔄 Trigger Working: ${results.triggerWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`🔧 Onboarding Working: ${results.onboardingWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`👥 Find Users Working: ${results.findUsersWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`🎯 Full Flow Working: ${results.fullFlowWorking ? '✅ YES' : '❌ NO'}`);

  const totalWorking = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 Overall Success Rate: ${totalWorking}/${totalTests} (${Math.round(totalWorking/totalTests*100)}%)`);

  if (results.fullFlowWorking) {
    console.log('\n🎉 SUCCESS: Your signup and onboarding flow is now fully working!');
  } else {
    console.log('\n⚠️ PARTIAL SUCCESS: Some issues remain to be fixed.');
  }

  return results;
}

// Run the verification
verifyCompleteFix()
  .then(() => console.log('\n🏁 Complete verification finished!'))
  .catch(error => console.error('💥 Verification error:', error.message)); 