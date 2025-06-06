const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugMediaCreation() {
  console.log('🎬 === DEBUGGING MEDIA CREATION ===');
  
  // Test 1: Check if media_items table exists
  console.log('\n📊 Step 1: Check media_items table...');
  const { data: mediaItems, error: mediaError } = await supabase
    .from('media_items')
    .select('*')
    .limit(5);
    
  if (mediaError) {
    console.log('❌ Media items table issue:', mediaError.message);
  } else {
    console.log('✅ Media items table exists, found', mediaItems.length, 'items');
    if (mediaItems.length > 0) {
      console.log('📋 Sample media item:', Object.keys(mediaItems[0]));
    }
  }
  
  // Test 2: Try upsert_media_item function
  console.log('\n🔧 Step 2: Test upsert_media_item function...');
  try {
    const { data: upsertResult, error: upsertError } = await supabase.rpc('upsert_media_item', {
      p_media_id: 'test_movie_debug',
      p_title: 'Debug Test Movie',
      p_media_type: 'movie',
      p_year: '2024',
      p_image_url: 'https://example.com/poster.jpg',
      p_description: 'Test description',
      p_creator: 'Test Director',
      p_genre: 'action',
      p_source: 'popular',
      p_original_api_id: null,
    });
    
    if (upsertError) {
      console.log('❌ upsert_media_item failed:', upsertError.message);
    } else {
      console.log('✅ upsert_media_item works:', upsertResult);
    }
  } catch (error) {
    console.log('❌ upsert_media_item error:', error.message);
  }
  
  // Test 3: Try direct insertion
  console.log('\n📝 Step 3: Test direct media_items insertion...');
  try {
    const { data: insertResult, error: insertError } = await supabase
      .from('media_items')
      .insert({
        id: 'test_direct_insert',
        title: 'Direct Insert Movie',
        media_type: 'movie',
        year: '2024',
        image_url: 'https://example.com/poster2.jpg',
        description: 'Direct insert test',
        creator: 'Direct Director',
        genre: 'comedy',
        source: 'popular',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
      
    if (insertError) {
      console.log('❌ Direct insert failed:', insertError.message);
    } else {
      console.log('✅ Direct insert works:', insertResult);
    }
  } catch (error) {
    console.log('❌ Direct insert error:', error.message);
  }
  
  // Test 4: Test post creation with media
  console.log('\n📝 Step 4: Test post creation with media...');
  try {
    const { data: postResult, error: postError } = await supabase.rpc('create_post', {
      p_user_id: '1ccd0502-4347-487e-a450-4e994e216ad4',
      p_content: 'Debug post with media test',
      p_media_item_id: 'test_movie_debug',
      p_rating: 7,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });
    
    if (postError) {
      console.log('❌ Post creation with media failed:', postError.message);
    } else {
      console.log('✅ Post creation with media works:', postResult);
    }
  } catch (error) {
    console.log('❌ Post creation error:', error.message);
  }
  
  // Test 5: Check the created post
  console.log('\n🔍 Step 5: Check if posts now have media_item_id...');
  const { data: newPosts, error: newPostsError } = await supabase
    .from('posts')
    .select('id, media_item_id, content')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (newPostsError) {
    console.log('❌ New posts check failed:', newPostsError.message);
  } else {
    console.log('✅ Latest posts:');
    newPosts.forEach(p => {
      console.log(`  ${p.id.substring(0, 8)}: media_item_id=${p.media_item_id}, content=${p.content?.substring(0, 30)}...`);
    });
  }
  
  console.log('\n🎯 === MEDIA CREATION DEBUG COMPLETE ===');
  console.log('💡 This shows us:');
  console.log('   1. If media_items table is accessible');
  console.log('   2. If upsert_media_item function works');
  console.log('   3. If direct insertion works');
  console.log('   4. If posts can be created with media_item_id');
}

debugMediaCreation(); 