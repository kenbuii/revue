const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjczMTk1MSwiZXhwIjoyMDQ4MzA3OTUxfQ.O5zNxf5MeLhxowZS6aeUjLkFVLLJQ0eKSmEV9vLX8Jg';

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test simple query
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log('📋 Data:', data);
    }
    
  } catch (err) {
    console.error('💥 Script error:', err.message);
  }
}

testConnection(); 