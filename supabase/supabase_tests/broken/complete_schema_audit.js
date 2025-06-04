// Complete schema audit - check everything the app needs
const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function completeSchemaAudit() {
  console.log('🔍 COMPLETE SCHEMA AUDIT');
  console.log('========================\n');

  const results = {
    trigger: { exists: false, working: false },
    profiles: { exists: false, hasData: false },
    functions: {},
    conflicts: [],
    missing: []
  };

  // Expected functions based on your app logs
  const expectedFunctions = [
    'save_user_onboarding_data',
    'get_user_bookmarks', 
    'add_bookmark',
    'get_user_media_preferences',
    'find_users_by_email_hash',
    'handle_new_user',
    'check_trigger_health',
    'test_trigger_manually'
  ];

  try {
    // 1. Check if user profiles exist and if current user has one
    console.log('1️⃣ Checking user profiles...');
    const currentUserId = '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'; // From your logs
    
    const profilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });

    if (profilesResponse.ok) {
      const profiles = await profilesResponse.json();
      results.profiles.exists = true;
      results.profiles.hasData = profiles.length > 0;
      
      console.log(`   📊 Total profiles in table: ${profiles.length}`);
      
      const currentUserProfile = profiles.find(p => p.id === currentUserId);
      if (currentUserProfile) {
        console.log('   ✅ Current user HAS profile');
        console.log('   📋 Profile data:', currentUserProfile);
      } else {
        console.log('   ❌ Current user MISSING profile');
        console.log('   🔍 Available profile IDs:', profiles.slice(0, 3).map(p => p.id));
      }
    } else {
      console.log('   ❌ Cannot access user_profiles table:', profilesResponse.status);
    }

    // 2. Check all expected functions
    console.log('\n2️⃣ Checking required functions...');
    
    for (const functionName of expectedFunctions) {
      console.log(`\n   🔍 Testing ${functionName}...`);
      
      try {
        let testPayload = {};
        
        // Customize test payload based on function
        switch (functionName) {
          case 'save_user_onboarding_data':
            testPayload = {
              p_user_id: currentUserId,
              p_username: 'test'
            };
            break;
          case 'get_user_bookmarks':
            testPayload = { target_user_id: currentUserId };
            break;
          case 'add_bookmark':
            testPayload = {
              target_user_id: currentUserId,
              p_post_id: 'test',
              p_media_id: 'test',
              p_media_title: 'test',
              p_media_type: 'movie'
            };
            break;
          case 'get_user_media_preferences':
            testPayload = { p_user_id: currentUserId };
            break;
          case 'find_users_by_email_hash':
            testPayload = { email_hashes: ['test'] };
            break;
          case 'check_trigger_health':
          case 'test_trigger_manually':
            testPayload = {};
            break;
          default:
            testPayload = {};
        }

        const functionResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload)
        });

        const status = functionResponse.status;
        
        if (status === 404) {
          results.functions[functionName] = 'MISSING';
          results.missing.push(functionName);
          console.log(`      ❌ MISSING (404)`);
        } else if (status === 300) {
          results.functions[functionName] = 'CONFLICT';
          results.conflicts.push(functionName);
          console.log(`      ⚠️ CONFLICT (300) - Multiple versions exist`);
          
          const errorData = await functionResponse.json();
          if (errorData.message && errorData.message.includes('Could not choose')) {
            console.log(`      📋 Conflict details: ${errorData.message.substring(0, 100)}...`);
          }
        } else if (status >= 200 && status < 300) {
          results.functions[functionName] = 'EXISTS';
          console.log(`      ✅ EXISTS (${status})`);
        } else {
          results.functions[functionName] = `ERROR_${status}`;
          console.log(`      ❌ ERROR (${status})`);
        }

      } catch (error) {
        results.functions[functionName] = 'ERROR';
        console.log(`      💥 ERROR: ${error.message}`);
      }
    }

    // 3. Check trigger specifically
    console.log('\n3️⃣ Testing trigger functionality...');
    
    if (results.functions['check_trigger_health'] === 'EXISTS') {
      try {
        const healthResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/check_trigger_health`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });

        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          results.trigger.exists = healthData.trigger_exists;
          results.trigger.working = healthData.trigger_exists && healthData.function_exists;
          
          console.log('   📋 Trigger health:', healthData);
        }
      } catch (error) {
        console.log('   ❌ Cannot check trigger health:', error.message);
      }
    } else {
      console.log('   ❌ Cannot check trigger (health function missing)');
    }

    // 4. Test actual signup to see what happens
    console.log('\n4️⃣ Testing actual signup process...');
    const testEmail = `audit_test_${Date.now()}@complete.com`;
    
    try {
      const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'AuditTest123!'
        })
      });

      if (signupResponse.ok) {
        const signupData = await signupResponse.json();
        const newUserId = signupData.user?.id;
        console.log(`   ✅ Auth user created: ${newUserId}`);
        
        // Wait and check for profile
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const profileCheckResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${newUserId}`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          }
        });
        
        if (profileCheckResponse.ok) {
          const profiles = await profileCheckResponse.json();
          if (profiles.length > 0) {
            console.log('   ✅ Profile created automatically by trigger');
            results.trigger.working = true;
          } else {
            console.log('   ❌ No profile created - trigger NOT working');
            results.trigger.working = false;
          }
        }
      } else {
        console.log('   ❌ Signup failed:', signupResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Signup test failed:', error.message);
    }

  } catch (error) {
    console.error('💥 Audit failed:', error.message);
  }

  // Summary Report
  console.log('\n\n📊 COMPLETE AUDIT RESULTS');
  console.log('==========================');
  
  console.log('\n🏥 TRIGGER STATUS:');
  console.log(`   Exists: ${results.trigger.exists ? '✅' : '❌'}`);
  console.log(`   Working: ${results.trigger.working ? '✅' : '❌'}`);
  
  console.log('\n👤 PROFILES STATUS:');
  console.log(`   Table exists: ${results.profiles.exists ? '✅' : '❌'}`);
  console.log(`   Has data: ${results.profiles.hasData ? '✅' : '❌'}`);
  
  console.log('\n🔧 FUNCTIONS STATUS:');
  const existingFunctions = Object.entries(results.functions).filter(([_, status]) => status === 'EXISTS');
  const missingFunctions = results.missing;
  const conflictedFunctions = results.conflicts;
  
  console.log(`   ✅ Working: ${existingFunctions.length}/${expectedFunctions.length}`);
  console.log(`   ❌ Missing: ${missingFunctions.length}`);
  console.log(`   ⚠️ Conflicts: ${conflictedFunctions.length}`);
  
  if (missingFunctions.length > 0) {
    console.log('\n❌ MISSING FUNCTIONS:');
    missingFunctions.forEach(fn => console.log(`   - ${fn}`));
  }
  
  if (conflictedFunctions.length > 0) {
    console.log('\n⚠️ CONFLICTED FUNCTIONS:');
    conflictedFunctions.forEach(fn => console.log(`   - ${fn}`));
  }

  if (existingFunctions.length > 0) {
    console.log('\n✅ WORKING FUNCTIONS:');
    existingFunctions.forEach(([fn, _]) => console.log(`   - ${fn}`));
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('===================');
  
  if (!results.trigger.working) {
    console.log('🔄 1. FIX TRIGGER: Your users can\'t get profiles created');
  }
  
  if (conflictedFunctions.length > 0) {
    console.log('⚠️ 2. RESOLVE CONFLICTS: Multiple function versions causing errors');
  }
  
  if (missingFunctions.length > 0) {
    console.log('❌ 3. ADD MISSING FUNCTIONS: Core app functionality missing');
  }
  
  const criticalIssues = (!results.trigger.working ? 1 : 0) + 
                        conflictedFunctions.length + 
                        missingFunctions.length;
  
  if (criticalIssues === 0) {
    console.log('\n🎉 SCHEMA IS HEALTHY!');
  } else if (criticalIssues <= 3) {
    console.log('\n🔧 MINOR FIXES NEEDED');
    console.log('💡 We can patch these specific issues');
  } else {
    console.log('\n🚨 MAJOR SCHEMA PROBLEMS');
    console.log('💡 Recommend: Complete schema rebuild');
    console.log('   This will be faster than fixing individual issues');
  }

  return results;
}

// Run the complete audit
completeSchemaAudit()
  .then(() => console.log('\n🏁 Complete audit finished!'))
  .catch(error => console.error('💥 Audit error:', error.message)); 