// Diagnostic script to understand current table structure issues
// This will help us identify the foreign key constraint problems

const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function diagnoseTableStructure() {
  console.log('🔬 DIAGNOSING TABLE STRUCTURE ISSUES');
  console.log('====================================\n');

  try {
    // 1. Check user_profiles table structure
    console.log('1️⃣ Checking user_profiles table structure...');
    const profilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (profilesResponse.ok) {
      const profiles = await profilesResponse.json();
      console.log('✅ user_profiles table accessible');
      console.log(`📊 Rows in table: ${profiles.length}`);
      
      if (profiles.length > 0) {
        console.log(`📋 Columns: ${Object.keys(profiles[0]).join(', ')}`);
        console.log(`📝 Sample record:`, profiles[0]);
      } else {
        console.log('📋 No records in user_profiles table');
        
        // Check if we can get column structure via HTTP headers
        const headResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=0`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          }
        });
        console.log('📋 Table exists but is empty');
      }
    } else {
      console.log('❌ user_profiles table issue:', profilesResponse.status);
    }

    // 2. Check user_media_preferences table structure  
    console.log('\n2️⃣ Checking user_media_preferences table structure...');
    const mediaPrefsResponse = await fetch(`${supabaseUrl}/rest/v1/user_media_preferences?limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (mediaPrefsResponse.ok) {
      const mediaPrefs = await mediaPrefsResponse.json();
      console.log('✅ user_media_preferences table accessible');
      console.log(`📊 Rows in table: ${mediaPrefs.length}`);
      
      if (mediaPrefs.length > 0) {
        console.log(`📋 Columns: ${Object.keys(mediaPrefs[0]).join(', ')}`);
      } else {
        console.log('📋 No records in user_media_preferences table');
      }
    } else {
      console.log('❌ user_media_preferences table issue:', mediaPrefsResponse.status);
      const errorText = await mediaPrefsResponse.text();
      console.log('   Error details:', errorText);
    }

    // 3. Test creating a minimal user profile manually
    console.log('\n3️⃣ Testing manual user profile creation...');
    const testUserId = 'test-profile-' + Date.now();
    
    const createProfileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: testUserId,
        username: 'test_user_' + Date.now(),
        display_name: 'Test User',
        email_hash: 'test_hash_' + Date.now(),
        onboarding_completed: false,
        contact_sync_enabled: false
      })
    });

    if (createProfileResponse.ok) {
      const createdProfile = await createProfileResponse.json();
      console.log('✅ Manual profile creation works!');
      console.log('📋 Created profile:', createdProfile[0]);
      
      // Now test if we can create media preferences for this user
      console.log('\n4️⃣ Testing media preferences with manual profile...');
      const createMediaPrefResponse = await fetch(`${supabaseUrl}/rest/v1/user_media_preferences`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: testUserId,
          media_id: 'test_movie_123',
          title: 'Test Movie',
          media_type: 'movie',
          year: '2024',
          source: 'tmdb',
          added_during_onboarding: true
        })
      });

      if (createMediaPrefResponse.ok) {
        console.log('✅ Media preferences creation works with manual profile!');
        const createdMediaPref = await createMediaPrefResponse.json();
        console.log('📋 Created media preference:', createdMediaPref[0]);
      } else {
        console.log('❌ Media preferences creation failed even with manual profile');
        const errorText = await createMediaPrefResponse.text();
        console.log('   Error:', errorText);
      }
    } else {
      console.log('❌ Manual profile creation failed');
      const errorText = await createProfileResponse.text();
      console.log('   Error:', errorText);
    }

    // 5. Test the actual signup process step by step
    console.log('\n5️⃣ Testing actual signup process...');
    const testEmail = `diagnose_${Date.now()}@test.com`;
    const testPassword = 'DiagnosePassword123!';
    
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

    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      const realUserId = signupData.user?.id;
      console.log('✅ Real signup successful, user ID:', realUserId);
      
      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check what actually got created
      const profileCheckResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      
      if (profileCheckResponse.ok) {
        const allProfiles = await profileCheckResponse.json();
        console.log(`📊 Total profiles after signup: ${allProfiles.length}`);
        
        // Look for our specific user
        const ourProfile = allProfiles.find(p => p.user_id === realUserId || p.id === realUserId);
        if (ourProfile) {
          console.log('✅ Profile was created by trigger!');
          console.log('📋 Profile structure:', Object.keys(ourProfile));
          console.log('📝 Profile data:', ourProfile);
        } else {
          console.log('❌ No profile found for our user ID');
          console.log('📋 Available profiles:', allProfiles.map(p => ({ user_id: p.user_id, id: p.id, username: p.username })));
        }
      }
    } else {
      console.log('❌ Real signup failed');
      const errorText = await signupResponse.text();
      console.log('   Error:', errorText);
    }

  } catch (error) {
    console.error('💥 Diagnosis failed:', error.message);
  }
}

// Run the diagnosis
diagnoseTableStructure()
  .then(() => console.log('\n🏁 Table structure diagnosis complete!'))
  .catch(error => console.error('💥 Diagnosis error:', error.message)); 