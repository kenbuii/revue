// Comprehensive Database Diagnosis
async function comprehensiveDiagnosis() {
  console.log('🔍 COMPREHENSIVE DATABASE DIAGNOSIS');
  console.log('=====================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  const diagnosis = {
    tables: {},
    functions: {},
    userData: {},
    issues: []
  };

  async function checkTable(tableName, expectedColumns = []) {
    try {
      // Check if table exists and get sample structure
      const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=1`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const actualColumns = data.length > 0 ? Object.keys(data[0]) : [];
        
        diagnosis.tables[tableName] = {
          exists: true,
          columns: actualColumns,
          rowCount: data.length,
          status: '✅'
        };
        
        // Check for missing expected columns
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        if (missingColumns.length > 0) {
          diagnosis.tables[tableName].missingColumns = missingColumns;
          diagnosis.tables[tableName].status = '⚠️';
          diagnosis.issues.push(`${tableName}: Missing columns [${missingColumns.join(', ')}]`);
        }
      } else if (response.status === 404) {
        diagnosis.tables[tableName] = {
          exists: false,
          status: '❌'
        };
        diagnosis.issues.push(`${tableName}: Table does not exist`);
      } else {
        diagnosis.tables[tableName] = {
          exists: 'unknown',
          error: response.status,
          status: '❓'
        };
      }
    } catch (error) {
      diagnosis.tables[tableName] = {
        exists: 'error',
        error: error.message,
        status: '💥'
      };
    }
  }

  async function checkFunction(functionName, testParams = {}) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testParams)
      });
      
      if (response.status === 404) {
        diagnosis.functions[functionName] = {
          exists: false,
          status: '❌'
        };
        diagnosis.issues.push(`${functionName}: Function does not exist`);
      } else if (response.status === 200 || response.status === 400) {
        // 400 is OK - means function exists but params might be wrong
        diagnosis.functions[functionName] = {
          exists: true,
          status: '✅',
          responseStatus: response.status
        };
      } else {
        diagnosis.functions[functionName] = {
          exists: 'unknown',
          status: '⚠️',
          responseStatus: response.status
        };
      }
    } catch (error) {
      diagnosis.functions[functionName] = {
        exists: 'error',
        error: error.message,
        status: '💥'
      };
    }
  }

  console.log('1️⃣ Checking Core Tables...\n');
  
  // Check Stage 1 tables
  await checkTable('user_profiles', ['user_id', 'username', 'display_name', 'avatar_url']);
  await checkTable('user_bookmarks', ['user_id', 'media_item_id']);
  await checkTable('media_items', ['id', 'title', 'media_type', 'popularity_score']);
  
  // Check Stage 2 tables
  await checkTable('posts', ['user_id', 'content', 'media_item_id', 'rating', 'like_count', 'comment_count']);
  await checkTable('comments', ['post_id', 'user_id', 'content']);
  await checkTable('post_likes', ['post_id', 'user_id']);
  await checkTable('comment_likes', ['comment_id', 'user_id']);
  await checkTable('user_follows', ['follower_id', 'following_id']);
  await checkTable('friend_requests', ['sender_id', 'receiver_id', 'status']);
  await checkTable('user_lists', ['user_id', 'name', 'list_type']);
  await checkTable('list_items', ['list_id', 'media_item_id']);

  console.log('2️⃣ Checking RPC Functions...\n');
  
  // Check Stage 1 functions
  await checkFunction('save_user_onboarding_data', { p_user_id: '00000000-0000-0000-0000-000000000000' });
  await checkFunction('get_user_media_preferences', { p_user_id: '00000000-0000-0000-0000-000000000000' });
  await checkFunction('find_users_by_email_hash', { p_email_hash: 'test' });
  
  // Check Stage 2 functions
  await checkFunction('get_user_feed', { p_user_id: '00000000-0000-0000-0000-000000000000' });
  await checkFunction('create_post', { p_user_id: '00000000-0000-0000-0000-000000000000', p_content: 'test' });
  await checkFunction('toggle_post_like', { p_user_id: '00000000-0000-0000-0000-000000000000', p_post_id: '00000000-0000-0000-0000-000000000000' });
  await checkFunction('toggle_user_follow', { p_follower_id: '00000000-0000-0000-0000-000000000000', p_following_id: '00000000-0000-0000-0000-000000000000' });
  await checkFunction('get_post_comments', { p_post_id: '00000000-0000-0000-0000-000000000000' });

  console.log('3️⃣ Checking User Data...\n');
  
  const testUserId = '71a36ee6-8ef6-4272-950f-25ab54de806d';
  
  // Check if our test user has a profile
  try {
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${testUserId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      diagnosis.userData.testUserProfile = {
        exists: profileData.length > 0,
        data: profileData[0] || null
      };
    }
  } catch (error) {
    diagnosis.userData.testUserProfile = { error: error.message };
  }

  // Print comprehensive report
  console.log('\n🎯 DIAGNOSIS REPORT');
  console.log('===================\n');

  console.log('📊 TABLE STATUS:');
  Object.entries(diagnosis.tables).forEach(([name, info]) => {
    console.log(`  ${info.status} ${name}`);
    if (info.columns) {
      console.log(`    Columns: ${info.columns.join(', ')}`);
    }
    if (info.missingColumns) {
      console.log(`    ❌ Missing: ${info.missingColumns.join(', ')}`);
    }
  });

  console.log('\n⚙️ FUNCTION STATUS:');
  Object.entries(diagnosis.functions).forEach(([name, info]) => {
    console.log(`  ${info.status} ${name}`);
    if (info.responseStatus) {
      console.log(`    Response: ${info.responseStatus}`);
    }
  });

  console.log('\n👤 USER DATA:');
  console.log(`  Test User Profile: ${diagnosis.userData.testUserProfile?.exists ? '✅ Exists' : '❌ Missing'}`);
  if (diagnosis.userData.testUserProfile?.data) {
    console.log(`  Username: ${diagnosis.userData.testUserProfile.data.username || 'Not set'}`);
  }

  console.log('\n🚨 IDENTIFIED ISSUES:');
  if (diagnosis.issues.length === 0) {
    console.log('  ✅ No issues found!');
  } else {
    diagnosis.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }

  console.log('\n💡 NEXT STEPS RECOMMENDATION:');
  const criticalIssues = diagnosis.issues.filter(issue => 
    issue.includes('does not exist') || issue.includes('Missing columns')
  );
  
  if (criticalIssues.length === 0) {
    console.log('  All major components exist - likely just need minor fixes');
  } else if (criticalIssues.length < 3) {
    console.log('  Few critical issues - targeted fix recommended');
  } else {
    console.log('  Many critical issues - consider clean slate approach');
  }

  return diagnosis;
}

// Run the comprehensive diagnosis
comprehensiveDiagnosis().catch(console.error); 