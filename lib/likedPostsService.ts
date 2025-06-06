import { supabaseAuth } from './supabase';
import { likesService } from './likesService';
import { feedService } from './feedService';

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
  private supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Make direct HTTP request to Supabase REST API
  private async makeSupabaseRequest(endpoint: string): Promise<any> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    try {
      const session = await supabaseAuth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${this.supabaseUrl}/rest/v1/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || this.supabaseKey}`,
          'apikey': this.supabaseKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Supabase request error:', error);
      throw error;
    }
  }

  /**
   * Phase 6: Enhanced method using feedService integration
   * Fetch user's liked posts/revues with proper feed integration
   */
  async getUserLikedPosts(userId?: string): Promise<LikedPost[]> {
    try {
      console.log('🔍 Fetching user liked posts via Phase 6 integration...');

      // Phase 6: Use the new feedService method for consistency
      const feedPosts = await feedService.getUserLikedPosts(userId);
      
      if (!feedPosts || feedPosts.length === 0) {
        console.log('⚠️ No liked posts found');
        return [];
      }

      console.log(`✅ Found ${feedPosts.length} liked posts via feedService`);
      
      // Transform FeedPost to LikedPost format
      return feedPosts.map((post) => ({
        id: post.id,
        title: post.media.title,
        cover: post.media.cover,
        comment: post.content,
        media: {
          id: post.media.id,
          title: post.media.title,
          type: post.media.type,
          cover: post.media.cover,
        },
        user: {
          name: post.user.name,
          avatar: post.user.avatar,
        },
        likedAt: new Date().toISOString(), // feedService doesn't return like timestamp yet
      }));

    } catch (error) {
      console.error('❌ Error fetching liked posts via feedService:', error);
      
      // Phase 6: Fallback to direct database query if feedService fails
      console.log('🔄 Falling back to direct database query...');
      return await this.getUserLikedPostsDirect(userId);
    }
  }

  /**
   * Direct database query fallback method
   */
  private async getUserLikedPostsDirect(userId?: string): Promise<LikedPost[]> {
    try {
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
        console.log('⚠️ No liked posts found in direct query');
        return [];
      }

      console.log(`✅ Found ${likedPosts.length} liked posts via direct query`);
      
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
      console.error('❌ Error in direct liked posts query:', error);
      // Return empty array for now
      console.log('⚠️ Returning empty array due to error');
      return [];
    }
  }

  /**
   * Phase 6: Get liked post count for user
   */
  async getUserLikedPostCount(userId?: string): Promise<number> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        return 0;
      }

      const likedPosts = await this.makeSupabaseRequest(
        `post_likes?select=id&user_id=eq.${targetUserId}`
      );

      return likedPosts?.length || 0;
    } catch (error) {
      console.error('❌ Error fetching liked posts count:', error);
      return 0;
    }
  }

  /**
   * Check if current user has liked a specific post
   */
  async isPostLikedByUser(postId: string, userId?: string): Promise<boolean> {
    try {
      // Phase 6: Use the likesService for consistency
      // Note: likesService.isPostLikedByUser only works for current user
      if (userId) {
        // For other users, we'd need a different approach
        console.warn('⚠️ Checking like status for other users not yet supported');
        return false;
      }
      return await likesService.isPostLikedByUser(postId);
    } catch (error) {
      console.error('❌ Error checking if post is liked:', error);
      return false;
    }
  }

  /**
   * Toggle like on a post
   */
  async togglePostLike(postId: string): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
    try {
      // Phase 6: Use the likesService for consistency
      return await likesService.togglePostLike(postId);
    } catch (error) {
      console.error('❌ Error toggling post like:', error);
      return { success: false, isLiked: false, error: 'Failed to toggle like' };
    }
  }

  /**
   * Phase 6: Enhanced method to get recent liked posts for profile display
   */
  async getRecentLikedPosts(userId?: string, limit: number = 6): Promise<LikedPost[]> {
    try {
      const allLikedPosts = await this.getUserLikedPosts(userId);
      return allLikedPosts.slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching recent liked posts:', error);
      return [];
    }
  }
}

export const likedPostsService = new LikedPostsService(); 