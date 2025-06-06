const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate the exact app flow
async function testAppExactFlow() {
  try {
    console.log('🔧 Testing exact app flow...');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Simulate getUserMediaPreferences method EXACTLY like the app
    console.log('🔄 Fetching user media preferences for:', testUserId);
    console.log('🔍 Session user ID: (simulated)');
    console.log('🔍 Provided user ID:', undefined);
    console.log('🔍 Using target user ID:', testUserId);

    // This mirrors the app's callRPC method exactly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_media_preferences`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: testUserId
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RPC call failed: ${response.status} - ${error}`);
    }

    const preferences = await response.json();

    // Mirror the exact console logs from the app
    console.log('✅ User media preferences fetched:', preferences.length, 'items');
    console.log('🎬 Raw preferences data:', preferences);
    console.log('🎬 First preference structure:', preferences[0]);
    
    // Mirror the context logging
    console.log('🎬 Media data received in context:', {
      length: preferences.length,
      data: preferences,
      firstItem: preferences[0]
    });
    
    // Check if preferences is array-like but weird
    console.log('\n📊 Deep analysis:');
    console.log('- preferences type:', typeof preferences);
    console.log('- preferences is array:', Array.isArray(preferences));
    console.log('- preferences constructor:', preferences.constructor.name);
    console.log('- preferences keys:', Object.keys(preferences));
    console.log('- preferences.length explicitly:', preferences.length);
    
    if (preferences && typeof preferences === 'object') {
      console.log('- Object.values(preferences):', Object.values(preferences));
      console.log('- JSON.stringify(preferences):', JSON.stringify(preferences));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAppExactFlow(); 
 