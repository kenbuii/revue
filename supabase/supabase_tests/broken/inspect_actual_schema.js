// Inspect Actual Database Schema
async function inspectActualSchema() {
  console.log('🔍 INSPECTING ACTUAL DATABASE SCHEMA');
  console.log('====================================\n');
  
  const supabaseUrl = 'https://tiikwgddqkqhixvgcvvj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaWt3Z2RkcWtxaGl4dmdjdnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDUyMDYsImV4cCI6MjA2MTQ4MTIwNn0.eTDrFViVjACTddmX-rbB1BpL5SvYUg1RKbwkVInKNTY';
  
  // Get actual table structures using information_schema queries
  const queries = {
    // Get all columns for each table
    getColumns: `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name IN ('user_profiles', 'media_items', 'user_bookmarks', 'posts', 'comments', 'post_likes', 'comment_likes', 'user_follows', 'friend_requests', 'user_lists', 'list_items')
      ORDER BY table_name, ordinal_position
    `,
    
    // Get primary key constraints
    getPrimaryKeys: `
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('user_profiles', 'media_items', 'user_bookmarks', 'posts', 'comments', 'post_likes', 'comment_likes', 'user_follows', 'friend_requests', 'user_lists', 'list_items')
      ORDER BY tc.table_name
    `,
    
    // Get foreign key constraints
    getForeignKeys: `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('user_profiles', 'media_items', 'user_bookmarks', 'posts', 'comments', 'post_likes', 'comment_likes', 'user_follows', 'friend_requests', 'user_lists', 'list_items')
      ORDER BY tc.table_name
    `
  };

  try {
    console.log('1️⃣ Getting actual column structures...\n');
    
    // Execute information_schema query via RPC
    const columnsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/query_information_schema`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_text: queries.getColumns
      })
    });

    if (columnsResponse.status === 404) {
      console.log('❌ Cannot access information_schema directly');
      console.log('Let me try a different approach...\n');
      
      // Alternative: Check each table individually by trying to select with specific columns
      const tables = ['user_profiles', 'media_items', 'user_bookmarks', 'posts', 'comments', 'post_likes', 'comment_likes', 'user_follows', 'friend_requests', 'user_lists', 'list_items'];
      
      for (const table of tables) {
        console.log(`🔍 Checking ${table} structure...`);
        
        // Try to select common column names to see which exist
        const testColumns = ['id', 'user_id', 'created_at', 'updated_at', 'title', 'content', 'name'];
        const existingColumns = [];
        
        for (const col of testColumns) {
          try {
            const testResponse = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${col}&limit=0`, {
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
              }
            });
            
            if (testResponse.ok) {
              existingColumns.push(col);
            }
          } catch (e) {
            // Column doesn't exist
          }
        }
        
        console.log(`  Existing columns: ${existingColumns.length > 0 ? existingColumns.join(', ') : 'None detected'}`);
        
        // Try to get detailed error by attempting an insert
        try {
          const insertTest = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
          });
          
          if (!insertTest.ok) {
            const errorText = await insertTest.text();
            console.log(`  Insert test error: ${errorText}`);
          }
        } catch (e) {
          // Expected to fail
        }
      }
      
    } else {
      const columnsData = await columnsResponse.json();
      console.log('✅ Retrieved column information:');
      console.log(JSON.stringify(columnsData, null, 2));
    }

    console.log('\n💡 RECOMMENDATION:');
    console.log('Based on the primary key error, it seems tables have existing structure.');
    console.log('We should either:');
    console.log('1. Use ALTER TABLE ... DROP COLUMN / ADD COLUMN for specific missing pieces');
    console.log('2. Use CREATE TABLE IF NOT EXISTS with complete schemas');
    console.log('3. Drop and recreate tables entirely');

  } catch (error) {
    console.error('💥 Schema inspection error:', error.message);
  }
}

// Run the schema inspection
inspectActualSchema().catch(console.error); 