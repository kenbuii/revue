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
  content_type?: 'text' | 'image' | 'video';
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
  author?: string;
  director?: string;
  genre?: string;
  source: 'tmdb' | 'google_books' | 'popular';
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
  mediaCreator?: string; // author/director
  mediaCover?: string;
  
  // Post content
  title?: string;
  content: string;
  rating?: number;
  imageUrl?: string;
  tags?: string[];
  
  // Location context (for books/movies)
  location?: string; // page number, timestamp, etc.
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
      const mediaItem: Partial<MediaItem> = {
        id: params.mediaId || `${params.mediaType}_${Date.now()}`,
        title: params.mediaTitle,
        media_type: params.mediaType,
        year: params.mediaYear,
        image_url: params.mediaCover,
        description: '', // We don't have description from post flow
        author: params.mediaType === 'book' ? params.mediaCreator : undefined,
        director: params.mediaType !== 'book' ? params.mediaCreator : undefined,
        genre: params.mediaGenre,
        source: 'popular', // Default source for user-created media
        metadata: {
          created_via: 'post_flow',
          genre: params.mediaGenre,
          creator: params.mediaCreator,
        }
      };

      // Try to insert or update the media item
      await this.makeDirectRequest('media_items', 'POST', mediaItem);
      
      return mediaItem.id!;
    } catch (error) {
      console.warn('❌ Failed to create media item, using generated ID:', error);
      // If media item creation fails, return a generated ID
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
      const postData: Partial<PostData> = {
        user_id: userId,
        media_id: mediaId,
        title: params.title,
        content: params.content,
        rating: params.rating,
        content_type: params.imageUrl ? 'image' : 'text',
        tags: params.tags || [],
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

  // Get user's posts
  async getUserPosts(userId?: string, limit: number = 20): Promise<Post[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('No user ID provided and no session found');
        return [];
      }

      console.log('📖 Fetching user posts for:', targetUserId);

      // Get posts with user and media information
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles(display_name,username,avatar_url),media_items(*)&user_id=eq.${targetUserId}&order=created_at.desc&limit=${limit}`
      );

      // Transform to UI format
      const transformedPosts = posts.map((post: any) => this.transformToPost(post));
      
      console.log('✅ User posts fetched:', transformedPosts.length, 'items');
      return transformedPosts;
    } catch (error) {
      console.error('❌ Error fetching user posts:', error);
      return [];
    }
  }

  // Get posts for a specific media item
  async getMediaPosts(mediaId: string, limit: number = 10): Promise<Post[]> {
    try {
      console.log('📖 Fetching posts for media:', mediaId);

      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles(display_name,username,avatar_url),media_items(*)&media_id=eq.${mediaId}&is_public=eq.true&order=created_at.desc&limit=${limit}`
      );

      const transformedPosts = posts.map((post: any) => this.transformToPost(post));
      
      console.log('✅ Media posts fetched:', transformedPosts.length, 'items');
      return transformedPosts;
    } catch (error) {
      console.error('❌ Error fetching media posts:', error);
      return [];
    }
  }

  // Transform database post to UI Post interface
  private transformToPost(dbPost: any): Post {
    const userProfile = dbPost.user_profiles;
    const mediaItem = dbPost.media_items;
    
    return {
      id: dbPost.id,
      user: {
        name: userProfile?.display_name || userProfile?.username || 'Anonymous',
        avatar: userProfile?.avatar_url || 'https://via.placeholder.com/40'
      },
      media: {
        id: mediaItem?.id || dbPost.media_id,
        title: mediaItem?.title || 'Unknown Media',
        type: mediaItem?.media_type || 'media',
        cover: mediaItem?.image_url || 'https://via.placeholder.com/120x160'
      },
      date: dbPost.created_at,
      title: dbPost.title,
      contentType: dbPost.content_type === 'image' ? 'image' : 'text',
      content: dbPost.content,
      commentCount: dbPost.comment_count || 0,
      likeCount: dbPost.like_count || 0,
      isBookmarked: false, // This would be determined by bookmark context
      isLiked: false, // This would be determined by likes context
      rating: dbPost.rating,
    };
  }

  // Local storage for drafts
  async saveDraftPost(params: CreatePostParams): Promise<void> {
    try {
      const drafts = await this.getDraftPosts();
      const draftWithId = {
        ...params,
        id: `draft_${Date.now()}`,
        savedAt: new Date().toISOString(),
      };
      
      const updatedDrafts = [...drafts, draftWithId];
      await AsyncStorage.setItem(DRAFT_POSTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      console.log('✅ Draft post saved locally');
    } catch (error) {
      console.error('❌ Error saving draft post:', error);
    }
  }

  async getDraftPosts(): Promise<(CreatePostParams & { id: string; savedAt: string })[]> {
    try {
      const data = await AsyncStorage.getItem(DRAFT_POSTS_STORAGE_KEY);
      if (data) {
        const drafts = JSON.parse(data);
        console.log('✅ Draft posts loaded from local storage:', drafts.length, 'items');
        return drafts;
      }
      return [];
    } catch (error) {
      console.error('❌ Error loading draft posts:', error);
      return [];
    }
  }

  async deleteDraftPost(draftId: string): Promise<void> {
    try {
      const drafts = await this.getDraftPosts();
      const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
      await AsyncStorage.setItem(DRAFT_POSTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      console.log('✅ Draft post deleted');
    } catch (error) {
      console.error('❌ Error deleting draft post:', error);
    }
  }

  async clearDraftPosts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DRAFT_POSTS_STORAGE_KEY);
      console.log('✅ All draft posts cleared');
    } catch (error) {
      console.error('❌ Error clearing draft posts:', error);
    }
  }
}

export const postService = new PostService(); 