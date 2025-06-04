// Fix the broken user profile using working API credentials
async function fixBrokenUserProfile() {
  console.log('🔧 Fixing broken user profile with Stage 1.5 changes...');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  const brokenUserId = '71a36ee6-8ef6-4272-950f-25ab54de806d';
  
  try {
    // Step 1: Check if user profile already exists
    console.log('\n1️⃣ Checking if user profile exists...');
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${brokenUserId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    const existingProfiles = await checkResponse.json();
    if (existingProfiles.length > 0) {
      console.log('✅ User profile already exists:', existingProfiles[0]);
      return;
    }
    
    console.log('❌ User profile missing, creating...');
    
    // Step 2: Create the missing user profile
    console.log('\n2️⃣ Creating user profile...');
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: brokenUserId,
        username: 'recovered_user_' + brokenUserId.slice(0, 8),
        display_name: 'Recovered User',
        onboarding_completed: false,
        contact_sync_enabled: false,
        email_hash: 'recovered_' + brokenUserId
      })
    });
    
    if (createResponse.ok) {
      const newProfile = await createResponse.json();
      console.log('✅ User profile created successfully!');
      console.log('📋 New profile:', newProfile[0]);
    } else {
      const error = await createResponse.text();
      console.error('❌ Failed to create user profile:', createResponse.status, error);
      return;
    }
    
    // Step 3: Test the save_user_onboarding_data function
    console.log('\n3️⃣ Testing save_user_onboarding_data function...');
    const onboardingResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: brokenUserId,
        p_display_name: 'Fixed User Profile',
        p_contact_sync_enabled: false,
        p_onboarding_completed: false
      })
    });
    
    if (onboardingResponse.ok) {
      const result = await onboardingResponse.json();
      console.log('✅ save_user_onboarding_data function works!');
      console.log('📋 Result:', result);
    } else {
      const error = await onboardingResponse.text();
      console.error('❌ save_user_onboarding_data failed:', onboardingResponse.status, error);
    }
    
    console.log('\n🎉 User profile fix complete!');
    
  } catch (error) {
    console.error('💥 Error fixing user profile:', error);
  }
}

// Run the fix
fixBrokenUserProfile().catch(console.error); 