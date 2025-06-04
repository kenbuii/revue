import { AuthClient } from '@supabase/auth-js';

// Verify that the database schema fix resolved the signup issue
async function verifyFix() {
  console.log('🔧 Verifying database schema fix...');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  // Test 1: Check if RPC functions now exist
  console.log('\n🔍 Test 1: Checking RPC functions...');
  
  const requiredFunctions = [
    'save_user_onboarding_data',
    'find_users_by_email_hash',
    'get_user_media_preferences'
  ];
  
  let functionsOk = 0;
  for (const funcName of requiredFunctions) {
    try {
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/${funcName}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      if (rpcResponse.status !== 404) {
        console.log(`✅ ${funcName}: Found`);
        functionsOk++;
      } else {
        console.log(`❌ ${funcName}: Not found`);
      }
    } catch (error) {
      console.log(`❌ ${funcName}: Error`);
    }
  }
  
  // Test 2: Try signup again
  console.log('\n🔍 Test 2: Testing signup after schema fix...');
  
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
  
  const testEmail = `test+fixed+${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('📧 Test email:', testEmail);
  
  try {
    const signupResult = await authClient.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'testuser_fixed',
        }
      }
    });
    
    if (signupResult.error) {
      console.error('❌ Signup still failing:', {
        message: signupResult.error.message,
        status: signupResult.error.status,
        code: signupResult.error.code
      });
      
      if (signupResult.error.status === 500) {
        console.error('🚨 Still getting 500 error! Schema may not be fully applied.');
      }
    } else {
      console.log('✅ Signup successful!', {
        user: signupResult.data.user ? 'Created' : 'Not created',
        session: signupResult.data.session ? 'Active' : 'No session',
        needsConfirmation: signupResult.data.user && !signupResult.data.session
      });
      
      // If signup was successful, check if user profile was created
      if (signupResult.data.user) {
        const userId = signupResult.data.user.id;
        console.log('\n🔍 Checking if user profile was automatically created...');
        
        try {
          const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`, {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${signupResult.data.session?.access_token || supabaseAnonKey}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            if (profiles.length > 0) {
              console.log('✅ User profile automatically created by trigger!');
              console.log('📄 Profile data:', profiles[0]);
            } else {
              console.log('❌ User profile not created - trigger may not be working');
            }
          } else {
            console.log('❌ Could not check user profile:', profileResponse.status);
          }
        } catch (error) {
          console.log('❌ Error checking user profile:', error.message);
        }
        
        // Cleanup: sign out the test user
        await authClient.signOut();
        console.log('🧹 Test user signed out');
      }
    }
    
  } catch (error) {
    console.error('❌ Signup test failed with exception:', error);
  }
  
  // Summary
  console.log('\n📋 VERIFICATION SUMMARY:');
  console.log(`- RPC Functions: ${functionsOk}/${requiredFunctions.length} found`);
  
  if (functionsOk === requiredFunctions.length) {
    console.log('✅ Schema appears to be properly applied!');
    console.log('🎉 User creation should now work in your app.');
  } else {
    console.log('❌ Schema is still incomplete. Re-run the schema.sql in Supabase.');
  }
}

verifyFix().catch(console.error); 