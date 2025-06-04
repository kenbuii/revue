// Test user profile creation trigger
// This tests if new users automatically get user_profile records created

const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function testUserProfileCreation() {
  console.log('🧪 Testing User Profile Creation Trigger');
  console.log('========================================\n');

  try {
    // Step 1: Create a test auth user
    console.log('1️⃣ Creating test auth user...');
    const testEmail = `test_${Date.now()}@profile-test.com`;
    const testPassword = 'TestPassword123!';
    
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
      const errorText = await signupResponse.text();
      console.log('❌ Signup failed:', signupResponse.status, errorText);
      return;
    }

    const signupData = await signupResponse.json();
    console.log('✅ Test user created:', signupData.user?.id);
    const testUserId = signupData.user?.id;

    if (!testUserId) {
      console.log('❌ No user ID returned from signup');
      return;
    }

    // Step 2: Wait for trigger to execute
    console.log('\n2️⃣ Waiting for trigger to execute...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Check if user_profile was created
    console.log('\n3️⃣ Checking if user_profile was created...');
    
    // First try with user_id column
    const profileResponse1 = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${testUserId}&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (profileResponse1.ok) {
      const profileData1 = await profileResponse1.json();
      if (profileData1.length > 0) {
        console.log('✅ User profile created with user_id column!');
        console.log('📋 Profile:', profileData1[0]);
        console.log('   Columns:', Object.keys(profileData1[0]).join(', '));
        
        // Test the onboarding function with this real user
        await testOnboardingFunction(testUserId);
        return;
      }
    }

    // Try with id column as fallback
    const profileResponse2 = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${testUserId}&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (profileResponse2.ok) {
      const profileData2 = await profileResponse2.json();
      if (profileData2.length > 0) {
        console.log('✅ User profile created with id column!');
        console.log('📋 Profile:', profileData2[0]);
        console.log('   Columns:', Object.keys(profileData2[0]).join(', '));
        
        // Test the onboarding function with this real user
        await testOnboardingFunction(testUserId);
        return;
      }
    }

    // No profile found
    console.log('❌ User profile NOT created by trigger');
    console.log('   This indicates the trigger is not working');
    
    // Let's manually check what's in the user_profiles table
    console.log('\n4️⃣ Checking user_profiles table structure...');
    const allProfilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=5`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (allProfilesResponse.ok) {
      const allProfiles = await allProfilesResponse.json();
      console.log(`📊 Total profiles in table: ${allProfiles.length}`);
      if (allProfiles.length > 0) {
        console.log(`📋 Example profile structure: ${Object.keys(allProfiles[0]).join(', ')}`);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

async function testOnboardingFunction(userId) {
  console.log('\n5️⃣ Testing onboarding function with real user...');
  
  const payload = {
    p_user_id: userId,
    p_avatar_url: 'https://example.com/avatar.jpg',
    p_contact_sync_enabled: true,
    p_display_name: 'Test User Profile',
    p_media_preferences: [
      {
        id: 'test_movie_1',
        title: 'Test Movie',
        type: 'movie',
        year: '2024',
        image: 'https://example.com/movie.jpg',
        description: 'A test movie',
        source: 'tmdb',
        originalId: '12345'
      }
    ],
    p_onboarding_completed: true
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Onboarding function worked!');
      console.log('📋 Result:', result);
      
      if (result.rows_affected > 0) {
        console.log('🎉 Successfully updated user profile!');
      } else {
        console.log('⚠️ Function ran but no rows were affected');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Onboarding function failed:', response.status, errorText);
    }
  } catch (error) {
    console.log('❌ Onboarding test error:', error.message);
  }
}

// Run the test
testUserProfileCreation()
  .then(() => console.log('\n🏁 User profile creation test complete!'))
  .catch(error => console.error('💥 Test failed:', error.message)); 