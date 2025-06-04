import { supabaseAuth } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for bookmark data
export interface Bookmark {
  id: string;
  post_id: string;
  media_id?: string;
  media_title: string;
  media_type?: string;
  media_cover?: string;
  post_title?: string;
  post_content?: string;
  post_author_name: string;
  post_author_avatar?: string;
  post_date?: string;
  bookmarked_at: string;
}

// Post interface matching the existing BookmarksContext
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

const BOOKMARKS_STORAGE_KEY = '@revue_bookmarks';

class BookmarkService {
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

  // Convert Supabase bookmark to Post format
  private bookmarkToPost(bookmark: Bookmark): Post {
    return {
      id: bookmark.post_id,
      user: {
        name: bookmark.post_author_name || 'Unknown User',
        avatar: bookmark.post_author_avatar || 'https://via.placeholder.com/40'
      },
      media: {
        id: bookmark.media_id || bookmark.post_id,
        title: bookmark.media_title,
        type: bookmark.media_type || 'media',
        cover: bookmark.media_cover || 'https://via.placeholder.com/120x160'
      },
      date: bookmark.post_date || bookmark.bookmarked_at,
      title: bookmark.post_title,
      contentType: 'text' as const,
      content: bookmark.post_content || '',
      commentCount: 0,
      likeCount: 0,
      isBookmarked: true,
      isLiked: false,
    };
  }

  // Convert Post to bookmark data for Supabase
  private postToBookmarkData(post: Post) {
    // Helper function to safely convert date
    const safeDate = (dateString: string): string | null => {
      if (!dateString) return null;
      
      try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn('Invalid date string:', dateString);
          return new Date().toISOString(); // Use current date as fallback
        }
        return date.toISOString();
      } catch (error) {
        console.warn('Error parsing date:', dateString, error);
        return new Date().toISOString(); // Use current date as fallback
      }
    };

    return {
      p_post_id: post.id,
      p_media_id: post.media.id,
      p_media_title: post.media.title,
      p_media_type: post.media.type,
      p_media_cover: post.media.cover,
      p_post_title: post.title,
      p_post_content: post.content,
      p_post_author_name: post.user.name,
      p_post_author_avatar: post.user.avatar,
      p_post_date: safeDate(post.date),
    };
  }

  // Get user's bookmarks from Supabase
  async getUserBookmarks(userId?: string): Promise<Post[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('No user ID provided and no session found');
        return [];
      }

      console.log('Fetching user bookmarks...');

      const bookmarks = await this.callRPC('get_user_bookmarks', {
        target_user_id: targetUserId
      });

      const posts = bookmarks.map((bookmark: Bookmark) => this.bookmarkToPost(bookmark));
      
      console.log('User bookmarks fetched successfully');
      return posts;
    } catch (error) {
      console.error('Error fetching user bookmarks:', error);
      throw error;
    }
  }

  // Add bookmark to Supabase
  async addBookmark(post: Post): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Adding bookmark...');

      const bookmarkData = this.postToBookmarkData(post);
      
      await this.callRPC('add_bookmark', {
        target_user_id: userId,
        ...bookmarkData
      });

      console.log('Bookmark added successfully');
      return { success: true };
    } catch (error) {
      console.error('Error adding bookmark:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Remove bookmark from Supabase
  async removeBookmark(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Removing bookmark...');

      await this.callRPC('remove_bookmark', {
        target_user_id: userId,
        p_post_id: postId
      });

      console.log('Bookmark removed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Local storage methods for offline support
  async saveBookmarksLocally(posts: Post[]): Promise<void> {
    try {
      await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(posts));
      console.log('Bookmarks saved locally');
    } catch (error) {
      console.error('Error saving bookmarks locally:', error);
    }
  }

  async getBookmarksLocally(): Promise<Post[]> {
    try {
      const data = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (data) {
        const posts = JSON.parse(data);
        console.log('Bookmarks loaded from local storage');
        return posts;
      }
      return [];
    } catch (error) {
      console.error('Error loading bookmarks from local storage:', error);
      return [];
    }
  }

  async clearLocalBookmarks(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BOOKMARKS_STORAGE_KEY);
      console.log('Local bookmarks cleared');
    } catch (error) {
      console.error('Error clearing local bookmarks:', error);
    }
  }

  // Sync local bookmarks to Supabase (useful after login)
  async syncLocalBookmarksToSupabase(): Promise<{ success: boolean; error?: string }> {
    try {
      const localBookmarks = await this.getBookmarksLocally();
      if (localBookmarks.length === 0) {
        console.log('No local bookmarks to sync');
        return { success: true };
      }

      console.log('Syncing local bookmarks to Supabase...');

      let successCount = 0;
      let errorCount = 0;

      for (const post of localBookmarks) {
        const result = await this.addBookmark(post);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.warn('Failed to sync bookmark:', result.error);
        }
      }

      console.log('Bookmark sync complete');
      
      if (successCount > 0) {
        // Clear local storage after successful sync
        await this.clearLocalBookmarks();
      }

      return { success: true };
    } catch (error) {
      console.error('Error syncing bookmarks:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const bookmarkService = new BookmarkService(); 