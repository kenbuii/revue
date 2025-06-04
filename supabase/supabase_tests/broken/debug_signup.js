import { AuthClient } from '@supabase/auth-js';

// Test Supabase configuration and signup
async function debugSignup() {
  console.log('🔧 Starting Supabase signup debug...');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  console.log('📋 Environment check:');
  console.log('- URL:', supabaseUrl);
  console.log('- Key prefix:', supabaseAnonKey.substring(0, 20) + '...');
  
  // Test 1: Basic connection to auth endpoint
  try {
    console.log('\n🔍 Test 1: Testing auth endpoint connectivity...');
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    const settings = await response.json();
    console.log('✅ Auth endpoint accessible');
    console.log('📊 Settings:', {
      status: response.status,
      emailEnabled: settings.external?.email,
      signupDisabled: settings.disable_signup,
      emailConfirmRequired: !settings.mailer_autoconfirm,
    });
    
    if (settings.disable_signup) {
      console.error('❌ SIGNUP IS DISABLED in Supabase settings!');
      return;
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    return;
  }
  
  // Test 2: Test signup with a test email
  try {
    console.log('\n🔍 Test 2: Testing signup functionality...');
    
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
    
    const testEmail = `test+${Date.now()}@gmail.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('📧 Test email:', testEmail);
    
    const signupResult = await authClient.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'testuser',
        }
      }
    });
    
    if (signupResult.error) {
      console.error('❌ Signup failed:', {
        message: signupResult.error.message,
        status: signupResult.error.status,
        code: signupResult.error.code,
        details: signupResult.error
      });
      
      // Check if this is a 500 error
      if (signupResult.error.status === 500) {
        console.error('🚨 500 ERROR DETECTED! This suggests:');
        console.error('1. Database trigger/function errors');
        console.error('2. Missing database tables/functions');
        console.error('3. RLS policy issues');
        console.error('4. Supabase service configuration problems');
      }
    } else {
      console.log('✅ Signup successful:', {
        user: signupResult.data.user ? 'Created' : 'Not created',
        session: signupResult.data.session ? 'Active' : 'No session',
        needsConfirmation: signupResult.data.user && !signupResult.data.session
      });
      
      // Cleanup: sign out
      if (signupResult.data.session) {
        await authClient.signOut();
        console.log('🧹 Test user signed out');
      }
    }
    
  } catch (error) {
    console.error('❌ Test 2 failed with exception:', error);
  }
  
  // Test 3: Check if required database objects exist
  try {
    console.log('\n🔍 Test 3: Checking database objects...');
    
    // Check if we can access the profiles table
    const profilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (profilesResponse.ok) {
      console.log('✅ user_profiles table accessible');
    } else {
      console.error('❌ user_profiles table not accessible:', profilesResponse.status);
    }
    
    // Check if RPC function exists
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_display_name: 'Test User',
        p_contact_sync_enabled: false,
        p_onboarding_completed: false
      })
    });
    
    console.log('📊 RPC function status:', rpcResponse.status);
    if (rpcResponse.status === 404) {
      console.error('❌ save_user_onboarding_data function not found');
    } else if (rpcResponse.status === 401) {
      console.log('✅ RPC function exists but requires auth (expected)');
    }
    
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
  
  console.log('\n✅ Debug complete! Check the logs above for issues.');
}

// Run the debug
debugSignup().catch(console.error); 