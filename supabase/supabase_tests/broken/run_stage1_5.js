const { Client } = require('pg');
const fs = require('fs');

async function runStage15() {
  const client = new Client({
    connectionString: 'postgresql://postgres.tiikwgddqkqhixvgcvvj:zPD8JKEX9H2C2kx3@aws-0-us-west-1.pooler.supabase.com:6543/postgres'
  });

  try {
    console.log('🚀 Running Stage 1.5: App-Compatible Schema...');
    
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('supabase/stage1_5_app_compatible.sql', 'utf8');
    
    console.log('📄 Executing SQL script...');
    
    // Execute the SQL
    const result = await client.query(sqlContent);
    
    console.log('✅ Stage 1.5 executed successfully!');
    console.log('📋 Query result:', result);
    
  } catch (err) {
    console.error('❌ Error running Stage 1.5:', err.message);
    console.error('🔍 Error details:', err);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runStage15(); 