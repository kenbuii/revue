// Trigger Diagnostic - Check why user profiles aren't being created
import { AuthClient } from '@supabase/auth-js';

async function checkTriggerStatus() {
  console.log('🔍 TRIGGER DIAGNOSTIC ANALYSIS');
  console.log('==============================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  // Test 1: Check if user profile exists for the failed user
  try {
    console.log('📋 Test 1: Checking if user profile exists for failed user...');
    const failedUserId = '71a36ee6-8ef6-4272-950f-25ab54de806d';
    
    const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${failedUserId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    const profiles = await response.json();
    console.log(`Profile exists for ${failedUserId}:`, profiles.length > 0 ? '✅ YES' : '❌ NO');
    if (profiles.length > 0) {
      console.log('Profile data:', profiles[0]);
    }
  } catch (error) {
    console.log('❌ Error checking user profile:', error.message);
  }
  
  // Test 2: Check if handle_new_user function exists and is callable
  try {
    console.log('\n📋 Test 2: Testing handle_new_user function existence...');
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/handle_new_user`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    console.log('handle_new_user function status:', response.status);
    if (response.status === 404) {
      console.log('❌ handle_new_user function NOT accessible via RPC');
    } else {
      console.log('✅ handle_new_user function exists');
    }
  } catch (error) {
    console.log('❌ Error testing handle_new_user:', error.message);
  }
  
  // Test 3: Check save_user_onboarding_data function signature
  try {
    console.log('\n📋 Test 3: Testing save_user_onboarding_data function...');
    
    // Test with app's expected parameters
    const appParams = {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_avatar_url: null,
      p_contact_sync_enabled: false,
      p_display_name: null,
      p_media_preferences: [],
      p_onboarding_completed: false
    };
    
    const response1 = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appParams)
    });
    
    console.log('App expected parameters result:', response1.status);
    if (response1.status === 404) {
      console.log('❌ Function signature mismatch - app expects different parameters');
      
      // Test with database expected parameters
      const dbParams = {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_username: null,
        p_display_name: null,
        p_avatar_url: null,
        p_onboarding_completed: false,
        p_contact_sync_enabled: false
      };
      
      const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbParams)
      });
      
      console.log('Database expected parameters result:', response2.status);
      if (response2.status !== 404) {
        console.log('✅ Function exists with database parameter signature');
      }
    } else {
      console.log('✅ Function works with app parameters');
    }
  } catch (error) {
    console.log('❌ Error testing save_user_onboarding_data:', error.message);
  }
  
  // Test 4: Check get_user_media_preferences function signature
  try {
    console.log('\n📋 Test 4: Testing get_user_media_preferences function...');
    
    // Test with app's expected parameters
    const response1 = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_media_preferences`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000' })
    });
    
    console.log('App expected parameters (p_user_id):', response1.status);
    
    if (response1.status === 404) {
      console.log('❌ Function expects different parameter name');
      
      // Test with database expected parameters
      const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_media_preferences`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target_user_id: '00000000-0000-0000-0000-000000000000' })
      });
      
      console.log('Database expected parameters (target_user_id):', response2.status);
    }
  } catch (error) {
    console.log('❌ Error testing get_user_media_preferences:', error.message);
  }
  
  // Test 5: Check if user_bookmarks table exists
  try {
    console.log('\n📋 Test 5: Checking if user_bookmarks table exists...');
    const response = await fetch(`${supabaseUrl}/rest/v1/user_bookmarks?limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (response.ok) {
      console.log('✅ user_bookmarks table exists');
    } else {
      console.log('❌ user_bookmarks table does NOT exist');
      console.log('Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Error checking user_bookmarks:', error.message);
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('1. Check if user profile was created for the auth user');
  console.log('2. Verify trigger is working correctly');
  console.log('3. Identify function parameter mismatches');
  console.log('4. Determine what tables/functions are missing for the app');
}

// Run the diagnostic
checkTriggerStatus().catch(console.error); 