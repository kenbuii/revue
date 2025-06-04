import { supabaseAuth } from './supabase';
import { likesService } from './likesService';

export interface LikedPost {
  id: string;
  title: string;
  cover: string;
  comment: string;
  media: {
    id: string;
    title: string;
    type: string;
    cover: string;
  };
  user: {
    name: string;
    avatar: string;
  };
  likedAt: string;
}

class LikedPostsService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * Make authenticated request to Supabase REST API
   */
  private async makeSupabaseRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || this.supabaseAnonKey;

    const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
    const requestOptions = {
      method: 'GET',
      headers: {
        'apikey': this.supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase request failed: ${response.status} - ${error}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Response text:', responseText);
      throw new Error(`Failed to parse response as JSON: ${responseText}`);
    }
  }

  /**
   * Fetch user's liked posts/revues
   * Updated to use the new likesService functionality
   */
  async getUserLikedPosts(userId?: string): Promise<LikedPost[]> {
    try {
      console.log('🔍 Fetching user liked posts...');

      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('No user ID provided and no session found');
        return [];
      }

      // Get posts with user likes using direct SQL query
      const likedPosts = await this.makeSupabaseRequest(
        `post_likes?select=*,posts!inner(id,title,content,media_id,user_id,created_at,user_profiles!inner(display_name,avatar_url),media_items!inner(title,media_type,image_url))&user_id=eq.${targetUserId}&order=created_at.desc`
      );

      if (!likedPosts || !Array.isArray(likedPosts)) {
        console.log('⚠️ No liked posts found');
        return [];
      }

      console.log(`✅ Found ${likedPosts.length} liked posts`);
      
      return likedPosts.map((like: any) => ({
        id: like.posts.id,
        title: like.posts.media_items.title,
        cover: like.posts.media_items.image_url || 'https://via.placeholder.com/120x160',
        comment: like.posts.content,
        media: {
          id: like.posts.media_id,
          title: like.posts.media_items.title,
          type: like.posts.media_items.media_type,
          cover: like.posts.media_items.image_url || 'https://via.placeholder.com/120x160',
        },
        user: {
          name: like.posts.user_profiles.display_name,
          avatar: like.posts.user_profiles.avatar_url || 'https://via.placeholder.com/40',
        },
        likedAt: like.created_at,
      }));

    } catch (error) {
      console.error('❌ Error fetching liked posts:', error);
      // Fallback to empty array for now
      console.log('⚠️ Returning empty array due to error');
      return [];
    }
  }

  /**
   * Add a like to a post - now uses the real likesService
   */
  async likePost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('❤️ Liking post:', postId);
      
      const result = await likesService.togglePostLike(postId);
      
      if (result.success && result.isLiked) {
        console.log('✅ Post liked successfully');
        return { success: true };
      } else if (result.success && !result.isLiked) {
        console.log('⚠️ Post was unliked instead of liked');
        return { success: false, error: 'Post was already liked' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error liking post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Remove a like from a post - now uses the real likesService
   */
  async unlikePost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💔 Unliking post:', postId);
      
      const result = await likesService.togglePostLike(postId);
      
      if (result.success && !result.isLiked) {
        console.log('✅ Post unliked successfully');
        return { success: true };
      } else if (result.success && result.isLiked) {
        console.log('⚠️ Post was liked instead of unliked');
        return { success: false, error: 'Post was not previously liked' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error unliking post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Toggle like status on a post (recommended approach)
   */
  async togglePostLike(postId: string): Promise<{ success: boolean; isLiked: boolean; likeCount: number; error?: string }> {
    try {
      const result = await likesService.togglePostLike(postId);
      console.log(`✅ Post like toggled - now ${result.isLiked ? 'liked' : 'unliked'}`);
      return result;
    } catch (error) {
      console.error('❌ Error toggling post like:', error);
      return { 
        success: false, 
        isLiked: false,
        likeCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if current user has liked a post
   */
  async isPostLiked(postId: string): Promise<boolean> {
    try {
      return await likesService.isPostLikedByUser(postId);
    } catch (error) {
      console.error('❌ Error checking if post is liked:', error);
      return false;
    }
  }
}

export const likedPostsService = new LikedPostsService(); 