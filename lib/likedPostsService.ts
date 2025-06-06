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
   * HYBRID APPROACH: Use RPC function for optimal performance
   */
  async getUserLikedPosts(userId?: string): Promise<LikedPost[]> {
    try {
      console.log('🔍 Fetching user liked posts using RPC...');

      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('No user ID provided and no session found');
        return [];
      }

      // Use the new RPC function for liked posts
      const likedPosts = await this.makeSupabaseRequest(
        `rpc/get_user_liked_posts?p_user_id=${targetUserId}&p_limit=20&p_offset=0`
      );

      if (!likedPosts || !Array.isArray(likedPosts)) {
        console.log('⚠️ No liked posts found');
        return [];
      }

      console.log(`✅ Found ${likedPosts.length} liked posts`);
      
      // Transform using the new RPC result structure
      return likedPosts.map((post: any) => ({
        id: post.post_id,
        title: post.media_title || 'Unknown Media',
        cover: post.media_cover_url || 'https://via.placeholder.com/120x160',
        comment: post.content,
        media: {
          id: post.media_item_id || '',
          title: post.media_title || 'Unknown Media',
          type: post.media_type || 'unknown',
          cover: post.media_cover_url || 'https://via.placeholder.com/120x160',
        },
        user: {
          name: post.author_display_name || post.author_username || 'Unknown User',
          avatar: post.author_avatar_url || 'https://via.placeholder.com/40',
        },
        likedAt: post.liked_at,
      }));

    } catch (error) {
      console.error('❌ Error fetching liked posts with RPC, trying fallback:', error);
      // Fallback to PostgREST approach if RPC fails
      return this.getUserLikedPostsFallback(userId);
    }
  }

  /**
   * Fallback method using PostgREST (now that FK constraint is fixed)
   */
  private async getUserLikedPostsFallback(userId?: string): Promise<LikedPost[]> {
    try {
      console.log('⚠️ Using PostgREST fallback for liked posts...');

      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        return [];
      }

      // Use PostgREST with proper relationships (now that FK constraint exists)
      const likedPosts = await this.makeSupabaseRequest(
        `post_likes?select=*,posts!inner(id,title,content,media_item_id,user_id,created_at,user_profiles(*),media_items(*))&user_id=eq.${targetUserId}&order=created_at.desc`
      );

      if (!likedPosts || !Array.isArray(likedPosts)) {
        console.log('⚠️ No liked posts found in fallback');
        return [];
      }

      console.log(`✅ Found ${likedPosts.length} liked posts using fallback`);
      
      return likedPosts.map((like: any) => ({
        id: like.posts.id,
        title: like.posts.media_items?.title || 'Unknown Media',
        cover: like.posts.media_items?.cover_image_url || 'https://via.placeholder.com/120x160',
        comment: like.posts.content,
        media: {
          id: like.posts.media_item_id || '',
          title: like.posts.media_items?.title || 'Unknown Media',
          type: like.posts.media_items?.media_type || 'unknown',
          cover: like.posts.media_items?.cover_image_url || 'https://via.placeholder.com/120x160',
        },
        user: {
          name: like.posts.user_profiles?.display_name || like.posts.user_profiles?.username || 'Unknown User',
          avatar: like.posts.user_profiles?.avatar_url || 'https://via.placeholder.com/40',
        },
        likedAt: like.created_at,
      }));

    } catch (error) {
      console.error('❌ Error with PostgREST fallback for liked posts:', error);
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