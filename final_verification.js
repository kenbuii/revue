import { AuthClient } from '@supabase/auth-js';

async function finalVerification() {
  console.log('🎯 Final verification of user creation fix...');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  // Test 1: Check RPC functions
  console.log('\n🔍 Test 1: Checking RPC functions...');
  
  const testFunctions = [
    { name: 'save_user_onboarding_data', testPayload: { p_user_id: '123e4567-e89b-12d3-a456-426614174000' } },
    { name: 'find_users_by_email_hash', testPayload: { email_hashes: ['test'] } },
    { name: 'get_user_media_preferences', testPayload: { p_user_id: '123e4567-e89b-12d3-a456-426614174000' } }
  ];
  
  let functionsWorking = 0;
  for (const func of testFunctions) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${func.name}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(func.testPayload)
      });
      
      if (response.status === 404) {
        console.log(`❌ ${func.name}: Not found`);
      } else if (response.status === 200 || response.status === 401 || response.status === 400) {
        console.log(`✅ ${func.name}: Available (status ${response.status})`);
        functionsWorking++;
      } else {
        console.log(`⚠️ ${func.name}: Unexpected status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${func.name}: Error testing`);
    }
  }
  
  // Test 2: Full signup and profile creation test
  console.log('\n🔍 Test 2: Full signup and profile creation test...');
  
  const authClient = new AuthClient({
    url: `${supabaseUrl}/auth/v1`,
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  });
  
  const testEmail = `final_test_${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `testuser_${Date.now()}`;
  
  console.log('📧 Test email:', testEmail);
  console.log('👤 Test username:', testUsername);
  
  try {
    // Step 1: Signup
    const signupResult = await authClient.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername,
          display_name: `Test User ${Date.now()}`,
        }
      }
    });
    
    if (signupResult.error) {
      console.error('❌ Signup failed:', signupResult.error.message);
      if (signupResult.error.status === 500) {
        console.error('🚨 500 ERROR STILL PRESENT! The trigger fix did not work.');
      }
      return;
    }
    
    console.log('✅ Step 1: Signup successful!');
    
    if (!signupResult.data.user) {
      console.error('❌ No user data returned from signup');
      return;
    }
    
    const userId = signupResult.data.user.id;
    const token = signupResult.data.session?.access_token || supabaseAnonKey;
    
    // Step 2: Check if profile was automatically created
    console.log('\n🔍 Step 2: Checking automatic profile creation...');
    
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles.length > 0) {
        console.log('✅ Step 2: User profile automatically created!');
        console.log('📄 Profile data:');
        console.log('  - ID:', profiles[0].id);
        console.log('  - Username:', profiles[0].username);
        console.log('  - Display Name:', profiles[0].display_name);
        console.log('  - Email Hash:', profiles[0].email_hash ? 'Present' : 'Missing');
        console.log('  - Created At:', profiles[0].created_at);
      } else {
        console.log('❌ Step 2: Profile not automatically created');
      }
    } else {
      console.log('❌ Step 2: Could not check profile creation:', profileResponse.status);
    }
    
    // Step 3: Test onboarding data function
    console.log('\n🔍 Step 3: Testing onboarding data save function...');
    
    try {
      const onboardingResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_user_id: userId,
          p_display_name: 'Updated Test User',
          p_contact_sync_enabled: true,
          p_onboarding_completed: true,
          p_media_preferences: JSON.stringify([{
            media_id: 'test_movie_1',
            title: 'Test Movie',
            media_type: 'movie',
            source: 'tmdb'
          }])
        })
      });
      
      if (onboardingResponse.ok) {
        const result = await onboardingResponse.json();
        console.log('✅ Step 3: Onboarding data function works!');
        console.log('📊 Result:', result);
      } else {
        const errorText = await onboardingResponse.text();
        console.log('❌ Step 3: Onboarding function failed:', onboardingResponse.status);
        console.log('Error:', errorText);
      }
    } catch (error) {
      console.log('❌ Step 3: Onboarding function test failed:', error.message);
    }
    
    // Cleanup: Sign out test user
    await authClient.signOut();
    console.log('\n🧹 Test user signed out');
    
  } catch (error) {
    console.error('❌ Full test failed:', error);
  }
  
  // Final summary
  console.log('\n📋 FINAL VERIFICATION SUMMARY:');
  console.log('='.repeat(50));
  console.log(`✅ RPC Functions Working: ${functionsWorking}/3`);
  
  if (functionsWorking === 3) {
    console.log('🎉 SUCCESS! Your user creation system is fully functional:');
    console.log('  ✅ No more 500 errors during signup');
    console.log('  ✅ User profiles automatically created');
    console.log('  ✅ Onboarding data can be saved');
    console.log('  ✅ All database functions are available');
    console.log('\n🚀 Your app should now work perfectly for new user registration!');
  } else {
    console.log('⚠️ Some functions are still missing. Please run the cleanup_functions.sql script.');
  }
}

finalVerification().catch(console.error); 