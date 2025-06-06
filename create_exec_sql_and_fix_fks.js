const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExecSqlAndFixForeignKeys() {
  console.log('🔧 === CREATING EXEC_SQL FUNCTION AND FIXING FOREIGN KEYS ===');
  
  // First create the exec_sql function
  console.log('\n📝 Creating exec_sql function...');
  const createExecSqlQuery = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'Success';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN SQLERRM;
    END;
    $$;
  `;
  
  // Use direct SQL execution through Supabase's SQL editor endpoint
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({ sql_query: createExecSqlQuery })
    });
    
    if (!response.ok) {
      // Try alternative approach - create function directly
      console.log('⚠️ Direct RPC failed, trying alternative approach...');
      
      // Let's try to add foreign keys using a different method
      console.log('\n🔗 Adding foreign keys using direct SQL...');
      
      const foreignKeyQueries = [
        'ALTER TABLE posts ADD CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE',
        'ALTER TABLE posts ADD CONSTRAINT fk_posts_media_item_id FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE SET NULL',
        'ALTER TABLE post_likes ADD CONSTRAINT fk_post_likes_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE',
        'ALTER TABLE post_likes ADD CONSTRAINT fk_post_likes_user_id FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE'
      ];
      
      // Try using the SQL endpoint directly
      for (const query of foreignKeyQueries) {
        console.log(`\n🔧 Executing: ${query.substring(0, 50)}...`);
        
        try {
          const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
            },
            body: JSON.stringify({ query })
          });
          
          if (sqlResponse.ok) {
            console.log('✅ Success');
          } else {
            const errorText = await sqlResponse.text();
            if (errorText.includes('already exists')) {
              console.log('✅ Constraint already exists');
            } else {
              console.log('❌ Error:', errorText);
            }
          }
        } catch (error) {
          console.log('❌ Error:', error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error creating exec_sql function:', error.message);
  }
  
  // Test the feed query
  console.log('\n🧪 Testing feed query...');
  const { data: testFeed, error: testFeedError } = await supabase
    .from('posts')
    .select('*,user_profiles!inner(*),media_items(*)')
    .eq('visibility', 'public')
    .eq('user_profiles.onboarding_completed', true)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (testFeedError) {
    console.error('❌ Feed query still failing:', testFeedError.message);
    
    // Try a simpler approach - use the working RPC function instead
    console.log('\n🔄 Trying RPC function approach...');
    const { data: rpcFeed, error: rpcError } = await supabase.rpc('get_for_you_feed', {
      p_limit: 5,
      p_offset: 0
    });
    
    if (rpcError) {
      console.error('❌ RPC also failing:', rpcError.message);
    } else {
      console.log('✅ RPC works! Found', rpcFeed.length, 'posts');
      console.log('💡 SOLUTION: Use RPC functions instead of REST API joins');
    }
  } else {
    console.log('✅ Feed query works! Found', testFeed.length, 'posts');
  }
}

createExecSqlAndFixForeignKeys(); 
 