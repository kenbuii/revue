// Comprehensive database diagnostic to identify the 500 error cause
import { AuthClient } from '@supabase/auth-js';

async function diagnosticCheck() {
  console.log('🔍 COMPREHENSIVE DATABASE DIAGNOSTIC');
  console.log('=====================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  // Test 1: Check if user_profiles table exists and its structure
  try {
    console.log('📋 Test 1: Checking user_profiles table structure...');
    const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (response.ok) {
      console.log('✅ user_profiles table exists and is accessible');
    } else {
      console.log('❌ user_profiles table issue:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error checking user_profiles:', error.message);
  }
  
  // Test 2: Check if handle_new_user function exists
  try {
    console.log('\n📋 Test 2: Checking handle_new_user function...');
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/handle_new_user`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (response.status === 404) {
      console.log('❌ handle_new_user function does NOT exist');
    } else {
      console.log('✅ handle_new_user function exists (status:', response.status, ')');
    }
  } catch (error) {
    console.log('❌ Error checking handle_new_user:', error.message);
  }
  
  // Test 3: Check if save_user_onboarding_data function exists
  try {
    console.log('\n📋 Test 3: Checking save_user_onboarding_data function...');
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '00000000-0000-0000-0000-000000000000'
      })
    });
    
    if (response.status === 404) {
      console.log('❌ save_user_onboarding_data function does NOT exist');
    } else {
      console.log('✅ save_user_onboarding_data function exists (status:', response.status, ')');
    }
  } catch (error) {
    console.log('❌ Error checking save_user_onboarding_data:', error.message);
  }
  
  // Test 4: Check database functions and triggers via SQL query
  try {
    console.log('\n📋 Test 4: Checking database objects via direct query...');
    
    // Check functions
    const functionsQuery = `
      SELECT 
        p.proname as function_name,
        n.nspname as schema_name,
        pg_catalog.pg_get_function_arguments(p.oid) as arguments
      FROM pg_catalog.pg_proc p
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      AND p.proname IN ('handle_new_user', 'save_user_onboarding_data', 'update_updated_at_column')
      ORDER BY p.proname;
    `;
    
    const functionsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: functionsQuery })
    });
    
    if (functionsResponse.ok) {
      const functions = await functionsResponse.json();
      console.log('✅ Database functions found:', functions.length);
      functions.forEach(func => {
        console.log(`   - ${func.function_name}(${func.arguments})`);
      });
    } else {
      console.log('❌ Could not query database functions directly');
    }
  } catch (error) {
    console.log('❌ Error querying database objects:', error.message);
  }
  
  // Test 5: Check triggers
  try {
    console.log('\n📋 Test 5: Checking triggers...');
    const triggersQuery = `
      SELECT 
        t.tgname as trigger_name,
        c.relname as table_name,
        p.proname as function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname IN ('users') 
      AND t.tgname LIKE '%auth%' OR t.tgname LIKE '%user%'
      ORDER BY t.tgname;
    `;
    
    // This might not work via REST API, so let's try a different approach
    console.log('   (Trigger check via REST API may not be available)');
  } catch (error) {
    console.log('❌ Error checking triggers:', error.message);
  }
  
  // Test 6: Try to manually trigger user profile creation
  try {
    console.log('\n📋 Test 6: Testing manual user profile creation...');
    
    // Create a test auth client to get a session (if possible)
    const authClient = new AuthClient({
      url: `${supabaseUrl}/auth/v1`,
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    });
    
    console.log('   Testing auth client initialization...');
    const { data: session } = await authClient.getSession();
    console.log('   Auth client session:', session ? 'Active' : 'None');
    
  } catch (error) {
    console.log('❌ Error with manual test:', error.message);
  }
  
  // Test 7: Check RLS policies
  try {
    console.log('\n📋 Test 7: Checking RLS policies...');
    const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=*&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (response.status === 200) {
      console.log('✅ RLS policies allow read access');
    } else if (response.status === 401) {
      console.log('⚠️  RLS policies require authentication (normal)');
    } else {
      console.log('❌ RLS policy issue:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error checking RLS policies:', error.message);
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Check if the handle_new_user trigger is actually attached to auth.users');
  console.log('2. Verify the trigger has proper permissions');
  console.log('3. Check Supabase logs for more detailed error messages');
  console.log('4. Consider manually testing the trigger function');
}

// Run the diagnostic
diagnosticCheck().catch(console.error); 