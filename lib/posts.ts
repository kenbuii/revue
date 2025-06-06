import { supabaseAuth } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for post data
export interface PostData {
  id?: string;
  user_id?: string;
  media_id?: string;
  title?: string;
  content: string;
  rating?: number;
  content_type?: 'review' | 'thought' | 'recommendation';
  tags?: string[];
  like_count?: number;
  comment_count?: number;
  bookmark_count?: number;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Post interface for UI
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
  rating?: number;
}

// Media item interface
export interface MediaItem {
  id: string;
  title: string;
  media_type: 'movie' | 'tv' | 'book';
  year?: string;
  image_url?: string;
  description?: string;
  creator?: string;
  genre?: string;
  source: 'tmdb' | 'google_books' | 'popular' | 'nyt_bestsellers';
  original_api_id?: string;
  metadata?: any;
}

// Post creation parameters
export interface CreatePostParams {
  // Media information
  mediaId?: string;
  mediaTitle: string;
  mediaType: 'movie' | 'tv' | 'book';
  mediaYear?: string;
  mediaGenre?: string;
  mediaCreator?: string;
  mediaCover?: string;
  
  // Post content
  title?: string;
  content: string;
  rating?: number;
  imageUrl?: string;
  tags?: string[];
  
  // Location context (for books/movies)
  location?: string;
}

const DRAFT_POSTS_STORAGE_KEY = '@revue_draft_posts';

class PostService {
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

