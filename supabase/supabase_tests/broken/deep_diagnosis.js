const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl.includes('supabase') || !supabaseAnonKey.startsWith('eyJ')) {
  console.error('❌ Please set proper environment variables:');
  console.error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepDiagnosis() {
  console.log('🔬 DEEP DATABASE DIAGNOSIS STARTING...\n');
  console.log('🌐 Supabase URL:', supabaseUrl);
  console.log('🔑 Using anon key:', supabaseAnonKey.substring(0, 20) + '...\n');

  const issues = [];
  const successes = [];

  // ===========================
  // 1. TABLE STRUCTURE ANALYSIS  
  // ===========================
  console.log('📊 STEP 1: TABLE STRUCTURE ANALYSIS');
  console.log('=====================================');

  const tablesToCheck = [
    'user_profiles', 
    'user_media_preferences', 
    'user_bookmarks', 
    'user_connections',
    'media_items',
    'posts', 
    'comments',
    'post_likes'
  ];

  for (const table of tablesToCheck) {
    try {
      console.log(`\n🔍 Checking table: ${table}`);
      
      // Check if table exists and get structure
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
        issues.push(`Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: exists (${count || 0} rows)`);
        successes.push(`Table ${table}: operational`);
        
        // Try to get first row to see structure
        const { data: sampleData } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (sampleData && sampleData.length > 0) {
          console.log(`   📋 Columns: ${Object.keys(sampleData[0]).join(', ')}`);
        } else {
          // Get column info directly via HTTP for empty tables
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=0`, {
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
              }
            });
            if (response.ok) {
              console.log(`   📋 Table exists but empty`);
            }
          } catch (e) {
            console.log(`   ⚠️ Could not determine table structure`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Table ${table}: ${error.message}`);
      issues.push(`Table ${table}: ${error.message}`);
    }
  }

  // ===========================
  // 2. FUNCTION SIGNATURE ANALYSIS
  // ===========================
  console.log('\n\n🔧 STEP 2: FUNCTION SIGNATURE ANALYSIS');
  console.log('=====================================');

  const functionsToTest = [
    {
      name: 'save_user_onboarding_data',
      testPayloads: [
        // What the app actually sends
        {
          name: 'App Expected Format',
          payload: {
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_avatar_url: null,
            p_contact_sync_enabled: false,
            p_display_name: 'Test User',
            p_media_preferences: [],
            p_onboarding_completed: false
          }
        },
        // Common alternative formats seen in SQL files
        {
          name: 'Alternative Format 1 (target_user_id)',
          payload: {
            target_user_id: '00000000-0000-0000-0000-000000000000',
            p_username: 'testuser',
            p_display_name: 'Test User',
            p_avatar_url: null,
            p_onboarding_completed: false,
            p_contact_sync_enabled: false,
            p_media_preferences: []
          }
        },
        {
          name: 'Alternative Format 2 (p_user_id with username)',
          payload: {
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_username: 'testuser',
            p_display_name: 'Test User',
            p_avatar_url: null,
            p_onboarding_completed: false,
            p_contact_sync_enabled: false,
            p_media_preferences: []
          }
        }
      ]
    },
    {
      name: 'get_user_media_preferences',
      testPayloads: [
        {
          name: 'App Expected Format',
          payload: { p_user_id: '00000000-0000-0000-0000-000000000000' }
        },
        {
          name: 'Alternative Format',
          payload: { target_user_id: '00000000-0000-0000-0000-000000000000' }
        }
      ]
    },
    {
      name: 'get_user_bookmarks',
      testPayloads: [
        {
          name: 'App Expected Format',
          payload: { p_user_id: '00000000-0000-0000-0000-000000000000' }
        },
        {
          name: 'Alternative Format',
          payload: { target_user_id: '00000000-0000-0000-0000-000000000000' }
        }
      ]
    },
    {
      name: 'find_users_by_email_hash',
      testPayloads: [
        {
          name: 'Expected Format',
          payload: { email_hashes: ['test_hash_1', 'test_hash_2'] }
        }
      ]
    }
  ];

  for (const func of functionsToTest) {
    console.log(`\n🔍 Testing function: ${func.name}`);
    
    let workingFormat = null;
    
    for (const test of func.testPayloads) {
      try {
        console.log(`   📤 Testing ${test.name}...`);
        
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${func.name}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.payload)
        });

        console.log(`   📥 Status: ${response.status}`);
        
        if (response.status === 200) {
          console.log(`   ✅ ${test.name}: WORKS!`);
          workingFormat = test.name;
          successes.push(`Function ${func.name}: ${test.name} format works`);
          break;
        } else if (response.status === 404) {
          console.log(`   ❌ ${test.name}: Function not found (404)`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ ${test.name}: ${response.status} - ${errorText.substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.message}`);
      }
    }
    
    if (!workingFormat) {
      issues.push(`Function ${func.name}: No working format found`);
    }
  }

  // ===========================
  // 3. USER PROFILE CREATION TRIGGER TEST
  // ===========================
  console.log('\n\n👤 STEP 3: USER PROFILE CREATION TRIGGER TEST');
  console.log('==============================================');

  try {
    console.log('🧪 Creating test auth user to check trigger...');
    
    const testEmail = `test_${Date.now()}@trigger-test.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
      issues.push(`Auth signup: ${signupError.message}`);
    } else if (signupData.user) {
      console.log('✅ Test user created:', signupData.user.id);
      
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if user_profile was created
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', signupData.user.id) // Try user_id first
        .single();
        
      if (profileError) {
        // Try with 'id' column instead
        const { data: profileById, error: profileByIdError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', signupData.user.id)
          .single();
          
        if (profileByIdError) {
          console.log('❌ User profile NOT created by trigger');
          console.log('   Error with user_id:', profileError.message);
          console.log('   Error with id:', profileByIdError.message);
          issues.push('User profile trigger: Not working - no profile created');
        } else {
          console.log('✅ User profile created with "id" column');
          console.log('   Profile:', profileById);
          successes.push('User profile trigger: Works with id column');
        }
      } else {
        console.log('✅ User profile created with "user_id" column');
        console.log('   Profile:', profile);
        successes.push('User profile trigger: Works with user_id column');
      }
      
      // Clean up test user
      console.log('🧹 Cleaning up test user...');
      await supabase.auth.signOut();
    }
  } catch (error) {
    console.log('❌ Trigger test failed:', error.message);
    issues.push(`Trigger test: ${error.message}`);
  }

  // ===========================
  // 4. RPC ACCESSIBILITY TEST
  // ===========================
  console.log('\n\n🌐 STEP 4: RPC ACCESSIBILITY TEST');
  console.log('===================================');

  try {
    console.log('🔍 Testing handle_new_user RPC accessibility...');
    
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
      console.log('❌ handle_new_user: Not accessible via RPC (404)');
      issues.push('handle_new_user: Not accessible via RPC');
    } else {
      console.log(`✅ handle_new_user: Accessible (status: ${response.status})`);
      successes.push('handle_new_user: Accessible via RPC');
    }
  } catch (error) {
    console.log('❌ RPC accessibility test failed:', error.message);
    issues.push(`RPC accessibility: ${error.message}`);
  }

  // ===========================
  // 5. SUMMARY & RECOMMENDATIONS
  // ===========================
  console.log('\n\n📋 DIAGNOSIS SUMMARY');
  console.log('====================');
  
  console.log(`\n✅ SUCCESSES (${successes.length}):`);
  successes.forEach((success, i) => {
    console.log(`   ${i + 1}. ${success}`);
  });
  
  console.log(`\n❌ ISSUES FOUND (${issues.length}):`);
  issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });

  console.log('\n🎯 NEXT STEPS:');
  if (issues.length === 0) {
    console.log('🎉 No issues found! Your database is working correctly.');
  } else {
    console.log('📝 I will now create targeted fixes for each identified issue.');
    console.log('   These will be incremental, surgical fixes rather than nuclear cleanup.');
  }

  return { issues, successes };
}

// Run the diagnosis
deepDiagnosis()
  .then(({ issues, successes }) => {
    console.log('\n🏁 Deep diagnosis complete!');
    process.exit(issues.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Diagnosis failed:', error.message);
    process.exit(1);
  }); 