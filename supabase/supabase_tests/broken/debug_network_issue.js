// Debug network connectivity issues with Supabase
async function debugNetworkIssue() {
  console.log('🔍 DEBUGGING NETWORK CONNECTIVITY ISSUES');
  console.log('==========================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  // Test 1: Basic ping to Supabase domain
  try {
    console.log('1️⃣ Testing basic connectivity to Supabase...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
      }
    });
    
    console.log('✅ Basic connectivity:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
  } catch (error) {
    console.error('❌ Basic connectivity failed:', error.message);
    console.error('🔍 Error details:', error);
  }
  
  // Test 2: Test the exact same call that's failing in your app
  try {
    console.log('\n2️⃣ Testing save_user_onboarding_data call (same as app)...');
    const testUserId = 'bd038145-3e72-4262-8995-947d3e5f5d7f'; // From your log
    
    const requestBody = {
      p_user_id: testUserId,
      p_avatar_url: null,
      p_contact_sync_enabled: false,
      p_display_name: "Test Guy",
      p_media_preferences: [],
      p_onboarding_completed: false
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Function call successful!');
      console.log('📋 Result:', result);
    } else {
      const errorText = await response.text();
      console.error('❌ Function call failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ save_user_onboarding_data test failed:', error.message);
    console.error('🔍 Error type:', error.constructor.name);
    console.error('🔍 Full error:', error);
  }
  
  // Test 3: Test with different request options
  try {
    console.log('\n3️⃣ Testing with different fetch options...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'RevueApp/1.0'
      },
      body: JSON.stringify({
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_display_name: 'Network Test',
        p_contact_sync_enabled: false,
        p_onboarding_completed: false
      }),
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Alternative request worked:', response.status);
    
  } catch (error) {
    console.error('❌ Alternative request failed:', error.message);
  }
  
  // Test 4: Check CORS headers
  try {
    console.log('\n4️⃣ Testing CORS preflight...');
    
    const preflightResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8081', // Typical Expo dev server
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'apikey,authorization,content-type'
      }
    });
    
    console.log('📋 CORS preflight status:', preflightResponse.status);
    console.log('📋 CORS headers:', Object.fromEntries(preflightResponse.headers.entries()));
    
  } catch (error) {
    console.error('❌ CORS preflight failed:', error.message);
  }
  
  // Test 5: Check if it's a timeout issue
  try {
    console.log('\n5️⃣ Testing with short timeout to simulate network issues...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_display_name: 'Timeout Test',
        p_contact_sync_enabled: false,
        p_onboarding_completed: false
      })
    });
    
    clearTimeout(timeoutId);
    console.log('✅ Fast request succeeded:', response.status);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏰ Request timed out (this might be your issue!)');
    } else {
      console.error('❌ Fast request failed:', error.message);
    }
  }
  
  console.log('\n🎯 NETWORK DIAGNOSTIC COMPLETE');
  console.log('Check the results above to identify the network issue.');
}

// Run the diagnostic
debugNetworkIssue().catch(console.error); 