import { supabaseAuth } from './supabase';

// Simple test function to verify RPC calls work in app environment
export async function testFeedServiceInApp() {
  console.log('🧪 Testing RPC calls in app environment...');
  
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  try {
    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || supabaseAnonKey;

    console.log('🔑 Auth status:', session.data.session ? 'Authenticated' : 'Anonymous');

    // Test RPC call
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_for_you_feed`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_limit: 3, p_offset: 0 }),
    });

    console.log('📡 RPC Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ RPC call failed:', error);
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }

    const posts = await response.json();
    console.log('✅ RPC call success! Posts found:', posts.length);
    
    return { success: true, posts: posts.length };
  } catch (error) {
    console.error('❌ RPC test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 