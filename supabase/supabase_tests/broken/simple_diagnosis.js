// Simple diagnosis that accepts credentials as arguments
// Usage: node simple_diagnosis.js <supabase_url> <anon_key>

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node simple_diagnosis.js <supabase_url> <anon_key>');
  console.log('Example: node simple_diagnosis.js https://xyz.supabase.co eyJ...');
  process.exit(1);
}

const supabaseUrl = args[0];
const supabaseAnonKey = args[1];

async function quickDiagnosis() {
  console.log('🔬 QUICK DATABASE DIAGNOSIS');
  console.log('===========================');
  console.log('🌐 URL:', supabaseUrl);
  console.log('🔑 Key:', supabaseAnonKey.substring(0, 20) + '...\n');

  const issues = [];
  const successes = [];

  // Test 1: Basic connectivity
  try {
    console.log('📡 Testing basic connectivity...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { 'apikey': supabaseAnonKey }
    });
    
    if (response.ok) {
      console.log('✅ Basic connectivity: WORKING');
      successes.push('Basic connectivity works');
    } else {
      console.log(`❌ Basic connectivity: ${response.status}`);
      issues.push(`Basic connectivity failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Basic connectivity:', error.message);
    issues.push(`Basic connectivity error: ${error.message}`);
  }

  // Test 2: Check user_profiles table
  try {
    console.log('\n👤 Testing user_profiles table...');
    const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ user_profiles table: EXISTS');
      console.log(`   📊 Sample data: ${data.length} rows returned`);
      if (data.length > 0) {
        console.log(`   📋 Columns: ${Object.keys(data[0]).join(', ')}`);
      }
      successes.push('user_profiles table accessible');
    } else {
      const errorText = await response.text();
      console.log(`❌ user_profiles table: ${response.status} - ${errorText}`);
      issues.push(`user_profiles table: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ user_profiles table:', error.message);
    issues.push(`user_profiles table error: ${error.message}`);
  }

  // Test 3: Test save_user_onboarding_data function
  try {
    console.log('\n🔧 Testing save_user_onboarding_data function...');
    
    // Test app's expected format
    const appPayload = {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_avatar_url: null,
      p_contact_sync_enabled: false,
      p_display_name: 'Test User',
      p_media_preferences: [],
      p_onboarding_completed: false
    };
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/save_user_onboarding_data`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appPayload)
    });

    console.log(`   📥 Status: ${response.status}`);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('✅ save_user_onboarding_data: WORKS with app format!');
      console.log(`   📋 Result: ${JSON.stringify(result)}`);
      successes.push('save_user_onboarding_data function works');
    } else if (response.status === 404) {
      console.log('❌ save_user_onboarding_data: Function not found (404)');
      issues.push('save_user_onboarding_data function missing');
    } else {
      const errorText = await response.text();
      console.log(`❌ save_user_onboarding_data: ${response.status} - ${errorText.substring(0, 200)}...`);
      issues.push(`save_user_onboarding_data function error: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ save_user_onboarding_data:', error.message);
    issues.push(`save_user_onboarding_data error: ${error.message}`);
  }

  // Test 4: Test other critical functions
  const otherFunctions = [
    { name: 'get_user_media_preferences', payload: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_user_bookmarks', payload: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'find_users_by_email_hash', payload: { email_hashes: ['test'] } }
  ];

  for (const func of otherFunctions) {
    try {
      console.log(`\n🔍 Testing ${func.name}...`);
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${func.name}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(func.payload)
      });

      if (response.status === 200) {
        console.log(`✅ ${func.name}: WORKS`);
        successes.push(`${func.name} function works`);
      } else if (response.status === 404) {
        console.log(`❌ ${func.name}: Not found (404)`);
        issues.push(`${func.name} function missing`);
      } else {
        console.log(`⚠️ ${func.name}: Status ${response.status}`);
        issues.push(`${func.name} function issue: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${func.name}: ${error.message}`);
      issues.push(`${func.name} error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n\n📋 QUICK DIAGNOSIS SUMMARY');
  console.log('===========================');
  
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
    console.log('🎉 Everything looks good! The issues might be elsewhere.');
  } else if (issues.some(i => i.includes('save_user_onboarding_data'))) {
    console.log('🔧 Main issue: save_user_onboarding_data function needs to be fixed/created');
  } else if (issues.some(i => i.includes('user_profiles'))) {
    console.log('🔧 Main issue: user_profiles table needs to be created/fixed');
  } else {
    console.log('🔧 Multiple issues found - need targeted fixes');
  }

  return { issues, successes };
}

quickDiagnosis()
  .then(() => console.log('\n🏁 Quick diagnosis complete!'))
  .catch(error => console.error('💥 Diagnosis failed:', error.message)); 