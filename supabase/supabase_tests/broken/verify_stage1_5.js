const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzE5NTEsImV4cCI6MjA0ODMwNzk1MX0.rF2MbdZTQKWkDNTELUJ5r0Rqz67XkWGKs5oW2_sX_2I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyStage15() {
  console.log('🔍 Verifying Stage 1.5 Implementation...\n');
  
  try {
    // Test 1: Check if user_profiles table exists and is accessible
    console.log('1️⃣ Testing user_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ user_profiles test failed:', profilesError.message);
    } else {
      console.log('✅ user_profiles table accessible');
    }

    // Test 2: Check if user_bookmarks table exists
    console.log('\n2️⃣ Testing user_bookmarks table...');
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('user_bookmarks')
      .select('count')
      .limit(1);
    
    if (bookmarksError) {
      console.error('❌ user_bookmarks test failed:', bookmarksError.message);
    } else {
      console.log('✅ user_bookmarks table accessible');
    }

    // Test 3: Check if user_media_preferences table exists
    console.log('\n3️⃣ Testing user_media_preferences table...');
    const { data: mediaPrefs, error: mediaPrefsError } = await supabase
      .from('user_media_preferences')
      .select('count')
      .limit(1);
    
    if (mediaPrefsError) {
      console.error('❌ user_media_preferences test failed:', mediaPrefsError.message);
    } else {
      console.log('✅ user_media_preferences table accessible');
    }

    // Test 4: Test handle_new_user function via RPC
    console.log('\n4️⃣ Testing handle_new_user function access...');
    const { data: handleUserData, error: handleUserError } = await supabase.rpc('handle_new_user');
    
    if (handleUserError && handleUserError.code !== 'PGRST202') {
      console.log('✅ handle_new_user function exists (trigger function, not directly callable)');
    } else if (handleUserError?.code === 'PGRST202') {
      console.error('❌ handle_new_user function not accessible');
    }

    // Test 5: Test get_user_media_preferences function
    console.log('\n5️⃣ Testing get_user_media_preferences function...');
    const testUserId = '71a36ee6-8ef6-4272-950f-25ab54de806d'; // The user we know exists
    const { data: mediaPrefsData, error: mediaPrefsRpcError } = await supabase.rpc('get_user_media_preferences', {
      p_user_id: testUserId
    });
    
    if (mediaPrefsRpcError) {
      console.error('❌ get_user_media_preferences failed:', mediaPrefsRpcError.message);
    } else {
      console.log('✅ get_user_media_preferences function working');
      console.log('📋 Result:', mediaPrefsData?.length || 0, 'media preferences found');
    }

    // Test 6: Test get_user_bookmarks function
    console.log('\n6️⃣ Testing get_user_bookmarks function...');
    const { data: bookmarksData, error: bookmarksRpcError } = await supabase.rpc('get_user_bookmarks', {
      p_user_id: testUserId
    });
    
    if (bookmarksRpcError) {
      console.error('❌ get_user_bookmarks failed:', bookmarksRpcError.message);
    } else {
      console.log('✅ get_user_bookmarks function working');
      console.log('📋 Result:', bookmarksData?.length || 0, 'bookmarks found');
    }

    // Test 7: Test save_user_onboarding_data function
    console.log('\n7️⃣ Testing save_user_onboarding_data function...');
    const { data: onboardingData, error: onboardingError } = await supabase.rpc('save_user_onboarding_data', {
      p_user_id: testUserId,
      p_display_name: 'Test User',
      p_contact_sync_enabled: false,
      p_onboarding_completed: false
    });
    
    if (onboardingError) {
      console.error('❌ save_user_onboarding_data failed:', onboardingError.message);
    } else {
      console.log('✅ save_user_onboarding_data function working');
      console.log('📋 Result:', onboardingData);
    }

    // Test 8: Check if the broken user profile was fixed
    console.log('\n8️⃣ Checking if broken user profile was fixed...');
    const { data: userProfile, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (userProfileError) {
      console.error('❌ User profile still missing:', userProfileError.message);
    } else {
      console.log('✅ User profile exists');
      console.log('📋 Profile:', {
        id: userProfile.id,
        username: userProfile.username,
        display_name: userProfile.display_name,
        onboarding_completed: userProfile.onboarding_completed
      });
    }

    console.log('\n🎉 Stage 1.5 Verification Complete!');

  } catch (err) {
    console.error('💥 Verification error:', err.message);
  }
}

verifyStage15(); 