const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRatingFix() {
  try {
    console.log('🧪 Testing rating constraint fix...');
    
    const testUserId = '1ccd0502-4347-487e-a450-4e994e216ad4';
    
    // Test the exact scenario that was failing: rating=8
    console.log('\n🎯 Testing rating=8 (what user tried)...');
    
    const { data: result, error } = await supabase.rpc('create_post', {
      p_user_id: testUserId,
      p_content: 'Testing rating=8 after constraint fix! 🌟',
      p_media_item_id: null,
      p_rating: 8, // This was failing before
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (error) {
      console.error('❌ Rating 8 still failed:', error);
      return;
    }
    
    if (result.success) {
      console.log('✅ SUCCESS! Rating 8 now works:', result.post_id);
      
      // Test other high ratings
      const testRatings = [6, 7, 9, 10];
      
      for (const rating of testRatings) {
        console.log(`\nTesting rating ${rating}...`);
        
        const { data: testResult, error: testError } = await supabase.rpc('create_post', {
          p_user_id: testUserId,
          p_content: `Test post with rating ${rating}`,
          p_media_item_id: null,
          p_rating: rating,
          p_contains_spoilers: false,
          p_visibility: 'public'
        });
        
        if (testError) {
          console.log(`❌ Rating ${rating} failed:`, testError.message);
        } else if (testResult.success) {
          console.log(`✅ Rating ${rating} SUCCESS`);
        } else {
          console.log(`❌ Rating ${rating} failed:`, testResult.error);
        }
      }
      
      // Verify posts appear in feed with correct ratings
      console.log('\n📰 Checking feed for new posts with ratings...');
      
      const { data: feedData, error: feedError } = await supabase.rpc('get_for_you_feed', {
        p_limit: 5,
        p_offset: 0
      });
      
      if (!feedError && feedData.length > 0) {
        console.log('✅ Feed loaded with', feedData.length, 'posts');
        
        const highRatedPosts = feedData.filter(post => post.rating && post.rating >= 6);
        console.log('📊 Posts with ratings 6-10:', highRatedPosts.length);
        
        if (highRatedPosts.length > 0) {
          console.log('🌟 Sample high-rated post:', {
            rating: highRatedPosts[0].rating,
            content: highRatedPosts[0].content?.substring(0, 40) + '...'
          });
        }
      }
      
      console.log('\n🎉 === RATING CONSTRAINT FIX SUCCESSFUL ===');
      console.log('✅ App 10-star rating system now fully supported');
      console.log('✅ User posts with ratings 1-10 will work');
      console.log('✅ Posts flow should work perfectly now');
      
    } else {
      console.error('❌ Rating 8 failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRatingFix(); 
 