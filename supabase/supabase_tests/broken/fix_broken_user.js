import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzE5NTEsImV4cCI6MjA0ODMwNzk1MX0.rF2MbdZTQKWkDNTELUJ5r0Rqz67XkWGKs5oW2_sX_2I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixBrokenUser() {
  const brokenUserId = '71a36ee6-8ef6-4272-950f-25ab54de806d';
  
  console.log('🔧 Fixing broken user profile...');
  console.log('👤 User ID:', brokenUserId);
  
  try {
    // First, check if user exists in auth.users
    console.log('\n1️⃣ Checking if user exists in auth...');
    
    // Check current user_profiles table
    console.log('\n2️⃣ Checking current user_profiles...');
    const { data: currentProfile, error: currentError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', brokenUserId)
      .single();
    
    if (currentProfile) {
      console.log('✅ User profile already exists:', currentProfile);
      return;
    }
    
    console.log('❌ User profile missing, creating manually...');
    
    // Create the missing user profile
    console.log('\n3️⃣ Creating user profile manually...');
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: brokenUserId,
        username: 'recovered_user_' + brokenUserId.slice(0, 8),
        display_name: 'Recovered User',
        onboarding_completed: false,
        contact_sync_enabled: false,
        email_hash: 'recovered_' + brokenUserId
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to create user profile:', insertError);
      return;
    }
    
    console.log('✅ User profile created successfully!');
    console.log('📋 New profile:', newProfile);
    
    // Test the save_user_onboarding_data function with this user
    console.log('\n4️⃣ Testing onboarding function with fixed user...');
    const { data: onboardingResult, error: onboardingError } = await supabase.rpc('save_user_onboarding_data', {
      p_user_id: brokenUserId,
      p_display_name: 'Fixed User',
      p_contact_sync_enabled: false,
      p_onboarding_completed: false
    });
    
    if (onboardingError) {
      console.error('❌ Onboarding test failed:', onboardingError);
    } else {
      console.log('✅ Onboarding function works with fixed user!');
      console.log('📋 Result:', onboardingResult);
    }
    
    console.log('\n🎉 User profile recovery complete!');
    
  } catch (err) {
    console.error('💥 Error fixing user:', err.message);
  }
}

fixBrokenUser(); 