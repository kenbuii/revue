// Test after applying the column mismatch fix
// This handles both user_profiles.id and user_profiles.user_id structures

const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function testAfterColumnFix() {
  console.log('🧪 Testing After Column Mismatch Fix');
  console.log('====================================\n');

  let results = {
    triggerWorking: false,
    onboardingWorking: false,
    columnStructureCorrect: false
  };

  try {
    // Step 1: Test signup and profile creation
    console.log('1️⃣ Testing signup with trigger...');
    const testEmail = `column_fix_${Date.now()}@test.com`;
    const testPassword = 'ColumnFixPassword123!';
    
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

    // Step 2: Wait for trigger and check both possible column structures
    console.log('\n2️⃣ Waiting for trigger and checking profile creation...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Try both possible query patterns
    let profileFound = null;
    let columnUsed = null;

    // First try user_id column
    try {
      const profileResponse1 = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${testUserId}`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });

      if (profileResponse1.ok) {
        const profiles1 = await profileResponse1.json();
        if (profiles1.length > 0) {
          profileFound = profiles1[0];
          columnUsed = 'user_id';
        }
      }
    } catch (e) {
      console.log('   user_id query failed:', e.message);
    }

    // If not found, try id column
    if (!profileFound) {
      try {
        const profileResponse2 = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${testUserId}`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          }
        });

        if (profileResponse2.ok) {
          const profiles2 = await profileResponse2.json();
          if (profiles2.length > 0) {
            profileFound = profiles2[0];
            columnUsed = 'id';
          }
        }
      } catch (e) {
        console.log('   id query failed:', e.message);
      }
    }

    // Check results
    if (profileFound) {
      console.log(`✅ Profile found using column: ${columnUsed}!`);
      console.log('📋 Profile data:', profileFound);
      console.log('📋 Profile structure:', Object.keys(profileFound).join(', '));
      results.triggerWorking = true;
      results.columnStructureCorrect = true;

      // Step 3: Test onboarding function
      console.log('\n3️⃣ Testing onboarding function with real user...');
      
      // Build the user ID for the onboarding function
      const userIdForOnboarding = columnUsed === 'user_id' ? profileFound.user_id : profileFound.id;
      
      const onboardingPayload = {
        p_user_id: userIdForOnboarding,
        p_avatar_url: 'https://example.com/test-avatar.jpg',
        p_contact_sync_enabled: true,
        p_display_name: 'Column Fix Test User',
        p_media_preferences: [
          {
            id: 'test_movie_column_fix',
            title: 'Column Fix Movie',
            type: 'movie',
            year: '2024',
            image: 'https://example.com/test-movie.jpg',
            description: 'A test movie for column fix verification',
            source: 'tmdb',
            originalId: 'test456'
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
        console.log('✅ Onboarding function response received!');
        console.log('📋 Result:', onboardingResult);
        
        if (onboardingResult.success && onboardingResult.rows_affected > 0) {
          console.log('🎉 Onboarding function successfully updated profile!');
          results.onboardingWorking = true;
        } else if (onboardingResult.success) {
          console.log('⚠️ Onboarding function succeeded but no rows affected');
          console.log('   This might indicate the user lookup is still failing');
        } else {
          console.log('❌ Onboarding function returned error:', onboardingResult.error);
        }
      } else {
        console.log('❌ Onboarding function HTTP error:', onboardingResponse.status);
        const errorText = await onboardingResponse.text();
        console.log('   Error details:', errorText);
      }

      // Step 4: Verify the updated profile
      console.log('\n4️⃣ Checking updated profile...');
      const checkQuery = columnUsed === 'user_id' ? 
        `user_id=eq.${userIdForOnboarding}` : 
        `id=eq.${userIdForOnboarding}`;
        
      const updatedProfileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?${checkQuery}`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });

      if (updatedProfileResponse.ok) {
        const updatedProfiles = await updatedProfileResponse.json();
        if (updatedProfiles.length > 0) {
          const updatedProfile = updatedProfiles[0];
          console.log('✅ Updated profile retrieved!');
          console.log('📋 Updated profile data:');
          console.log(`   Display Name: ${updatedProfile.display_name}`);
          console.log(`   Avatar URL: ${updatedProfile.avatar_url}`);
          console.log(`   Contact Sync: ${updatedProfile.contact_sync_enabled}`);
          console.log(`   Onboarding Complete: ${updatedProfile.onboarding_completed}`);
        }
      }

    } else {
      console.log('❌ No profile found with either column structure');
      console.log('   Checking all profiles in table...');
      
      const allProfilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      
      if (allProfilesResponse.ok) {
        const allProfiles = await allProfilesResponse.json();
        console.log(`📊 Total profiles in table: ${allProfiles.length}`);
        if (allProfiles.length > 0) {
          console.log('📋 Sample profile:', allProfiles[0]);
          console.log('📋 Available columns:', Object.keys(allProfiles[0]).join(', '));
        }
      }
    }

    // Step 5: Test find_users_by_email_hash function
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

    console.log(`   Response status: ${findUsersResponse.status}`);
    if (findUsersResponse.ok) {
      const findUsersResult = await findUsersResponse.json();
      console.log('✅ find_users_by_email_hash function works!');
      console.log('📋 Result:', findUsersResult);
    } else {
      const errorText = await findUsersResponse.text();
      console.log('❌ find_users_by_email_hash failed:', errorText);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }

  // Final Results
  console.log('\n\n📊 TEST RESULTS AFTER COLUMN FIX');
  console.log('=================================');
  console.log(`🔄 Trigger Working: ${results.triggerWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`📊 Column Structure Correct: ${results.columnStructureCorrect ? '✅ YES' : '❌ NO'}`);
  console.log(`🔧 Onboarding Working: ${results.onboardingWorking ? '✅ YES' : '❌ NO'}`);

  const totalWorking = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 Success Rate: ${totalWorking}/${totalTests} (${Math.round(totalWorking/totalTests*100)}%)`);

  if (results.triggerWorking && results.onboardingWorking) {
    console.log('\n🎉 SUCCESS: Column mismatch fixed! Your signup flow should now work!');
  } else {
    console.log('\n⚠️ PARTIAL SUCCESS: Some issues may remain.');
  }

  return results;
}

// Run the test
testAfterColumnFix()
  .then(() => console.log('\n🏁 Column fix test complete!'))
  .catch(error => console.error('💥 Test error:', error.message)); 