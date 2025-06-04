const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔑 Using API Key from env:', supabaseKey ? 'Found' : 'Missing');
console.log('🌐 Using URL from env:', supabaseUrl ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables. Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Test 4: Test get_user_media_preferences function
    console.log('\n4️⃣ Testing get_user_media_preferences function...');
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

    // Test 5: Test get_user_bookmarks function
    console.log('\n5️⃣ Testing get_user_bookmarks function...');
    const { data: bookmarksData, error: bookmarksRpcError } = await supabase.rpc('get_user_bookmarks', {
      p_user_id: testUserId
    });
    
    if (bookmarksRpcError) {
      console.error('❌ get_user_bookmarks failed:', bookmarksRpcError.message);
    } else {
      console.log('✅ get_user_bookmarks function working');
      console.log('📋 Result:', bookmarksData?.length || 0, 'bookmarks found');
    }

    // Test 6: Test save_user_onboarding_data function
    console.log('\n6️⃣ Testing save_user_onboarding_data function...');
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

    // Test 7: Check if the broken user profile was fixed
    console.log('\n7️⃣ Checking if broken user profile was fixed...');
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

    // Test 8: Test fresh signup to verify trigger works
    console.log('\n8️⃣ Testing fresh signup functionality...');
    const timestamp = Date.now();
    const testEmail = `verification_test+${timestamp}@gmail.com`;
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123',
      options: {
        data: {
          username: 'verification_user',
          display_name: 'Verification Test User'
        }
      }
    });
    
    if (signupError) {
      console.error('❌ Signup test failed:', signupError.message);
    } else {
      console.log('✅ Signup successful!');
      console.log('👤 New user ID:', signupData.user?.id);
      
      // Wait a moment for trigger
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if profile was created
      const { data: newProfile, error: newProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', signupData.user?.id)
        .single();
      
      if (newProfileError) {
        console.error('❌ New user profile not created by trigger:', newProfileError.message);
      } else {
        console.log('✅ Trigger working! New user profile created automatically');
        console.log('📋 New profile:', {
          username: newProfile.username,
          display_name: newProfile.display_name
        });
      }
    }

    console.log('\n🎉 Stage 1.5 Verification Complete!');

  } catch (err) {
    console.error('💥 Verification error:', err.message);
  }
}

verifyStage15(); 