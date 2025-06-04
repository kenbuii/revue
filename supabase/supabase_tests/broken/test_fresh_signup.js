import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzE5NTEsImV4cCI6MjA0ODMwNzk1MX0.rF2MbdZTQKWkDNTELUJ5r0Rqz67XkWGKs5oW2_sX_2I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFreshSignup() {
  console.log('🧪 Testing fresh signup with user profile creation...');
  
  // Generate unique email
  const timestamp = Date.now();
  const testEmail = `stage15test+${timestamp}@gmail.com`;
  const testPassword = 'testpassword123';
  
  console.log('📧 Test email:', testEmail);
  
  try {
    // Step 1: Sign up new user
    console.log('\n1️⃣ Creating new user account...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'stage15testuser',
          display_name: 'Stage 1.5 Test User'
        }
      }
    });
    
    if (signupError) {
      console.error('❌ Signup failed:', signupError.message);
      return;
    }
    
    console.log('✅ User created successfully!');
    console.log('👤 User ID:', signupData.user?.id);
    
    // Step 2: Wait a moment for trigger to execute
    console.log('\n2️⃣ Waiting for trigger to create user profile...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check if user profile was created by the trigger
    console.log('\n3️⃣ Checking if user profile was created...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', signupData.user?.id)
      .single();
    
    if (profileError) {
      console.error('❌ User profile not found:', profileError.message);
      console.log('⚠️ This means the trigger is not working properly');
    } else {
      console.log('✅ User profile found!');
      console.log('📋 Profile details:', {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        onboarding_completed: profile.onboarding_completed,
        created_at: profile.created_at
      });
    }
    
    // Step 4: Test the onboarding function
    console.log('\n4️⃣ Testing save_user_onboarding_data function...');
    const { data: onboardingResult, error: onboardingError } = await supabase.rpc('save_user_onboarding_data', {
      p_user_id: signupData.user?.id,
      p_display_name: 'Updated Test User',
      p_contact_sync_enabled: true,
      p_onboarding_completed: true
    });
    
    if (onboardingError) {
      console.error('❌ Onboarding function failed:', onboardingError.message);
    } else {
      console.log('✅ Onboarding function works!');
      console.log('📋 Result:', onboardingResult);
    }
    
    // Step 5: Clean up - sign out
    console.log('\n5️⃣ Cleaning up...');
    await supabase.auth.signOut();
    console.log('✅ Test user signed out');
    
    console.log('\n🎉 Fresh signup test complete!');
    
  } catch (err) {
    console.error('💥 Test error:', err.message);
  }
}

testFreshSignup(); 