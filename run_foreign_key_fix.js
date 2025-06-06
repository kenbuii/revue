const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runForeignKeyFix() {
  console.log('🔗 === ADDING FOREIGN KEY RELATIONSHIPS ===');
  
  const sqlCommands = [
    `ALTER TABLE posts ADD CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;`,
    `ALTER TABLE posts ADD CONSTRAINT fk_posts_media_item_id FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE SET NULL;`,
    `ALTER TABLE post_likes ADD CONSTRAINT fk_post_likes_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;`,
    `ALTER TABLE post_likes ADD CONSTRAINT fk_post_likes_user_id FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;`
  ];
  
  for (const sql of sqlCommands) {
    console.log(`\n🔧 Running: ${sql.substring(0, 50)}...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Constraint already exists, skipping');
      } else {
        console.error('❌ Error:', error.message);
      }
    } else {
      console.log('✅ Success');
    }
  }
  
  // Test the feed query again
  console.log('\n🧪 Testing feed query after foreign key fix...');
  const { data: testFeed, error: testFeedError } = await supabase
    .from('posts')
    .select('*,user_profiles!inner(*),media_items(*)')
    .eq('visibility', 'public')
    .eq('user_profiles.onboarding_completed', true)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (testFeedError) {
    console.error('❌ Feed query still failing:', testFeedError.message);
  } else {
    console.log('✅ Feed query works! Found', testFeed.length, 'posts');
  }
}

runForeignKeyFix(); 
 