const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateConstraints() {
  try {
    console.log('🔍 === INVESTIGATING DATABASE CONSTRAINTS & FEED ISSUES ===');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Test 1: Investigate rating constraint
    console.log('\n📊 === TESTING RATING CONSTRAINT ===');
    
    const ratings = [1, 5, 8, 10, 11, 0, -1];
    
    for (const rating of ratings) {
      console.log(`\nTesting rating: ${rating}`);
      
      const { data: result, error } = await supabase.rpc('create_post', {
        p_user_id: testUserId,
        p_content: `Test post with rating ${rating}`,
        p_media_item_id: null,
        p_rating: rating,
        p_contains_spoilers: false,
        p_visibility: 'public'
      });
      
      if (error) {
        console.log(`❌ Rating ${rating} failed:`, error.message);
      } else if (result.success) {
        console.log(`✅ Rating ${rating} SUCCESS:`, result.post_id);
      } else {
        console.log(`❌ Rating ${rating} failed:`, result.error);
      }
    }
    
    // Test 2: Test with null rating
    console.log('\n📊 === TESTING NULL RATING ===');
    
    const { data: nullResult, error: nullError } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'Test post with null rating',
      p_media_item_id: null,
      p_rating: null,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (nullError) {
      console.log('❌ Null rating failed:', nullError.message);
    } else if (nullResult.success) {
      console.log('✅ Null rating SUCCESS:', nullResult.post_id);
    } else {
      console.log('❌ Null rating failed:', nullResult.error);
    }
    
    // Test 3: Investigate feed service issues
    console.log('\n📰 === TESTING FEED SERVICE ===');
    
    const { data: feedData, error: feedError } = await supabase.rpc('get_for_you_feed', {
      p_limit: 5,
      p_offset: 0
    });
    
    if (feedError) {
      console.error('❌ Feed service failed:', feedError);
    } else {
      console.log('✅ Feed service works:', feedData.length, 'posts');
      
      if (feedData.length > 0) {
        console.log('📋 Sample feed post:', {
          id: feedData[0].id,
          rating: feedData[0].rating,
          content: feedData[0].content?.substring(0, 30) + '...'
        });
      }
    }
    
    // Test 4: Check posts table structure and constraints
    console.log('\n📊 === CHECKING POSTS TABLE CONSTRAINTS ===');
    
    try {
      // Try to get posts table info using information_schema
      const { data: constraintData, error: constraintError } = await supabase
        .from('information_schema.check_constraints')
        .select('*')
        .ilike('constraint_name', '%posts%rating%');
        
      if (constraintError) {
        console.log('❌ Could not check constraints:', constraintError.message);
      } else {
        console.log('📋 Rating constraints found:', constraintData);
      }
    } catch (error) {
      console.log('⚠️ Constraint check not accessible');
    }
    
    // Test 5: Check what ratings exist in current posts
    console.log('\n📊 === CHECKING EXISTING POST RATINGS ===');
    
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('rating')
      .not('rating', 'is', null)
      .limit(10);
      
    if (postsError) {
      console.error('❌ Could not fetch posts:', postsError);
    } else {
      console.log('📋 Existing ratings in database:', posts.map(p => p.rating));
    }
    
    console.log('\n🎯 === INVESTIGATION COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateConstraints(); 
 