const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDatabaseAudit() {
  try {
    console.log('🔍 Running comprehensive database audit...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('comprehensive_database_audit.sql', 'utf8');
    
    // Execute the audit
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Audit failed:', error);
      
      // Try alternative approach - check tables directly
      console.log('\n🔄 Trying alternative audit approach...');
      
      // Check if posts table exists
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .limit(1);
        
      console.log('Posts table check:', postsError ? `❌ ${postsError.message}` : `✅ Exists with sample data`);
      
      // Check if comments table exists
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .limit(1);
        
      console.log('Comments table check:', commentsError ? `❌ ${commentsError.message}` : `✅ Exists`);
      
      // Check if likes table exists
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('*')
        .limit(1);
        
      console.log('Likes table check:', likesError ? `❌ ${likesError.message}` : `✅ Exists`);
      
      // Check if notifications table exists
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);
        
      console.log('Notifications table check:', notificationsError ? `❌ ${notificationsError.message}` : `✅ Exists`);
      
      // Test some functions
      console.log('\n⚙️ Testing key functions...');
      
      const { data: feedData, error: feedError } = await supabase.rpc('get_for_you_feed', { p_limit: 5, p_offset: 0 });
      console.log('get_for_you_feed:', feedError ? `❌ ${feedError.message}` : `✅ Works (returned ${feedData ? feedData.length : 0} items)`);
      
      const { data: userPostsData, error: userPostsError } = await supabase.rpc('get_user_posts', { 
        p_user_id: '1ccd0502-4347-487e-a450-4e994e216ad4', 
        p_limit: 5, 
        p_offset: 0 
      });
      console.log('get_user_posts:', userPostsError ? `❌ ${userPostsError.message}` : `✅ Works (returned ${userPostsData ? userPostsData.length : 0} items)`);
      
    } else {
      console.log('✅ Audit executed successfully');
      console.log('Result:', data);
    }
    
  } catch (error) {
    console.error('❌ Failed to run audit:', error);
  }
}

runDatabaseAudit(); 
 