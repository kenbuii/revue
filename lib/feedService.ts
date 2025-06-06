import { supabaseAuth } from './supabase';
import { Post } from './posts';
import { hiddenPostsService } from './hiddenPostsService';

export interface FeedPost extends Post {
  // Additional feed-specific properties if needed
}

class FeedService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Make RPC calls to Supabase functions
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

  // Make direct REST API requests to Supabase
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

  // Updated: Use RPC function instead of complex REST joins
  async getForYouFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      console.log('📰 Fetching enhanced For You feed...', { limit, offset });
      
      // Use the working RPC function instead of REST API joins
      const posts = await this.callRPC('get_for_you_feed', {
        p_limit: limit,
        p_offset: offset
      });

      console.log(`✅ Found ${posts?.length || 0} posts for For You feed`);
      
      // Transform RPC results to FeedPost format
      const transformedPosts = await Promise.all(
        (posts || []).map(async (post: any) => await this.transformRpcPostToFeedPost(post))
      );
      
      // Filter out hidden posts for current user
      const visiblePosts = await hiddenPostsService.filterHiddenPosts(transformedPosts);
      
      console.log(`📰 Returning ${visiblePosts.length} posts after filtering hidden posts`);
      return visiblePosts;
    } catch (error) {
      console.error('❌ Error fetching For You feed:', error);
      return [];
    }
  }

  // Updated: Use RPC function for friends feed (same as For You for now)
  async getFriendsFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        console.log('⚠️ No user session for friends feed');
        return [];
      }

      console.log('👥 Fetching Friends + Following feed...');
      
      // Use the same RPC function for now since we don't have user connections yet
      const posts = await this.callRPC('get_for_you_feed', {
        p_limit: limit,
        p_offset: offset
      });

      console.log(`✅ Found ${posts?.length || 0} posts for Friends feed`);
      
      // Transform and filter posts
      const transformedPosts = await Promise.all(
        (posts || []).map(async (post: any) => await this.transformRpcPostToFeedPost(post))
      );
      
      const visiblePosts = await hiddenPostsService.filterHiddenPosts(transformedPosts);
      return visiblePosts;
    } catch (error) {
      console.error('❌ Error fetching Friends feed:', error);
      return [];
    }
  }

  // Updated: Use RPC function for user posts
  async getUserPosts(userId?: string, limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;
      const currentUserId = session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('⚠️ No user ID provided for user posts');
        return [];
      }

      console.log(`📋 Fetching posts for user: ${targetUserId}`);
      
      // Use the working RPC function
      const posts = await this.callRPC('get_user_posts', {
        p_user_id: targetUserId,
        p_limit: limit,
        p_offset: offset
      });

      console.log(`✅ Found ${posts?.length || 0} posts for user ${targetUserId}`);
      
      // Transform posts with interaction data
      const transformedPosts = await Promise.all(
        (posts || []).map(async (post: any) => await this.transformRpcPostToFeedPost(post))
      );
      
      // Only filter hidden posts if viewing own profile
      if (targetUserId === currentUserId) {
        return await hiddenPostsService.filterHiddenPosts(transformedPosts);
      }
      
      return transformedPosts;
    } catch (error) {
      console.error(`❌ Error fetching user posts:`, error);
      return [];
    }
  }

  // Updated: Transform RPC results to FeedPost format
  private async transformRpcPostToFeedPost(rpcPost: any): Promise<FeedPost> {
    const session = await supabaseAuth.getSession();
    const currentUserId = session.data.session?.user?.id;

    // Format the date nicely
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
          return 'Just now';
        } else if (diffInHours < 24) {
          return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 24 * 7) {
          return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
          return date.toLocaleDateString();
        }
      } catch (error) {
        console.warn('Error formatting date:', error);
        return 'Unknown date';
      }
    };

    // FIXED: RPC functions return flat data, not nested objects
    console.log('🔧 Transforming RPC post data:', {
      id: rpcPost.id,
      username: rpcPost.username,
      media_item_id: rpcPost.media_item_id,
      rating: rpcPost.rating
    });

    // Get media item details if we have a media_item_id
    let mediaItem: any = {
      title: 'Unknown Media',
      media_type: 'unknown',
      image_url: 'https://via.placeholder.com/120x160'
    };

    if (rpcPost.media_item_id) {
      try {
        const mediaItems = await this.makeDirectRequest(
          `media_items?id=eq.${rpcPost.media_item_id}&select=title,media_type,image_url,year,description`
        );
        if (mediaItems && mediaItems.length > 0) {
          mediaItem = mediaItems[0];
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch media item:', error);
      }
    }

    // Check if current user has liked this post
    let isLiked = false;
    if (currentUserId && rpcPost.id) {
      try {
        const likeCheck = await this.makeDirectRequest(
          `post_likes?select=id&post_id=eq.${rpcPost.id}&user_id=eq.${currentUserId}&limit=1`
        );
        isLiked = (likeCheck && likeCheck.length > 0);
      } catch (error) {
        console.warn('Error checking like status:', error);
      }
    }

    // Bookmark status (placeholder for now)
    const isBookmarked = false;

    // Create post title from content if not provided
    const postTitle = rpcPost.title || (rpcPost.content ? 
      `${rpcPost.content.substring(0, 50)}${rpcPost.content.length > 50 ? '...' : ''}` : 
      undefined
    );

    const transformedPost = {
      id: rpcPost.id || 'unknown-id',
      user: {
        name: rpcPost.display_name || rpcPost.username || 'Anonymous User',
        avatar: rpcPost.avatar_url || 'https://via.placeholder.com/40',
      },
      media: {
        id: rpcPost.media_item_id || 'unknown-media',
        title: mediaItem.title || 'Unknown Media',
        type: mediaItem.media_type || 'unknown',
        cover: mediaItem.image_url || 'https://via.placeholder.com/120x160',
        progress: undefined, // Could add location context later
      },
      date: formatDate(rpcPost.created_at || new Date().toISOString()),
      title: postTitle,
      contentType: 'text' as const, // For now, all posts are text-based
      content: rpcPost.content || '',
      textContent: rpcPost.content || '',
      // Use real comment and like counts from RPC function
      commentCount: rpcPost.comment_count || 0,
      likeCount: rpcPost.like_count || 0,
      isBookmarked,
      isLiked,
      rating: rpcPost.rating || undefined,
    };

    console.log('✅ Transformed post:', {
      id: transformedPost.id,
      userName: transformedPost.user.name,
      mediaTitle: transformedPost.media.title,
      rating: transformedPost.rating,
      likeCount: transformedPost.likeCount
    });

    return transformedPost;
  }

  // Updated: Use RPC function for liked posts
  async getUserLikedPosts(userId?: string, limit: number = 20): Promise<FeedPost[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('⚠️ No user ID provided for liked posts');
        return [];
      }

      console.log(`💝 Fetching liked posts for user: ${targetUserId}`);
      
      // Use the working RPC function
      const likedPosts = await this.callRPC('get_user_liked_posts', {
        p_user_id: targetUserId,
        p_limit: limit
      });

      console.log(`✅ Found ${likedPosts?.length || 0} liked posts`);
      
      // Transform the RPC results
      const transformedPosts = await Promise.all(
        (likedPosts || []).map(async (post: any) => await this.transformRpcPostToFeedPost(post))
      );
      
      return transformedPosts;
    } catch (error) {
      console.error('❌ Error fetching liked posts:', error);
      return [];
    }
  }

  // Enhanced refresh with better error handling
  async refreshFeed(feedType: 'forYou' | 'friends'): Promise<FeedPost[]> {
    try {
      console.log(`🔄 Refreshing ${feedType} feed...`);
      
      if (feedType === 'forYou') {
        return await this.getForYouFeed();
      } else {
        return await this.getFriendsFeed();
      }
    } catch (error) {
      console.error(`❌ Error refreshing ${feedType} feed:`, error);
      throw error;
    }
  }

  // Enhanced load more with better pagination
  async loadMorePosts(feedType: 'forYou' | 'friends', currentPostsCount: number): Promise<FeedPost[]> {
    try {
      console.log(`📄 Loading more ${feedType} posts (offset: ${currentPostsCount})`);
      
      if (feedType === 'forYou') {
        return await this.getForYouFeed(20, currentPostsCount);
      } else {
        return await this.getFriendsFeed(20, currentPostsCount);
      }
    } catch (error) {
      console.error(`❌ Error loading more ${feedType} posts:`, error);
      return [];
    }
  }

  // New method to get feed stats
  async getFeedStats(): Promise<{ totalPosts: number; totalUsers: number; lastUpdate: string }> {
    try {
      // Get total public posts count
      const posts = await this.makeDirectRequest('posts?select=id&visibility=eq.public&limit=1000');
      
      // Get unique users count
      const users = await this.makeDirectRequest('user_profiles?select=user_id&onboarding_completed=eq.true&limit=1000');
      
      return {
        totalPosts: posts.length,
        totalUsers: users.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching feed stats:', error);
      return {
        totalPosts: 0,
        totalUsers: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }
}

export const feedService = new FeedService(); 