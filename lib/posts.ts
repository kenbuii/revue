import { supabaseAuth, supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for post data - Updated to match actual database schema
export interface PostData {
  id?: string;
  user_id?: string;
  content: string;
  media_item_id?: string;
  rating?: number;
  like_count?: number;
  comment_count?: number;
  contains_spoilers?: boolean;
  visibility?: string;
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
      // Generate a media ID if not provided
      const mediaId = params.mediaId || `${params.mediaType}_${params.mediaTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`;
      
      // Create media item with correct column names and required fields
      const { data: mediaItem, error: mediaError } = await supabase
        .from('media_items')
        .insert({
          id: mediaId,
          title: params.mediaTitle,
          media_type: params.mediaType,
          year: params.mediaYear || null,
          cover_image_url: params.mediaCover || null,
          description: '',
          author: params.mediaCreator || null,
          isbn: '',
          average_rating: 0,
          total_ratings: 0,
          popularity_score: 0,
          external_id: '',
          metadata: {
            genre: params.mediaGenre || null,
            source: 'popular'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (mediaError) {
        console.warn('❌ Failed to create media item:', mediaError);
        return mediaId;
      }

      console.log('✅ Media item created successfully:', mediaItem);
      return mediaItem.id;
    } catch (error) {
      console.warn('❌ Failed to create media item:', error);
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
      let mediaId: string | undefined = undefined;
      if (params.mediaTitle && params.mediaType) {
        try {
          mediaId = await this.ensureMediaItem(params);
          console.log('✅ Media item ensured with ID:', mediaId);
        } catch (error) {
          console.warn('⚠️ Media item creation failed:', error);
          return { success: false, error: 'Failed to create media item' };
        }
      }

      // Create the post with direct table insertion for better error handling
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content: params.content,
          media_item_id: mediaId || null,
          rating: params.rating ? Math.round(params.rating) : null,
          contains_spoilers: false,
          visibility: 'public',
          like_count: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (postError) {
        console.error('❌ Post creation failed:', postError);
        return { 
          success: false, 
          error: postError.message || 'Failed to create post'
        };
      }

      console.log('✅ Post created successfully:', post);
      return { 
        success: true, 
        post: {
          id: post.id,
          user_id: userId,
          content: params.content,
          media_item_id: mediaId,
          rating: params.rating ? Math.round(params.rating) : undefined,
          contains_spoilers: false,
          visibility: 'public',
          created_at: post.created_at,
          updated_at: post.updated_at,
          like_count: 0,
          comment_count: 0
        }
      };
    } catch (error) {
      console.error('❌ Error creating post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Create a new post - FIXED VERSION (bypasses cache issues)
  async createPostFixed(params: CreatePostParams): Promise<{ success: boolean; post?: PostData; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('🔧 FIXED: Creating post with params:', params);

      // FIXED: Use only the working upsert_media_item function
      let mediaId: string | undefined = undefined;
      
      if (params.mediaTitle && params.mediaType) {
        try {
          console.log('🎬 Creating media item using working upsert function...');
          
          // Create a proper media ID based on the media info
          const generatedMediaId = params.mediaId || `${params.mediaType}_${params.mediaTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`;
          
          // Use ONLY the working upsert_media_item function
          const mediaResult = await this.callRPC('upsert_media_item', {
            p_media_id: generatedMediaId,
            p_title: params.mediaTitle,
            p_media_type: params.mediaType,
            p_year: params.mediaYear || null,
            p_image_url: params.mediaCover || null,
            p_description: null,
            p_creator: params.mediaCreator || null,
            p_genre: params.mediaGenre || null,
            p_source: 'popular',
            p_original_api_id: null,
          });
          
          mediaId = mediaResult; // This should be the media ID
          console.log('✅ Media item created via upsert:', mediaId);
          
        } catch (error) {
          console.warn('⚠️ Media item creation failed, proceeding without media:', error);
          // Continue without media - this is allowed
        }
      }

      // Create the post with the media_item_id
      console.log('🔧 FIXED: Calling create_post RPC function with media_item_id:', mediaId);
      
      const result = await this.callRPC('create_post', {
        p_user_id: userId,
        p_content: params.content,
        p_media_item_id: mediaId || null,
        p_rating: params.rating ? Math.round(params.rating) : null,
        p_contains_spoilers: false,
        p_visibility: 'public'
      });

      console.log('🔧 FIXED: RPC result:', result);

      if (result.success) {
        console.log('✅ FIXED: Post created successfully with media_item_id:', mediaId);
        
        return { 
          success: true, 
          post: {
            id: result.post_id,
            user_id: userId,
            content: params.content,
            media_item_id: mediaId,
            rating: params.rating ? Math.round(params.rating) : undefined,
            contains_spoilers: false,
            visibility: 'public',
            created_at: new Date().toISOString()
          }
        };
      } else {
        console.error('❌ FIXED: RPC create_post failed:', result.error);
        return { 
          success: false, 
          error: result.error || 'Failed to create post'
        };
      }
    } catch (error) {
      console.error('❌ FIXED: Error creating post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get user's posts
  async getUserPosts(userId?: string, limit: number = 20): Promise<Post[]> {
    try {
      const targetUserId = userId || (await supabaseAuth.getSession()).data.session?.user?.id;
      
      if (!targetUserId) {
        return [];
      }

      const posts = await this.makeDirectRequest(`posts?user_id=eq.${targetUserId}&limit=${limit}&order=created_at.desc`);
      
      return posts.map((post: any) => this.transformToPost(post));
    } catch (error) {
      console.error('❌ Error fetching user posts:', error);
      return [];
    }
  }

  // Get posts for a specific media item
  async getMediaPosts(mediaId: string, limit: number = 10): Promise<Post[]> {
    try {
      const posts = await this.makeDirectRequest(`posts?media_item_id=eq.${mediaId}&visibility=eq.public&limit=${limit}&order=created_at.desc`);
      
      return posts.map((post: any) => this.transformToPost(post));
    } catch (error) {
      console.error('❌ Error fetching media posts:', error);
      return [];
    }
  }

  // Transform database post to UI post
  private transformToPost(dbPost: any): Post {
    return {
      id: dbPost.id,
      user: {
        name: dbPost.user_profiles?.display_name || dbPost.user_profiles?.username || 'Unknown User',
        avatar: dbPost.user_profiles?.avatar_url || '',
      },
      media: {
        id: dbPost.media_item_id,
        title: dbPost.media_items?.title || 'Unknown Media',
        type: dbPost.media_items?.media_type || 'unknown',
        cover: dbPost.media_items?.image_url || '',
      },
      date: dbPost.created_at,
      title: dbPost.title,
      contentType: 'text', // Default to text since content_type column doesn't exist
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