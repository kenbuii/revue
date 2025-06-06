const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env file if it exists
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function runSQLDirect(sql) {
  try {
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .eq('query', sql)
      .single();

    if (error) {
      console.error('❌ Error executing SQL:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

async function main() {
  try {
    // First create the exec_sql function
    console.log('🔧 Step 1: Creating exec_sql function...');
    const createFuncSQL = fs.readFileSync('create_exec_sql.sql', 'utf8');
    await runSQLDirect(createFuncSQL);
    
    // Now run our verification and fixes
    console.log('\n📋 Step 2: Running verification...');
    const verifySQL = fs.readFileSync('verify_media_posts.sql', 'utf8');
    const verifyResults = await runSQLDirect(verifySQL);
    console.log('Verification results:', verifyResults);
    
    console.log('\n🔧 Step 3: Applying schema fixes...');
    const fixSQL = fs.readFileSync('fix_media_items_schema.sql', 'utf8');
    const fixResults = await runSQLDirect(fixSQL);
    console.log('Fix results:', fixResults);
    
    console.log('\n✨ Step 4: Verifying after fix...');
    const finalVerifyResults = await runSQLDirect(verifySQL);
    console.log('Final verification results:', finalVerifyResults);
    
  } catch (error) {
    console.error('❌ Error in main:', error);
  }
}

main().catch(console.error); 