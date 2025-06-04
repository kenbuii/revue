import { supabaseAuth } from './supabase';

export interface PostLike {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  liked_at: string;
}

export interface LikeToggleResult {
  success: boolean;
  isLiked: boolean;
  likeCount: number;
  error?: string;
}

class LikesService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * Make authenticated RPC call to Supabase
   */
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

  /**
   * Get all users who liked a specific post
   */
  async getPostLikes(postId: string): Promise<PostLike[]> {
    try {
      console.log('👥 Fetching likes for post:', postId);
      
      const result = await this.callRPC('get_post_likes', { p_post_id: postId });
      
      if (!result || !Array.isArray(result)) {
        console.log('⚠️ No likes found or invalid response');
        return [];
      }

      console.log(`✅ Found ${result.length} likes`);
      return result.map((like: any) => ({
        user_id: like.user_id,
        username: like.username,
        display_name: like.display_name,
        avatar_url: like.avatar_url || 'https://via.placeholder.com/40',
        liked_at: like.liked_at,
      }));
    } catch (error) {
      console.error('❌ Error fetching post likes:', error);
      return [];
    }
  }

  /**
   * Toggle like on a post (like/unlike)
   */
  async togglePostLike(postId: string): Promise<LikeToggleResult> {
    try {
      console.log('❤️ Toggling like on post:', postId);

      const result = await this.callRPC('toggle_post_like', { p_post_id: postId });

      if (result.success) {
        console.log(`✅ Post like toggled - now ${result.isLiked ? 'liked' : 'unliked'}`);
        return {
          success: true,
          isLiked: result.isLiked,
          likeCount: result.likeCount,
        };
      } else {
        console.error('❌ Post like toggle failed:', result.error);
        return { 
          success: false, 
          isLiked: false, 
          likeCount: 0, 
          error: result.error || 'Unknown error' 
        };
      }
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
   * Check if current user has liked a specific post
   */
  async isPostLikedByUser(postId: string): Promise<boolean> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return false;
      }

      // Get all likes for the post and check if current user is in there
      const likes = await this.getPostLikes(postId);
      return likes.some(like => like.user_id === userId);
    } catch (error) {
      console.error('❌ Error checking if post is liked:', error);
      return false;
    }
  }

  /**
   * Get posts liked by a specific user (for profile display)
   */
  async getUserLikedPosts(userId?: string): Promise<any[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('No user ID provided for liked posts');
        return [];
      }

      console.log('📋 Fetching posts liked by user:', targetUserId);

      // This would require a custom function to join post_likes with posts
      // For now, we'll implement this in a future phase when needed
      console.log('⚠️ getUserLikedPosts not yet implemented - requires custom database function');
      return [];
    } catch (error) {
      console.error('❌ Error fetching user liked posts:', error);
      return [];
    }
  }

  /**
   * Get like count for a post (alternative to database trigger)
   */
  async getPostLikeCount(postId: string): Promise<number> {
    try {
      const likes = await this.getPostLikes(postId);
      return likes.length;
    } catch (error) {
      console.error('❌ Error getting post like count:', error);
      return 0;
    }
  }

  /**
   * Format like timestamp for display
   */
  formatLikeTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInHours < 24 * 7) {
        return `${Math.floor(diffInHours / 24)}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.warn('Error formatting like time:', error);
      return 'Unknown time';
    }
  }
}

export const likesService = new LikesService(); 