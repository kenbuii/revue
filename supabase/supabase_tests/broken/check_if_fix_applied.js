// Check if the direct_working_fix.sql was actually applied
const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function checkIfFixApplied() {
  console.log('🔍 CHECKING IF SQL FIX WAS APPLIED');
  console.log('==================================\n');

  try {
    // Check 1: Does the trigger exist?
    console.log('1️⃣ Checking if trigger exists...');
    try {
      const triggerCheckResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql_query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            SELECT 
              tgname as trigger_name,
              tgenabled as enabled,
              pg_get_triggerdef(oid) as definition
            FROM pg_trigger 
            WHERE tgname = 'on_auth_user_created'
          `
        })
      });

      if (triggerCheckResponse.status === 404) {
        console.log('   ⚠️ sql_query function not available - checking indirectly');
      } else if (triggerCheckResponse.ok) {
        const result = await triggerCheckResponse.json();
        console.log('   📋 Trigger check result:', result);
      }
    } catch (e) {
      console.log('   ⚠️ Cannot check trigger directly');
    }

    // Check 2: Can we call the handle_new_user function?
    console.log('\n2️⃣ Testing if handle_new_user function exists...');
    const handleNewUserResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/handle_new_user`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    console.log(`   Status: ${handleNewUserResponse.status}`);
    if (handleNewUserResponse.status === 404) {
      console.log('   ❌ handle_new_user function NOT FOUND');
      console.log('   🚨 SQL fix was NOT applied correctly!');
    } else if (handleNewUserResponse.status === 400) {
      console.log('   ✅ handle_new_user function EXISTS (400 = function exists but needs trigger context)');
    } else {
      const result = await handleNewUserResponse.text();
      console.log('   📋 Response:', result);
    }

    // Check 3: Can we call save_user_onboarding_data?
    console.log('\n3️⃣ Testing save_user_onboarding_data function...');
    const onboardingResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_username: 'test'
      })
    });

    console.log(`   Status: ${onboardingResponse.status}`);
    if (onboardingResponse.status === 404) {
      console.log('   ❌ save_user_onboarding_data function NOT FOUND');
    } else {
      console.log('   ✅ save_user_onboarding_data function EXISTS');
      const result = await onboardingResponse.json();
      console.log('   📋 Test result:', result);
    }

    // Check 4: Can we call find_users_by_email_hash?
    console.log('\n4️⃣ Testing find_users_by_email_hash function...');
    const findUsersResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/find_users_by_email_hash`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_hashes: ['test_hash']
      })
    });

    console.log(`   Status: ${findUsersResponse.status}`);
    if (findUsersResponse.status === 404) {
      console.log('   ❌ find_users_by_email_hash function NOT FOUND');
    } else {
      console.log('   ✅ find_users_by_email_hash function EXISTS');
      const result = await findUsersResponse.json();
      console.log('   📋 Test result:', result);
    }

    // Check 5: Manual trigger test
    console.log('\n5️⃣ Testing manual profile creation with correct UUID format...');
    const testUuid = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
    
    const manualCreateResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: testUuid,
        username: 'manual_test',
        display_name: 'Manual Test',
        email_hash: 'manual_test_hash',
        onboarding_completed: false,
        contact_sync_enabled: false
      })
    });

    console.log(`   Manual creation status: ${manualCreateResponse.status}`);
    if (manualCreateResponse.ok) {
      const result = await manualCreateResponse.json();
      console.log('   ✅ Manual profile creation works!');
      console.log('   📋 Created:', result[0]);
      
      // Clean up
      await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${testUuid}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      console.log('   🧹 Test profile cleaned up');
    } else {
      const errorText = await manualCreateResponse.text();
      console.log('   ❌ Manual creation failed:', errorText);
    }

  } catch (error) {
    console.error('💥 Check failed:', error.message);
  }

  console.log('\n📊 DIAGNOSIS:');
  console.log('==============');
  console.log('If all functions exist but trigger still fails:');
  console.log('🔧 Issue: Trigger exists but has runtime error');
  console.log('💡 Solution: Apply the trigger fix with better error handling');
  console.log('');
  console.log('If functions are missing:');
  console.log('🔧 Issue: SQL fix was not applied to database');
  console.log('💡 Solution: Apply direct_working_fix.sql to Supabase');
}

// Run the check
checkIfFixApplied()
  .then(() => console.log('\n🏁 Check complete!'))
  .catch(error => console.error('💥 Check error:', error.message)); 