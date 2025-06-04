import { supabaseAuth } from './supabase';

export interface HiddenPost {
  post_id: string;
  reason: 'user_hidden' | 'reported' | 'blocked_user';
  hidden_at: string;
}

export interface HidePostResult {
  success: boolean;
  hidden_at?: string;
  error?: string;
}

export interface UnhidePostResult {
  success: boolean;
  was_hidden: boolean;
  error?: string;
}

class HiddenPostsService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  // Cache for user's hidden posts to avoid repeated API calls
  private hiddenPostsCache: Set<string> = new Set();
  private cacheLastUpdated: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
   * Hide a post for the current user
   */
  async hidePost(postId: string, reason: 'user_hidden' | 'reported' | 'blocked_user' = 'user_hidden'): Promise<HidePostResult> {
    try {
      console.log('🙈 Hiding post:', postId, 'with reason:', reason);

      const result = await this.callRPC('hide_post', { 
        p_post_id: postId, 
        p_reason: reason 
      });

      if (result.success) {
        console.log('✅ Post hidden successfully');
        
        // Update cache
        this.hiddenPostsCache.add(postId);
        
        return {
          success: true,
          hidden_at: result.hidden_at,
        };
      } else {
        console.error('❌ Post hiding failed:', result.error);
        return { 
          success: false, 
          error: result.error || 'Unknown error' 
        };
      }
    } catch (error) {
      console.error('❌ Error hiding post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Unhide a post for the current user
   */
  async unhidePost(postId: string): Promise<UnhidePostResult> {
    try {
      console.log('👁️ Unhiding post:', postId);

      const result = await this.callRPC('unhide_post', { p_post_id: postId });

      if (result.success) {
        console.log('✅ Post unhidden successfully');
        
        // Update cache
        this.hiddenPostsCache.delete(postId);
        
        return {
          success: true,
          was_hidden: result.was_hidden,
        };
      } else {
        console.error('❌ Post unhiding failed:', result.error);
        return { 
          success: false, 
          was_hidden: false,
          error: result.error || 'Unknown error' 
        };
      }
    } catch (error) {
      console.error('❌ Error unhiding post:', error);
      return { 
        success: false, 
        was_hidden: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all hidden posts for the current user
   */
  async getUserHiddenPosts(): Promise<HiddenPost[]> {
    try {
      console.log('📋 Fetching user hidden posts...');

      const result = await this.callRPC('get_user_hidden_posts');

      if (!result || !Array.isArray(result)) {
        console.log('⚠️ No hidden posts found or invalid response');
        return [];
      }

      console.log(`✅ Found ${result.length} hidden posts`);
      
      // Update cache
      this.hiddenPostsCache.clear();
      result.forEach((hiddenPost: any) => {
        this.hiddenPostsCache.add(hiddenPost.post_id);
      });
      this.cacheLastUpdated = Date.now();

      return result.map((hiddenPost: any) => ({
        post_id: hiddenPost.post_id,
        reason: hiddenPost.reason,
        hidden_at: hiddenPost.hidden_at,
      }));
    } catch (error) {
      console.error('❌ Error fetching hidden posts:', error);
      return [];
    }
  }

  /**
   * Check if a specific post is hidden by the current user
   */
  async isPostHidden(postId: string): Promise<boolean> {
    try {
      // Check cache first
      const now = Date.now();
      if (now - this.cacheLastUpdated < this.CACHE_DURATION && this.hiddenPostsCache.size > 0) {
        return this.hiddenPostsCache.has(postId);
      }

      // Refresh cache if expired
      await this.getUserHiddenPosts();
      return this.hiddenPostsCache.has(postId);
    } catch (error) {
      console.error('❌ Error checking if post is hidden:', error);
      return false;
    }
  }

  /**
   * Filter an array of posts to remove hidden ones
   */
  async filterHiddenPosts<T extends { id: string }>(posts: T[]): Promise<T[]> {
    try {
      if (posts.length === 0) {
        return posts;
      }

      // Ensure we have fresh hidden posts data
      const hiddenPosts = await this.getUserHiddenPosts();
      const hiddenPostIds = new Set(hiddenPosts.map(hp => hp.post_id));

      const filteredPosts = posts.filter(post => !hiddenPostIds.has(post.id));
      
      const removedCount = posts.length - filteredPosts.length;
      if (removedCount > 0) {
        console.log(`🙈 Filtered out ${removedCount} hidden posts`);
      }

      return filteredPosts;
    } catch (error) {
      console.error('❌ Error filtering hidden posts:', error);
      // Return original posts if filtering fails
      return posts;
    }
  }

  /**
   * Report a post and automatically hide it
   */
  async reportPost(postId: string, reportReason: string): Promise<HidePostResult> {
    try {
      console.log('🚨 Reporting post:', postId, 'for:', reportReason);

      // First report the post (this would require a report_post function in the database)
      // For now, we'll just hide it with 'reported' reason
      const result = await this.hidePost(postId, 'reported');

      if (result.success) {
        console.log('✅ Post reported and hidden successfully');
        
        // TODO: In a real app, you'd also want to log the report reason
        // and potentially notify administrators
      }

      return result;
    } catch (error) {
      console.error('❌ Error reporting post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Clear the hidden posts cache (useful for forced refreshes)
   */
  clearCache(): void {
    this.hiddenPostsCache.clear();
    this.cacheLastUpdated = 0;
    console.log('🗑️ Hidden posts cache cleared');
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { size: number; lastUpdated: number; isStale: boolean } {
    const now = Date.now();
    return {
      size: this.hiddenPostsCache.size,
      lastUpdated: this.cacheLastUpdated,
      isStale: now - this.cacheLastUpdated > this.CACHE_DURATION,
    };
  }
}

export const hiddenPostsService = new HiddenPostsService(); 