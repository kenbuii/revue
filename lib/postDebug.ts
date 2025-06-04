import { supabaseAuth } from './supabase';
import { postService } from './posts';

// Post debugging utility
export class PostDebugger {
  
  static async debugCompletePostFlow() {
    console.log('🔧 === COMPLETE POST FLOW DEBUG ===');
    
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        console.log('❌ No current user session');
        return { success: false, error: 'Not authenticated' };
      }
      
      console.log('👤 === USER AUTH DATA ===');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Auth Metadata:', user.user_metadata);
      
      // 1. Test environment variables
      console.log('\n🔧 === ENVIRONMENT VARIABLES ===');
      const envTest = await this.testEnvironmentVariables();
      console.log('Environment test result:', envTest);
      
      // 2. Test database tables exist
      console.log('\n📊 === DATABASE TABLES TEST ===');
      const tablesTest = await this.testDatabaseTables();
      console.log('Tables test result:', tablesTest);
      
      // 3. Test media_items table
      console.log('\n🎬 === MEDIA ITEMS TABLE TEST ===');
      const mediaTest = await this.testMediaItemsTable();
      console.log('Media items test result:', mediaTest);
      
      // 4. Test posts table
      console.log('\n📝 === POSTS TABLE TEST ===');
      const postsTest = await this.testPostsTable();
      console.log('Posts test result:', postsTest);
      
      // 5. Test create sample media item
      console.log('\n🧪 === TEST CREATE MEDIA ITEM ===');
      const createMediaTest = await this.testCreateMediaItem();
      console.log('Create media test result:', createMediaTest);
      
      // 6. Test create sample post
      console.log('\n🧪 === TEST CREATE POST ===');
      const createPostTest = await this.testCreatePost();
      console.log('Create post test result:', createPostTest);
      
