// Comprehensive test for the robust trigger fix
const supabaseUrl = "https://tiikwgddqkqhixvgcvvj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTkwNTIwNiwiZXhwIjoyMDYxNDgxMjA2fQ.TSEKQ76wl6IpM3x5DZahZQZzwwQpLewZ6DKTBPHhnAA";

async function testRobustTrigger() {
  console.log('🔧 ROBUST TRIGGER COMPREHENSIVE TEST');
  console.log('====================================\n');

  const results = {
    healthCheck: false,
    manualTest: false,
    realSignupTest: false,
    onboardingTest: false
  };

  try {
    // Test 1: Health Check
    console.log('1️⃣ Running trigger health check...');
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
      console.log('   ✅ Health check function available!');
      console.log('   📋 Health status:', healthData);
      
      if (healthData.trigger_exists && healthData.function_exists) {
        console.log('   🎉 Trigger and function are properly installed!');
        results.healthCheck = true;
      } else {
        console.log('   ❌ Trigger or function missing');
      }
    } else {
      console.log('   ❌ Health check failed:', healthResponse.status);
      const errorText = await healthResponse.text();
      console.log('   📋 Error:', errorText);
    }

    // Test 2: Manual Trigger Test
    console.log('\n2️⃣ Running manual trigger test...');
    const testEmail = `manual_test_${Date.now()}@robust.com`;
    
    const manualTestResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/test_trigger_manually`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test_email: testEmail
      })
    });

    if (manualTestResponse.ok) {
      const manualTestData = await manualTestResponse.json();
      console.log('   ✅ Manual test function available!');
      console.log('   📋 Test result:', manualTestData);
      
      if (manualTestData.success && manualTestData.profile_created) {
        console.log('   🎉 Manual profile creation works!');
        results.manualTest = true;
      } else {
        console.log('   ❌ Manual profile creation failed');
        if (manualTestData.error) {
          console.log('   📋 Error details:', manualTestData.error);
        }
      }
    } else {
      console.log('   ❌ Manual test failed:', manualTestResponse.status);
    }

    // Test 3: Real Signup Test with Enhanced Monitoring
    console.log('\n3️⃣ Testing real signup with enhanced monitoring...');
    const signupEmail = `robust_test_${Date.now()}@signup.com`;
    const signupPassword = 'RobustTest123!';
    
    console.log(`   📧 Creating user: ${signupEmail}`);
    
    // Get baseline profile count
    const baselineResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=count`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Accept': 'application/vnd.pgrst.object+json',
        'Prefer': 'count=exact'
      }
    });
    
    let baselineCount = 0;
    if (baselineResponse.ok) {
      const baselineData = await baselineResponse.json();
      baselineCount = parseInt(baselineResponse.headers.get('Content-Range')?.split('/')[1] || '0');
      console.log(`   📊 Baseline profile count: ${baselineCount}`);
    }

    // Create user
    const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: signupEmail,
        password: signupPassword
      })
    });

    if (!signupResponse.ok) {
      console.log('   ❌ Signup failed:', signupResponse.status);
      const errorText = await signupResponse.text();
      console.log('   📋 Error:', errorText);
      return results;
    }

    const signupData = await signupResponse.json();
    const newUserId = signupData.user?.id;
    console.log(`   ✅ Auth user created: ${newUserId}`);

    // Wait and monitor trigger execution
    console.log('\n   ⏱️ Monitoring trigger execution...');
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`   ⏳ Attempt ${attempt}/5 - waiting ${attempt * 2} seconds...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      
      // Check for new profile
      const profileCheckResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${newUserId}`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      
      if (profileCheckResponse.ok) {
        const profiles = await profileCheckResponse.json();
        
        if (profiles.length > 0) {
          console.log(`   ✅ Profile found after ${attempt * 2} seconds!`);
          console.log('   📋 Created profile:', profiles[0]);
          results.realSignupTest = true;
          break;
        } else {
          console.log(`   ⏳ No profile yet after ${attempt * 2} seconds...`);
          
          // Check total profile count
          const countResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=count`, {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Accept': 'application/vnd.pgrst.object+json',
              'Prefer': 'count=exact'
            }
          });
          
          if (countResponse.ok) {
            const currentCount = parseInt(countResponse.headers.get('Content-Range')?.split('/')[1] || '0');
            console.log(`   📊 Current profile count: ${currentCount} (baseline: ${baselineCount})`);
            
            if (currentCount > baselineCount) {
              console.log('   🎯 New profile(s) created, but not for our test user');
              
              // Check recent profiles
              const recentResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?order=created_at.desc&limit=3`, {
                headers: {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                }
              });
              
              if (recentResponse.ok) {
                const recentProfiles = await recentResponse.json();
                console.log('   📋 Recent profiles:', recentProfiles.map(p => ({ 
                  id: p.id, 
                  username: p.username, 
                  created_at: p.created_at 
                })));
              }
            }
          }
        }
      }
    }

    if (!results.realSignupTest) {
      console.log('\n   🚨 TRIGGER NOT WORKING - Running final diagnostics...');
      
      // Run health check again
      const finalHealthResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/check_trigger_health`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      if (finalHealthResponse.ok) {
        const finalHealthData = await finalHealthResponse.json();
        console.log('   📋 Final health check:', finalHealthData);
      }
    }

    // Test 4: Onboarding Function (if profile was created)
    if (results.realSignupTest) {
      console.log('\n4️⃣ Testing onboarding function...');
      
      const onboardingPayload = {
        p_user_id: newUserId,
        p_display_name: 'Robust Test User',
        p_avatar_url: 'https://example.com/robust-avatar.jpg',
        p_contact_sync_enabled: true,
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
          console.log('   🎉 Onboarding successful!');
          results.onboardingTest = true;
        }
      } else {
        console.log('   ❌ Onboarding failed:', onboardingResponse.status);
      }
    } else {
      console.log('\n4️⃣ Skipping onboarding test (no profile created)');
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }

  // Final Results
  console.log('\n\n🏆 ROBUST TRIGGER TEST RESULTS');
  console.log('===============================');
  console.log(`🏥 Health Check: ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🧪 Manual Test: ${results.manualTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔄 Real Signup: ${results.realSignupTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🎯 Onboarding: ${results.onboardingTest ? '✅ PASS' : '❌ FAIL'}`);

  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 Overall Success: ${totalPassed}/${totalTests} (${Math.round(totalPassed/totalTests*100)}%)`);

  if (results.healthCheck && results.manualTest && results.realSignupTest) {
    console.log('\n🎉 🎉 🎉 COMPLETE SUCCESS! 🎉 🎉 🎉');
    console.log('✅ Your trigger is working perfectly!');
    console.log('✅ Signup and profile creation is fully operational!');
    console.log('✅ Your app should work correctly now!');
  } else if (results.healthCheck && results.manualTest) {
    console.log('\n🎯 PARTIAL SUCCESS!');
    console.log('✅ Trigger infrastructure is working');
    console.log('⚠️ Real signup may have timing or constraint issues');
    console.log('💡 Check Supabase logs for more details');
  } else {
    console.log('\n⚠️ NEEDS ATTENTION');
    console.log('❌ Apply robust_trigger_fix.sql to your Supabase database');
    console.log('🔧 Check permissions and foreign key constraints');
  }

  return results;
}

// Run the comprehensive test
testRobustTrigger()
  .then(() => console.log('\n🏁 Robust trigger test complete!'))
  .catch(error => console.error('💥 Test error:', error.message)); 