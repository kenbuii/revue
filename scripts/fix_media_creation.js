const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixMediaCreation() {
  try {
    // Step 1: Create a test media item directly in the media_items table
    const testMediaId = 'test_book_debug_' + Date.now();
    const { data: mediaItem, error: mediaError } = await supabase
      .from('media_items')
      .insert({
        id: testMediaId,
        title: 'Test Book',
        media_type: 'book',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (mediaError) {
      console.error('Failed to create media item:', mediaError);
      return;
    }

    console.log('✅ Media item created:', mediaItem);

    // Step 2: Create a post using the test media item
    const { data: post, error: postError } = await supabase.rpc('create_post', {
      p_user_id: '1ccd0502-4347-487e-a450-4e994e216ad4',
      p_content: 'Test post with media',
      p_media_item_id: testMediaId,
      p_rating: 8,
      p_contains_spoilers: false,
      p_visibility: 'public'
    });

    if (postError) {
      console.error('Failed to create post:', postError);
      return;
    }

    console.log('✅ Post created:', post);

  } catch (error) {
    console.error('Error:', error);
  }
}

fixMediaCreation(); 