      return {
        success: true,
        envTest,
        tablesTest,
        mediaTest,
        postsTest,
        createMediaTest,
        createPostTest,
        message: 'Complete post debug finished - check console for detailed analysis'
      };
      
    } catch (error) {
      console.error('❌ Complete Post Debug Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async testEnvironmentVariables() {
    console.log('🔧 Testing environment variables...');
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
    
    if (supabaseUrl) {
      console.log('Supabase URL format:', supabaseUrl.startsWith('https://') ? '✅ Correct' : '❌ Invalid');
    }
    
    return {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      urlFormat: supabaseUrl?.startsWith('https://') || false
    };
  }
  
  static async testDatabaseTables() {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return { error: 'Missing Supabase configuration' };
      }
      
      const { data: session } = await supabaseAuth.getSession();
      const token = session.session?.access_token || supabaseKey;
      
      // Test media_items table
      console.log('Testing media_items table access...');
      const mediaResponse = await fetch(`${supabaseUrl}/rest/v1/media_items?limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Media items response status:', mediaResponse.status);
      const mediaResponseText = await mediaResponse.text();
      console.log('Media items response:', mediaResponseText);
      
      // Test posts table
      console.log('Testing posts table access...');
      const postsResponse = await fetch(`${supabaseUrl}/rest/v1/posts?limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Posts response status:', postsResponse.status);
      const postsResponseText = await postsResponse.text();
      console.log('Posts response:', postsResponseText);
      
      return {
        media_items: {
          status: mediaResponse.status,
          accessible: mediaResponse.status === 200,
          response: mediaResponseText
        },
        posts: {
          status: postsResponse.status,
          accessible: postsResponse.status === 200,
          response: postsResponseText
        }
      };
      
    } catch (error) {
      console.error('Database tables test error:', error);
      return { error: error instanceof Error ? error.message : 'Database test failed' };
    }
  }
  
  static async testMediaItemsTable() {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const { data: session } = await supabaseAuth.getSession();
      const token = session.session?.access_token || supabaseKey;
      
      // Get existing media items
      const response = await fetch(`${supabaseUrl}/rest/v1/media_items?select=*&limit=5`, {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      console.log('Media items sample data:', data);
      
      return {
        status: response.status,
        count: Array.isArray(data) ? data.length : 0,
        sample: data,
        accessible: response.status === 200
      };
      
    } catch (error) {
      console.error('Media items test error:', error);
      return { error: error instanceof Error ? error.message : 'Media items test failed' };
    }
  }
  
  static async testPostsTable() {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const { data: session } = await supabaseAuth.getSession();
      const token = session.session?.access_token || supabaseKey;
      
      // Get existing posts
      const response = await fetch(`${supabaseUrl}/rest/v1/posts?select=*&limit=5`, {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      console.log('Posts sample data:', data);
      
      return {
        status: response.status,
        count: Array.isArray(data) ? data.length : 0,
        sample: data,
        accessible: response.status === 200
      };
      
    } catch (error) {
      console.error('Posts test error:', error);
      return { error: error instanceof Error ? error.message : 'Posts test failed' };
    }
  }
  
  static async testCreateMediaItem() {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const { data: session } = await supabaseAuth.getSession();
      const token = session.session?.access_token || supabaseKey;
      
      const testMediaItem = {
        media_id: `test_book_${Date.now()}`,
        title: 'Test Book for Debug',
        media_type: 'book',
        year: '2024',
        image_url: 'https://via.placeholder.com/120x160',
        description: 'Test book created during debug',
        creator: 'Test Author',
        genre: 'fiction',
        source: 'popular',
        original_api_id: null,
      };
      
      console.log('Attempting to create test media item:', testMediaItem);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/media_items`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(testMediaItem)
      });
      
      const responseText = await response.text();
      console.log('Create media item response status:', response.status);
      console.log('Create media item response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }
      
      return {
        status: response.status,
        success: response.status === 201,
        response: responseData,
        testData: testMediaItem
      };
      
    } catch (error) {
      console.error('Create media item test error:', error);
      return { error: error instanceof Error ? error.message : 'Create media item test failed' };
    }
  }
  
  static async testCreatePost() {
    try {
      const { data: session } = await supabaseAuth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        return { error: 'Not authenticated' };
      }
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const token = session.session?.access_token || supabaseKey;
      
      const testPost = {
        user_id: user.id,
        media_id: `test_book_${Date.now()}`,
        title: 'Test Post for Debug',
        content: 'This is a test post created during debug to verify the posts table functionality.',
        rating: 8,
        content_type: 'review',
        tags: ['debug', 'test'],
        is_public: true
      };
      
      console.log('Attempting to create test post:', testPost);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/posts`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(testPost)
      });
      
      const responseText = await response.text();
      console.log('Create post response status:', response.status);
      console.log('Create post response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }
      
      return {
        status: response.status,
        success: response.status === 201,
        response: responseData,
        testData: testPost
      };
      
    } catch (error) {
      console.error('Create post test error:', error);
      return { error: error instanceof Error ? error.message : 'Create post test failed' };
    }
  }
  
  static async testPostService() {
    try {
      console.log('🧪 Testing PostService...');
      
      const testParams = {
        mediaTitle: 'Debug Test Book',
        mediaType: 'book' as const,
        mediaYear: '2024',
        mediaGenre: 'fiction',
        mediaCreator: 'Debug Author',
        content: 'This is a debug test post to verify the PostService functionality.',
        rating: 8,
        title: 'Debug Test Post'
      };
      
      console.log('Test parameters:', testParams);
      
      const result = await postService.createPost(testParams);
      
      console.log('PostService test result:', result);
      
      return result;
      
    } catch (error) {
      console.error('PostService test error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'PostService test failed' 
      };
    }
  }
  
  static async checkRowLevelSecurity() {
    try {
      console.log('🔐 Testing Row Level Security...');
      
      const { data: session } = await supabaseAuth.getSession();
      
      if (!session.session) {
        return { error: 'Not authenticated' };
      }
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Test with auth token
      const authResponse = await fetch(`${supabaseUrl}/rest/v1/posts?limit=1`, {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        }
      });
      
      // Test with anon key only
      const anonResponse = await fetch(`${supabaseUrl}/rest/v1/posts?limit=1`, {
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      return {
        authToken: {
          status: authResponse.status,
          accessible: authResponse.status === 200
        },
        anonKey: {
          status: anonResponse.status,
          accessible: anonResponse.status === 200
        }
      };
      
    } catch (error) {
      console.error('RLS test error:', error);
      return { error: error instanceof Error ? error.message : 'RLS test failed' };
    }
  }
}

// Make it globally available for debugging
(global as any).PostDebugger = PostDebugger; 