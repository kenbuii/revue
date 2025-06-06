const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigatePostsStructure() {
  try {
    console.log('🔍 Investigating posts table structure and data...');
    
    // Check posts table structure and data
    console.log('\n📋 === POSTS TABLE INVESTIGATION ===');
    
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(5);
      
    if (postsError) {
      console.error('❌ Error accessing posts:', postsError.message);
    } else {
      console.log('✅ Posts table accessible');
      console.log('📊 Row count:', postsData.length);
      
      if (postsData.length > 0) {
        console.log('\n📋 First post structure:');
        console.log(JSON.stringify(postsData[0], null, 2));
        
        console.log('\n📋 All columns available:');
        console.log(Object.keys(postsData[0]));
      } else {
        console.log('⚠️ Posts table is empty - this explains why functions return 0 items!');
      }
    }
    
    // Check comments table
    console.log('\n💬 === COMMENTS TABLE INVESTIGATION ===');
    
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(3);
      
    if (commentsError) {
      console.error('❌ Error accessing comments:', commentsError.message);
    } else {
      console.log('✅ Comments table accessible');
      console.log('📊 Row count:', commentsData.length);
      
      if (commentsData.length > 0) {
        console.log('\n📋 First comment structure:');
        console.log(JSON.stringify(commentsData[0], null, 2));
      }
    }
    
    // Check notifications table
    console.log('\n🔔 === NOTIFICATIONS TABLE INVESTIGATION ===');
    
    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(3);
      
    if (notificationsError) {
      console.error('❌ Error accessing notifications:', notificationsError.message);
    } else {
      console.log('✅ Notifications table accessible');
      console.log('📊 Row count:', notificationsData.length);
      
      if (notificationsData.length > 0) {
        console.log('\n📋 First notification structure:');
        console.log(JSON.stringify(notificationsData[0], null, 2));
      }
    }
    
    // Test creating a sample post to see if that works
    console.log('\n🧪 === TESTING POST CREATION ===');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Try to create a post using a function if it exists
    const { data: createPostData, error: createPostError } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'Test post from investigation',
      p_media_id: 'test_movie_123',
      p_media_title: 'Test Movie',
      p_media_type: 'movie'
    });
    
    if (createPostError) {
      console.log('⚠️ create_post function issue:', createPostError.message);
      
      // Try direct insert instead
      console.log('🔄 Trying direct post insert...');
      
      const { data: insertData, error: insertError } = await supabase
        .from('posts')
        .insert([{
          user_id: testUserId,
          content: 'Test post from investigation',
          media_id: 'test_movie_123',
          media_title: 'Test Movie',
          media_type: 'movie',
          created_at: new Date().toISOString()
        }])
        .select();
        
      if (insertError) {
        console.error('❌ Direct insert failed:', insertError.message);
        console.log('💡 This tells us about the posts table structure expectations');
      } else {
        console.log('✅ Direct insert successful:', insertData);
      }
    } else {
      console.log('✅ create_post function works:', createPostData);
    }
    
    // Now test if the functions return the new data
    console.log('\n🔄 === RE-TESTING FUNCTIONS AFTER INSERT ===');
    
    const { data: feedDataAfter, error: feedErrorAfter } = await supabase.rpc('get_for_you_feed', { 
      p_limit: 5, 
      p_offset: 0 
    });
    console.log('get_for_you_feed after insert:', feedErrorAfter ? `❌ ${feedErrorAfter.message}` : `✅ Works (returned ${feedDataAfter ? feedDataAfter.length : 0} items)`);
    
    const { data: userPostsAfter, error: userPostsErrorAfter } = await supabase.rpc('get_user_posts', { 
      p_user_id: testUserId, 
      p_limit: 5, 
      p_offset: 0 
    });
    console.log('get_user_posts after insert:', userPostsErrorAfter ? `❌ ${userPostsErrorAfter.message}` : `✅ Works (returned ${userPostsAfter ? userPostsAfter.length : 0} items)`);
    
    if (feedDataAfter && feedDataAfter.length > 0) {
      console.log('\n📋 Feed data structure:');
      console.log(JSON.stringify(feedDataAfter[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigatePostsStructure(); 
 