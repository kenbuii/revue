import { supabaseAuth } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Post interface (same as bookmarks)
export interface Post {
  id: string;
  user: { name: string; avatar: string };
  media: { id: string; title: string; type: string; progress?: string; cover: string };
  date: string;
  title?: string;
  contentType: 'image' | 'text' | 'mixed';
  content: string;
  textContent?: string;
  commentCount: number;
  likeCount: number;
  isBookmarked?: boolean;
  isLiked?: boolean;
}

const FAVORITES_STORAGE_KEY = '@revue_favorites';

class FavoriteService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  private async callRPC(functionName: string, params: any = {}) {
    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || this.supabaseAnonKey;

    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'apikey': this.supabaseAnonKey!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RPC call failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Local storage methods for offline support
  async saveFavoritesLocally(posts: Post[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(posts));
      console.log('✅ Favorites saved locally');
    } catch (error) {
      console.error('❌ Error saving favorites locally:', error);
    }
  }

  async getFavoritesLocally(): Promise<Post[]> {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (data) {
        const posts = JSON.parse(data);
        console.log('✅ Favorites loaded from local storage:', posts.length, 'items');
        return posts;
      }
      return [];
    } catch (error) {
      console.error('❌ Error loading favorites from local storage:', error);
      return [];
    }
  }

  async clearLocalFavorites(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
      console.log('✅ Local favorites cleared');
    } catch (error) {
      console.error('❌ Error clearing local favorites:', error);
    }
  }

  // For now, we'll use local storage only since we don't have a favorites table yet
  // TODO: Add Supabase support when favorites table is created
  async getUserFavorites(): Promise<Post[]> {
    return await this.getFavoritesLocally();
  }

  async addFavorite(post: Post): Promise<{ success: boolean; error?: string }> {
    try {
      const currentFavorites = await this.getFavoritesLocally();
      
      // Check if already favorited
      if (currentFavorites.some(p => p.id === post.id)) {
        return { success: true }; // Already favorited
      }

      const updatedFavorites = [...currentFavorites, { ...post, isLiked: true }];
      await this.saveFavoritesLocally(updatedFavorites);
      
      console.log('✅ Favorite added locally');
      return { success: true };
    } catch (error) {
      console.error('❌ Error adding favorite:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async removeFavorite(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const currentFavorites = await this.getFavoritesLocally();
      const updatedFavorites = currentFavorites.filter(post => post.id !== postId);
      await this.saveFavoritesLocally(updatedFavorites);
      
      console.log('✅ Favorite removed locally');
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing favorite:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const favoriteService = new FavoriteService(); 