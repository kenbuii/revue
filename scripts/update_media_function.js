const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function updateMediaFunction() {
  try {
    // First, let's try to create a media item directly
    const testMediaId = 'test_book_' + Date.now();
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
      console.error('Failed to create test media item:', mediaError);
      return;
    }

    console.log('✅ Test media item created:', mediaItem);

    // Now let's try to create a post with this media item
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

    console.log('✅ Test post created:', post);

    // Now let's verify the post was created with the media item
    const { data: createdPost, error: fetchError } = await supabase
      .from('posts')
      .select('*, media_items(*)')
      .eq('id', post.post_id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch created post:', fetchError);
      return;
    }

    console.log('✅ Created post with media:', createdPost);

  } catch (error) {
    console.error('Error:', error);
  }
}

updateMediaFunction(); 