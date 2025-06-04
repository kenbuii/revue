require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSchema() {
  console.log('🔍 DEBUGGING DATABASE SCHEMA');
  console.log('='.repeat(40));

  // Check what tables exist
  console.log('\n📋 Available Tables:');
  try {
    // Try to list posts
    const { data: posts, error: postsError } = await supabase.from('posts').select('*').limit(1);
    console.log('✅ Posts table:', postsError ? `❌ ${postsError.message}` : `✅ Found ${posts?.length || 0} records`);
    
    if (posts && posts.length > 0) {
      console.log('   Sample post columns:', Object.keys(posts[0]));
    }
  } catch (error) {
    console.log('❌ Posts table error:', error.message);
  }

  // Try different variations of users table
  const userTableVariations = ['users', 'profiles', 'user_profiles', 'auth.users'];
  for (const tableName of userTableVariations) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      console.log(`✅ ${tableName} table:`, error ? `❌ ${error.message}` : `✅ Found ${data?.length || 0} records`);
      
      if (data && data.length > 0) {
        console.log(`   Sample ${tableName} columns:`, Object.keys(data[0]));
      }
    } catch (error) {
      console.log(`❌ ${tableName} table error:`, error.message);
    }
  }

  // Try different variations of media table  
  const mediaTableVariations = ['media', 'medias', 'media_items', 'content'];
  for (const tableName of mediaTableVariations) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      console.log(`✅ ${tableName} table:`, error ? `❌ ${error.message}` : `✅ Found ${data?.length || 0} records`);
      
      if (data && data.length > 0) {
        console.log(`   Sample ${tableName} columns:`, Object.keys(data[0]));
      }
    } catch (error) {
      console.log(`❌ ${tableName} table error:`, error.message);
    }
  }

  // Check foreign key relationships in posts
  console.log('\n🔗 Posts Table Foreign Keys:');
  try {
    const { data: posts } = await supabase.from('posts').select('*').limit(1);
    if (posts && posts.length > 0) {
      const post = posts[0];
      console.log('   user_id:', post.user_id ? '✅ Present' : '❌ Missing');
      console.log('   media_id:', post.media_id ? '✅ Present' : '❌ Missing');
      console.log('   author_id:', post.author_id ? '✅ Present' : '❌ Missing');
    }
  } catch (error) {
    console.log('❌ Error checking foreign keys:', error.message);
  }

  // Test direct joins with different column names
  console.log('\n🔀 Testing Direct Joins:');
  const joinVariations = [
    { table: 'profiles', key: 'user_id', foreign: 'id' },
    { table: 'profiles', key: 'author_id', foreign: 'id' },
    { table: 'users', key: 'user_id', foreign: 'id' },
    { table: 'media', key: 'media_id', foreign: 'id' },
    { table: 'medias', key: 'media_id', foreign: 'id' }
  ];

  for (const join of joinVariations) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, ${join.table}(*)`)
        .limit(1);
        
      console.log(`   posts -> ${join.table}:`, error ? `❌ ${error.message}` : '✅ Join successful');
    } catch (error) {
      console.log(`   posts -> ${join.table}: ❌ ${error.message}`);
    }
  }
}

debugSchema().catch(console.error); 