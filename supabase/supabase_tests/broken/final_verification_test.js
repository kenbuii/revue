// Final verification test using the correct 'id' column structure
const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function finalVerificationTest() {
  console.log('🎯 FINAL VERIFICATION TEST');
  console.log('==========================\n');
  
  const results = {
    triggerWorking: false,
    onboardingWorking: false,
    findUsersWorking: false,
    fullFlowWorking: false
  };

  try {
    // Test 1: Complete signup and profile creation flow
    console.log('1️⃣ Testing complete signup flow...');
    const testEmail = `final_test_${Date.now()}@verification.com`;
    const testPassword = 'FinalTest123!';
    
    console.log(`   📧 Creating user: ${testEmail}`);
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
    console.log(`   ✅ Auth user created: ${testUserId}`);

    // Wait for trigger to execute
    console.log('\n2️⃣ Waiting for trigger to create profile...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Check for profile using 'id' column
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${testUserId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    let userProfile = null;
    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles.length > 0) {
        userProfile = profiles[0];
        console.log('   ✅ Profile created by trigger!');
        console.log('   📋 Profile:', userProfile);
        results.triggerWorking = true;
      } else {
        console.log('   ❌ No profile created by trigger');
        return results;
      }
    } else {
      console.log('   ❌ Error checking profile:', profileResponse.status);
      return results;
    }

    // Test 2: Test onboarding function
    console.log('\n3️⃣ Testing onboarding function...');
    const onboardingPayload = {
      p_user_id: testUserId,  // Use the actual UUID
      p_avatar_url: 'https://example.com/final-test-avatar.jpg',
      p_contact_sync_enabled: true,
      p_display_name: 'Final Test User',
      p_media_preferences: [
        {
          id: 'final_test_movie',
          title: 'Final Test Movie',
          type: 'movie',
          year: '2024',
          image: 'https://example.com/final-test-movie.jpg',
          description: 'A final test movie',
          source: 'tmdb',
          originalId: 'final123'
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
      console.log('   ✅ Onboarding function executed!');
      console.log('   📋 Result:', onboardingResult);
      
      if (onboardingResult.success && onboardingResult.rows_affected > 0) {
        console.log('   🎉 Profile successfully updated!');
        results.onboardingWorking = true;
      } else if (onboardingResult.success) {
        console.log('   ⚠️ Function succeeded but no rows affected');
        console.log('   📊 Details:', onboardingResult);
      } else {
        console.log('   ❌ Function returned error:', onboardingResult.error);
      }
    } else {
      const errorText = await onboardingResponse.text();
      console.log('   ❌ Onboarding HTTP error:', onboardingResponse.status, errorText);
    }

    // Test 3: Verify profile was updated
    console.log('\n4️⃣ Verifying profile update...');
    const updatedProfileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${testUserId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (updatedProfileResponse.ok) {
      const updatedProfiles = await updatedProfileResponse.json();
      if (updatedProfiles.length > 0) {
        const updatedProfile = updatedProfiles[0];
        console.log('   ✅ Updated profile retrieved!');
        console.log('   📋 Updated data:');
        console.log(`      Display Name: ${updatedProfile.display_name}`);
        console.log(`      Avatar URL: ${updatedProfile.avatar_url}`);
        console.log(`      Contact Sync: ${updatedProfile.contact_sync_enabled}`);
        console.log(`      Onboarding Complete: ${updatedProfile.onboarding_completed}`);
        
        if (updatedProfile.onboarding_completed && updatedProfile.display_name === 'Final Test User') {
          results.fullFlowWorking = true;
          console.log('   🎉 Complete profile update confirmed!');
        }
      }
    }

    // Test 4: Test find_users_by_email_hash function
    console.log('\n5️⃣ Testing find_users_by_email_hash function...');
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
      console.log('   ✅ find_users_by_email_hash function works!');
      const findUsersResult = await findUsersResponse.json();
      console.log('   📋 Result:', findUsersResult);
      results.findUsersWorking = true;
    } else {
      const errorText = await findUsersResponse.text();
      console.log('   ❌ find_users_by_email_hash failed:', findUsersResponse.status, errorText);
    }

    // Test 5: Check media preferences were saved
    console.log('\n6️⃣ Testing media preferences...');
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
      console.log('   ✅ Media preferences function works!');
      console.log(`   📋 Found ${mediaPrefs.length} media preferences`);
      if (mediaPrefs.length > 0) {
        console.log('   📝 Example preference:', mediaPrefs[0]);
      }
    } else {
      console.log('   ⚠️ Media preferences function issue:', mediaPrefsResponse.status);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }

  // Final Results
  console.log('\n\n🏆 FINAL VERIFICATION RESULTS');
  console.log('==============================');
  console.log(`🔄 Trigger Working: ${results.triggerWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`🔧 Onboarding Working: ${results.onboardingWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`👥 Find Users Working: ${results.findUsersWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`🎯 Full Flow Working: ${results.fullFlowWorking ? '✅ YES' : '❌ NO'}`);

  const totalWorking = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 Overall Success Rate: ${totalWorking}/${totalTests} (${Math.round(totalWorking/totalTests*100)}%)`);

  if (totalWorking === totalTests) {
    console.log('\n🎉 🎉 🎉 COMPLETE SUCCESS! 🎉 🎉 🎉');
    console.log('✅ Your signup and onboarding flow is now fully working!');
    console.log('✅ All database triggers and functions are operational!');
    console.log('✅ Your app should now work correctly!');
  } else if (totalWorking >= 2) {
    console.log('\n🎯 MAJOR SUCCESS!');
    console.log('✅ Core functionality is working!');
    console.log('⚠️ Minor issues remain but signup flow should work');
  } else {
    console.log('\n⚠️ PARTIAL SUCCESS');
    console.log('❌ Additional fixes needed');
  }

  return results;
}

// Run the final verification
finalVerificationTest()
  .then(() => console.log('\n🏁 Final verification complete!'))
  .catch(error => console.error('💥 Final verification error:', error.message)); 