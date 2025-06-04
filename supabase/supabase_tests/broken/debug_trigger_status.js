// Debug script to check trigger status and table structure after SQL fix
const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function debugTriggerStatus() {
  console.log('🔍 DEBUGGING TRIGGER STATUS AFTER SQL FIX');
  console.log('==========================================\n');

  try {
    // 1. Check if trigger exists and is enabled
    console.log('1️⃣ Checking trigger status...');
    const triggerCheckResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/check_trigger_status`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (triggerCheckResponse.status === 404) {
      console.log('⚠️ check_trigger_status function not found - will check manually');
    }

    // 2. Test manual profile creation to understand table structure
    console.log('\n2️⃣ Testing manual profile creation to understand table structure...');
    
    // Try creating with different column combinations
    const testUserId = `debug-${Date.now()}`;
    
    // Test 1: Try with 'id' column
    console.log('   Testing with "id" column...');
    try {
      const createWithIdResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: testUserId,
          username: 'debug_user_id',
          display_name: 'Debug User ID',
          email_hash: 'debug_hash_id',
          onboarding_completed: false,
          contact_sync_enabled: false
        })
      });

      if (createWithIdResponse.ok) {
        const result = await createWithIdResponse.json();
        console.log('   ✅ SUCCESS with "id" column!');
        console.log('   📋 Created profile:', result[0]);
        console.log('   📋 Columns:', Object.keys(result[0]).join(', '));
      } else {
        const errorText = await createWithIdResponse.text();
        console.log('   ❌ FAILED with "id" column:', createWithIdResponse.status, errorText);
      }
    } catch (e) {
      console.log('   ❌ ERROR with "id" column:', e.message);
    }

    // Test 2: Try with 'user_id' column
    console.log('\n   Testing with "user_id" column...');
    try {
      const createWithUserIdResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: testUserId + '_userid',
          username: 'debug_user_user_id',
          display_name: 'Debug User UserID',
          email_hash: 'debug_hash_user_id',
          onboarding_completed: false,
          contact_sync_enabled: false
        })
      });

      if (createWithUserIdResponse.ok) {
        const result = await createWithUserIdResponse.json();
        console.log('   ✅ SUCCESS with "user_id" column!');
        console.log('   📋 Created profile:', result[0]);
        console.log('   📋 Columns:', Object.keys(result[0]).join(', '));
      } else {
        const errorText = await createWithUserIdResponse.text();
        console.log('   ❌ FAILED with "user_id" column:', createWithUserIdResponse.status, errorText);
      }
    } catch (e) {
      console.log('   ❌ ERROR with "user_id" column:', e.message);
    }

    // 3. Check what profiles now exist
    console.log('\n3️⃣ Checking current profiles in table...');
    const allProfilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (allProfilesResponse.ok) {
      const allProfiles = await allProfilesResponse.json();
      console.log(`📊 Total profiles now: ${allProfiles.length}`);
      if (allProfiles.length > 0) {
        console.log('📋 Sample profile structure:', Object.keys(allProfiles[0]).join(', '));
        console.log('📝 Sample profile data:', allProfiles[0]);
      }
    }

    // 4. Test signup with detailed monitoring
    console.log('\n4️⃣ Testing signup with detailed monitoring...');
    const testEmail = `trigger_debug_${Date.now()}@test.com`;
    const testPassword = 'TriggerDebug123!';
    
    console.log(`   Creating user with email: ${testEmail}`);
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
      const newUserId = signupData.user?.id;
      console.log(`   ✅ Auth user created: ${newUserId}`);
      
      // Wait and check multiple times
      for (let i = 1; i <= 3; i++) {
        console.log(`   ⏱️ Waiting ${i * 2} seconds for trigger...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const profileCheckResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          }
        });
        
        if (profileCheckResponse.ok) {
          const profiles = await profileCheckResponse.json();
          const userProfile = profiles.find(p => 
            p.id === newUserId || p.user_id === newUserId
          );
          
          console.log(`   📊 Total profiles: ${profiles.length}`);
          if (userProfile) {
            console.log(`   ✅ Profile found after ${i * 2} seconds!`);
            console.log('   📋 Profile:', userProfile);
            break;
          } else {
            console.log(`   ❌ No profile found for user ${newUserId} after ${i * 2} seconds`);
            if (profiles.length > 0) {
              console.log('   📋 Available profiles:', profiles.map(p => ({ 
                id: p.id, 
                user_id: p.user_id, 
                username: p.username 
              })));
            }
          }
        }
      }
    } else {
      console.log('   ❌ Signup failed:', signupResponse.status);
    }

    // 5. Test calling the trigger function manually
    console.log('\n5️⃣ Testing manual trigger function call...');
    try {
      const manualTriggerResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/handle_new_user`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      console.log(`   Manual trigger call status: ${manualTriggerResponse.status}`);
      if (manualTriggerResponse.status === 404) {
        console.log('   ❌ handle_new_user function not accessible via RPC');
      } else {
        const result = await manualTriggerResponse.text();
        console.log('   📋 Manual trigger result:', result);
      }
    } catch (e) {
      console.log('   ❌ Manual trigger call error:', e.message);
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

// Run the debug
debugTriggerStatus()
  .then(() => console.log('\n🏁 Trigger debug complete!'))
  .catch(error => console.error('💥 Debug error:', error.message)); 