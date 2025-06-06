const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Use the same configuration as your app
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Environment check:');
console.log('- URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('- Key:', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFunction() {
  try {
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    console.log('\n🔧 Testing get_user_media_preferences function...');
    console.log('User ID:', testUserId);
    
    // Call the function exactly like the app does
    const { data, error } = await supabase.rpc('get_user_media_preferences', {
      p_user_id: testUserId
    });
    
    console.log('\n📊 Results:');
    console.log('- Error:', error ? JSON.stringify(error, null, 2) : 'None');
    console.log('- Data type:', typeof data);
    console.log('- Data length:', data ? data.length : 'N/A');
    console.log('- Raw data:', JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      console.log('\n📋 First item details:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('\n❌ No data returned from function');
      
      // Let's also try a direct table query
      console.log('\n🔍 Checking table directly...');
      const { data: tableData, error: tableError } = await supabase
        .from('user_media_preferences')
        .select('*')
        .eq('user_id', testUserId);
        
      console.log('- Table error:', tableError ? JSON.stringify(tableError, null, 2) : 'None');
      console.log('- Table data length:', tableData ? tableData.length : 'N/A');
      
      if (tableData && tableData.length > 0) {
        console.log('- Table has data! First item:');
        console.log(JSON.stringify(tableData[0], null, 2));
        console.log('\n🚨 ISSUE FOUND: Table has data but function returns empty!');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFunction(); 
 