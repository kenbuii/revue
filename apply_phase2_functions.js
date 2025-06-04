// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Create Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function applyPhase2Functions() {
  console.log('🔧 APPLYING PHASE 2 FUNCTIONS');
  console.log('==============================');
  console.log('');

  try {
    // Read the SQL file
    const sql = fs.readFileSync('restore_phase2_functions.sql', 'utf8');
    
    // Split into individual statements and filter out comments
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('');

    // Apply each function individually
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip select statements and empty statements
      if (statement.toLowerCase().includes('select ') || statement.trim().length < 10) {
        continue;
      }

      console.log(`⚙️ Applying function ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 APPLICATION SUMMARY');
    console.log('======================');
    console.log(`✅ Successfully applied: ${successCount} functions`);
    console.log(`❌ Errors encountered: ${errorCount} functions`);
    
    if (errorCount === 0) {
      console.log('');
      console.log('🎉 ALL PHASE 2 FUNCTIONS RESTORED!');
      console.log('Phase 3 UI components now have full database support');
      console.log('');
      console.log('🧪 Run: node run_phase3_tests.js to verify');
    } else {
      console.log('');
      console.log('⚠️ Some functions failed to apply');
      console.log('This may be due to exec_sql function not being available');
      console.log('Functions may need to be applied manually via Supabase dashboard');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('');
    console.log('💡 Alternative: Copy functions from restore_phase2_functions.sql');
    console.log('   and paste them in your Supabase SQL Editor manually');
  }
}

// Run the application
applyPhase2Functions(); 