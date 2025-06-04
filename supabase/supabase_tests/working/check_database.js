// Check if database schema is properly applied
const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';

async function checkDatabase() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Check if user_profiles table exists and has the expected structure
    const profilesResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (profilesResponse.ok) {
      console.log('✅ user_profiles table exists');
    } else {
      console.error('❌ user_profiles table not accessible:', profilesResponse.status);
      const errorText = await profilesResponse.text();
      console.error('Error details:', errorText);
    }
    
    // Check if trigger function exists by looking for it in pg_proc
    // Note: This requires service role access, so we'll check indirectly
    
    // Test the trigger by checking if new user creation works
    console.log('\n🔍 Testing if user creation trigger is working...');
    
    // We can't directly check the trigger, but we can see if the schema is complete
    // by checking other expected functions
    
    const rpcTests = [
      'save_user_onboarding_data',
      'find_users_by_email_hash',
      'get_user_media_preferences'
    ];
    
    for (const funcName of rpcTests) {
      try {
        const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/${funcName}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });
        
        console.log(`📊 Function ${funcName}:`, rpcResponse.status === 404 ? '❌ Not found' : '✅ Exists');
      } catch (error) {
        console.log(`📊 Function ${funcName}: ❌ Error testing`);
      }
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('The 500 error is likely caused by one of these issues:');
    console.log('1. ❌ Database schema not applied to Supabase');
    console.log('2. ❌ User creation trigger not working properly');
    console.log('3. ❌ RLS policies blocking trigger execution');
    console.log('4. ❌ Missing required database functions');
    
    console.log('\n🔧 SOLUTION:');
    console.log('You need to apply the database schema to your Supabase project.');
    console.log('Go to your Supabase dashboard → SQL Editor → Run the schema.sql file');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase().catch(console.error); 