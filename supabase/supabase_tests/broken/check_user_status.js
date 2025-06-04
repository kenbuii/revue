// Check User Status Across Tables
async function checkUserStatus() {
  console.log('🔍 CHECKING USER STATUS ACROSS TABLES');
  console.log('=====================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  const userId = '71a36ee6-8ef6-4272-950f-25ab54de806d';
  
  try {
    // Check auth.users (via user_profiles proxy since we can't query auth.users directly)
    console.log('1️⃣ Checking if user exists in user_profiles...');
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log(`  Found ${profileData.length} user_profiles records`);
      if (profileData.length > 0) {
        console.log(`  User profile: ${JSON.stringify(profileData[0])}`);
      }
    } else {
      console.log(`  Error checking user_profiles: ${profileResponse.status}`);
    }

    // Check posts table structure
    console.log('\n2️⃣ Checking posts table structure...');
    const postsStructure = await fetch(`${supabaseUrl}/rest/v1/posts?limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (postsStructure.ok) {
      console.log('  Posts table exists');
      // Try to get one record to see structure
      const postsData = await fetch(`${supabaseUrl}/rest/v1/posts?limit=1`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      if (postsData.ok) {
        const posts = await postsData.json();
        if (posts.length > 0) {
          console.log(`  Sample post structure: ${Object.keys(posts[0]).join(', ')}`);
        } else {
          console.log('  No posts exist yet');
        }
      }
    }

    // Check if we can create a user_profile for this user
    console.log('\n3️⃣ Testing if we can create user_profile...');
    const createProfileTest = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_avatar_url: 'https://example.com/test.jpg',
        p_contact_sync_enabled: false,
        p_display_name: 'Test User',
        p_onboarding_completed: true
      })
    });
    
    console.log(`  Create profile status: ${createProfileTest.status}`);
    if (!createProfileTest.ok) {
      const errorText = await createProfileTest.text();
      console.log(`  Error: ${errorText}`);
    } else {
      console.log('  ✅ Successfully created user profile!');
    }

  } catch (error) {
    console.error('💥 Check error:', error.message);
  }
}

// Run the check
checkUserStatus().catch(console.error); 