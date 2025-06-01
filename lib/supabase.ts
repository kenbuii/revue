import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthClient } from '@supabase/auth-js';

// Replace these with your Supabase project URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create auth-only client (no WebSocket dependencies)
export const supabaseAuth = new AuthClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
});

// Custom storage functions using direct HTTP requests
export const supabaseStorage = {
  async upload(bucket: string, fileName: string, file: Blob, options?: { contentType?: string }) {
    const token = (await supabaseAuth.getSession()).data.session?.access_token || supabaseAnonKey;
    
    const formData = new FormData();
    formData.append('file', file as any, fileName);

    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return { data, error: null };
  },

  getPublicUrl(bucket: string, fileName: string) {
    return {
      data: {
        publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`
      }
    };
  }
};

// Export auth client as 'supabase' for backward compatibility
export const supabase = { 
  auth: supabaseAuth,
  storage: {
    from: (bucket: string) => ({
      upload: (fileName: string, file: Blob, options?: { contentType?: string; upsert?: boolean }) => 
        supabaseStorage.upload(bucket, fileName, file, options),
      getPublicUrl: (fileName: string) => supabaseStorage.getPublicUrl(bucket, fileName)
    })
  }
}; 