const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkActualSchema() {
  try {
    console.log('🔍 Checking actual table schemas...');
    
    // Try different insert variations to understand posts table structure
    console.log('\n📋 === POSTS TABLE SCHEMA DISCOVERY ===');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Try minimal insert to see what columns are required/available
    const attempts = [
      // Attempt 1: Minimal structure
      {
        name: 'Minimal structure',
        data: {
          user_id: testUserId,
          content: 'Test post 1',
          created_at: new Date().toISOString()
        }
      },
      // Attempt 2: Add common columns
      {
        name: 'With title and type',
        data: {
          user_id: testUserId,
          content: 'Test post 2',
          title: 'Test Title',
          type: 'movie',
          created_at: new Date().toISOString()
        }
      },
      // Attempt 3: Try different media column names
      {
        name: 'With media columns v1',
        data: {
          user_id: testUserId,
          content: 'Test post 3',
          media_title: 'Test Movie',
          media_type: 'movie',
          created_at: new Date().toISOString()
        }
      },
      // Attempt 4: Try post-specific columns
      {
        name: 'Post-specific columns',
        data: {
          user_id: testUserId,
          content: 'Test post 4',
          rating: 5,
          review_type: 'full',
          created_at: new Date().toISOString()
        }
      }
    ];
    
    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      console.log(`\n🧪 Attempt ${i + 1}: ${attempt.name}`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('posts')
        .insert([attempt.data])
        .select();
        
      if (insertError) {
        console.log(`❌ Failed: ${insertError.message}`);
        
        // If it's a column error, it tells us what columns exist
        if (insertError.message.includes('column')) {
          console.log('💡 This reveals information about table structure');
        }
      } else {
        console.log(`✅ Success! Insert worked with structure:`, Object.keys(attempt.data));
        console.log('📊 Returned data:', insertData);
        
        // If successful, let's see what the actual stored data looks like
        if (insertData && insertData.length > 0) {
          console.log('📋 Actual stored structure:');
          console.log(Object.keys(insertData[0]));
        }
        
        break; // Stop on first success
      }
    }
    
    // Check comments table structure
    console.log('\n💬 === COMMENTS TABLE SCHEMA DISCOVERY ===');
    
    const commentAttempts = [
      {
        name: 'Basic comment structure',
        data: {
          user_id: testUserId,
          post_id: 'test-post-123',
          content: 'Test comment',
          created_at: new Date().toISOString()
        }
      },
      {
        name: 'Comment with parent',
        data: {
          user_id: testUserId,
          content: 'Test comment 2',
          parent_id: null,
          created_at: new Date().toISOString()
        }
      }
    ];
    
    for (let i = 0; i < commentAttempts.length; i++) {
      const attempt = commentAttempts[i];
      console.log(`\n🧪 Comment Attempt ${i + 1}: ${attempt.name}`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('comments')
        .insert([attempt.data])
        .select();
        
      if (insertError) {
        console.log(`❌ Failed: ${insertError.message}`);
      } else {
        console.log(`✅ Success! Comments structure:`, Object.keys(attempt.data));
        console.log('📊 Returned data:', insertData);
        break;
      }
    }
    
    // Check notifications table structure  
    console.log('\n🔔 === NOTIFICATIONS TABLE SCHEMA DISCOVERY ===');
    
    const notificationAttempts = [
      {
        name: 'Basic notification',
        data: {
          user_id: testUserId,
          type: 'like',
          title: 'Test notification',
          message: 'Someone liked your post',
          created_at: new Date().toISOString()
        }
      }
    ];
    
    for (let i = 0; i < notificationAttempts.length; i++) {
      const attempt = notificationAttempts[i];
      console.log(`\n🧪 Notification Attempt ${i + 1}: ${attempt.name}`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('notifications')
        .insert([attempt.data])
        .select();
        
      if (insertError) {
        console.log(`❌ Failed: ${insertError.message}`);
      } else {
        console.log(`✅ Success! Notifications structure:`, Object.keys(attempt.data));
        console.log('📊 Returned data:', insertData);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Schema discovery failed:', error);
  }
}

checkActualSchema(); 
 