  private async makeDirectRequest(endpoint: string, method: string = 'GET', body?: any) {
    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || this.supabaseAnonKey;

    const response = await fetch(`${this.supabaseUrl}/rest/v1/${endpoint}`, {
      method,
      headers: {
        'apikey': this.supabaseAnonKey!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Create or update media item in database
  private async ensureMediaItem(params: CreatePostParams): Promise<string> {
    try {
      // Use the new RPC function to ensure media item exists
      const result = await this.callRPC('ensure_media_item_exists', {
        p_media_id: params.mediaId || `${params.mediaType}_${Date.now()}`,
        p_title: params.mediaTitle,
        p_media_type: params.mediaType,
        p_author: params.mediaCreator,
        p_description: '', // Could be extended later
        p_cover_image_url: params.mediaCover,
        p_external_id: null,
        p_metadata: {}
      });

      console.log('✅ Media item ensured successfully:', result);
      return result; // The function returns the media_id
    } catch (error) {
      console.warn('❌ Failed to ensure media item exists, using generated ID:', error);
      // If RPC fails, return a generated ID
      return params.mediaId || `${params.mediaType}_${Date.now()}`;
    }
  }

  // Create a new post
  async createPost(params: CreatePostParams): Promise<{ success: boolean; post?: PostData; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('📝 Creating post with params:', params);

      // Ensure media item exists in database
      const mediaId = await this.ensureMediaItem(params);

      // Prepare post data
      const postData = {
        user_id: userId,
        media_item_id: mediaId,
        title: params.title,
        content: params.content,
        rating: params.rating ? Math.round(params.rating) : undefined,
        location_context: params.location,
        is_public: true,
      };

      // Create the post
      const [createdPost] = await this.makeDirectRequest('posts', 'POST', postData);
      
      console.log('✅ Post created successfully:', createdPost.id);
      
      return { 
        success: true, 
        post: createdPost 
      };
    } catch (error) {
      console.error('❌ Error creating post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get user's posts - HYBRID APPROACH: Use PostgREST for simple queries
  async getUserPosts(userId?: string, limit: number = 20): Promise<Post[]> {
    try {
      const targetUserId = userId || (await supabaseAuth.getSession()).data.session?.user?.id;
      
      if (!targetUserId) {
        return [];
      }

      console.log('📋 Fetching user posts using PostgREST...');
      
      // Use PostgREST for simple user posts query (now that FK constraint is fixed)
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles(*),media_items(*)&user_id=eq.${targetUserId}&limit=${limit}&order=created_at.desc`
      );
      
      return posts.map((post: any) => this.transformPostgRESTToUIPost(post));
    } catch (error) {
      console.error('❌ Error fetching user posts:', error);
      return [];
    }
  }

  // Get posts for a specific media item - HYBRID APPROACH: Use RPC for optimal performance
  async getMediaPosts(mediaId: string, limit: number = 10): Promise<Post[]> {
    try {
      console.log('🎬 Fetching media posts using RPC...');
      
      // Use RPC function for media posts
      const posts = await this.callRPC('get_media_posts', {
        p_media_id: mediaId,
        p_limit: limit,
        p_offset: 0
      });
      
      return posts.map((post: any) => this.transformRPCPostToUIPost(post));
    } catch (error) {
      console.error('❌ Error fetching media posts with RPC, trying fallback:', error);
      return this.getMediaPostsFallback(mediaId, limit);
    }
  }

  // Fallback for media posts using PostgREST
  private async getMediaPostsFallback(mediaId: string, limit: number): Promise<Post[]> {
    try {
      console.log('⚠️ Using PostgREST fallback for media posts...');
      
      // Use PostgREST with proper relationships (now that FK constraint exists)
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles(*),media_items(*)&media_item_id=eq.${mediaId}&is_public=eq.true&limit=${limit}&order=created_at.desc`
      );
      
      return posts.map((post: any) => this.transformPostgRESTToUIPost(post));
    } catch (error) {
      console.error('❌ Error fetching media posts with fallback:', error);
      return [];
    }
  }

  // Transform RPC post result to UI post format
  private transformRPCPostToUIPost(dbPost: any): Post {
    return {
      id: dbPost.id,
      user: {
        name: dbPost.display_name || dbPost.username || 'Unknown User',
        avatar: dbPost.avatar_url || '',
      },
      media: {
        id: '', // Not included in media posts RPC
        title: 'Media Post', // This is for media-specific posts
        type: 'unknown',
        cover: '',
      },
      date: dbPost.created_at,
      title: dbPost.title,
      contentType: 'text',
      content: dbPost.content,
      textContent: dbPost.content,
      commentCount: dbPost.comment_count || 0,
      likeCount: dbPost.like_count || 0,
      isBookmarked: false,
      isLiked: false,
      rating: dbPost.rating,
    };
  }

  // Transform PostgREST post result to UI post format
  private transformPostgRESTToUIPost(dbPost: any): Post {
    return {
      id: dbPost.id,
      user: {
        name: dbPost.user_profiles?.display_name || dbPost.user_profiles?.username || 'Unknown User',
        avatar: dbPost.user_profiles?.avatar_url || '',
      },
      media: {
        id: dbPost.media_item_id || '',
        title: dbPost.media_items?.title || 'Unknown Media',
        type: dbPost.media_items?.media_type || 'unknown',
        cover: dbPost.media_items?.cover_image_url || '',
      },
      date: dbPost.created_at,
      title: dbPost.title,
      contentType: 'text',
      content: dbPost.content,
      textContent: dbPost.content,
      commentCount: dbPost.comment_count || 0,
      likeCount: dbPost.like_count || 0,
      isBookmarked: false,
      isLiked: false,
      rating: dbPost.rating,
    };
  }

  // Save post as draft
  async saveDraftPost(params: CreatePostParams): Promise<void> {
    try {
      const drafts = await this.getDraftPosts();
      const newDraft = {
        id: `draft_${Date.now()}`,
        ...params,
        savedAt: new Date().toISOString(),
      };
      
      const updatedDrafts = [...drafts, newDraft];
      await AsyncStorage.setItem(DRAFT_POSTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      
      console.log('💾 Draft saved successfully');
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      throw error;
    }
  }

  // Get saved draft posts
  async getDraftPosts(): Promise<(CreatePostParams & { id: string; savedAt: string })[]> {
    try {
      const draftsString = await AsyncStorage.getItem(DRAFT_POSTS_STORAGE_KEY);
      return draftsString ? JSON.parse(draftsString) : [];
    } catch (error) {
      console.error('❌ Error loading drafts:', error);
      return [];
    }
  }

  // Delete a specific draft
  async deleteDraftPost(draftId: string): Promise<void> {
    try {
      const drafts = await this.getDraftPosts();
      const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
      await AsyncStorage.setItem(DRAFT_POSTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    } catch (error) {
      console.error('❌ Error deleting draft:', error);
      throw error;
    }
  }

  // Clear all drafts
  async clearDraftPosts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DRAFT_POSTS_STORAGE_KEY);
    } catch (error) {
      console.error('❌ Error clearing drafts:', error);
      throw error;
    }
  }
}

export const postService = new PostService(); 