import { supabaseAuth } from './supabase';
import { Post } from './posts';

export interface FeedPost extends Post {
  // Additional feed-specific properties if needed
}

class FeedService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  private async makeDirectRequest(endpoint: string, method: string = 'GET', body?: any) {
    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || this.supabaseAnonKey;

    const response = await fetch(`${this.supabaseUrl}/rest/v1/${endpoint}`, {
      method,
      headers: {
        'apikey': this.supabaseAnonKey!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Get all public posts for "For You" feed
  async getForYouFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      console.log('📰 Fetching For You feed...', { limit, offset });
      
      // Fetch posts with joins to get user and media data
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles!inner(*),media_items(*)`
        + `&is_public=eq.true`
        + `&order=created_at.desc`
        + `&limit=${limit}`
        + `&offset=${offset}`
      );

      console.log(`✅ Found ${posts.length} posts for For You feed`);
      // Only log data structure if we're debugging an issue
      if (posts.length === 0 && offset === 0) {
        console.log('📊 No posts found - checking data structure...');
      }
      
      const transformedPosts = posts.map((post: any) => this.transformToFeedPost(post));
      
      return transformedPosts;
    } catch (error) {
      console.error('❌ Error fetching For You feed:', error);
      return [];
    }
  }

  // Get posts from users the current user follows for "Friends + Following" feed
  async getFriendsFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        console.log('⚠️ No user session for friends feed');
        return [];
      }

      console.log('👥 Fetching Friends + Following feed...');
      
      // For now, return the same as For You feed since we don't have user connections yet
      // TODO: Update this when user following/friends functionality is implemented
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles!inner(*),media_items(*)`
        + `&is_public=eq.true`
        + `&order=created_at.desc`
        + `&limit=${limit}`
        + `&offset=${offset}`
      );

      console.log(`✅ Found ${posts.length} posts for Friends feed`);
      return posts.map((post: any) => this.transformToFeedPost(post));
    } catch (error) {
      console.error('❌ Error fetching Friends feed:', error);
      return [];
    }
  }

  // Get posts by a specific user (for profile page)
  async getUserPosts(userId?: string, limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('⚠️ No user ID provided for user posts');
        return [];
      }

      console.log(`📋 Fetching posts for user: ${targetUserId}`);
      
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles!inner(*),media_items(*)`
        + `&user_id=eq.${targetUserId}`
        + `&is_public=eq.true`
        + `&order=created_at.desc`
        + `&limit=${limit}`
        + `&offset=${offset}`
      );

      console.log(`✅ Found ${posts.length} posts for user ${targetUserId}`);
      return posts.map((post: any) => this.transformToFeedPost(post));
    } catch (error) {
      console.error(`❌ Error fetching user posts:`, error);
      return [];
    }
  }

  // Transform database post to feed post format
  private transformToFeedPost(dbPost: any): FeedPost {
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

    // Ensure we have safe fallbacks for all required fields
    const userProfile = dbPost.user_profiles || {};
    const mediaItem = dbPost.media_items || {};

    return {
      id: dbPost.id || 'unknown-id',
      user: {
        name: userProfile.display_name || userProfile.username || 'Anonymous User',
        avatar: userProfile.avatar_url || 'https://via.placeholder.com/40',
      },
      media: {
        id: dbPost.media_id || 'unknown-media',
        title: mediaItem.title || 'Unknown Media',
        type: mediaItem.media_type || 'unknown',
        cover: mediaItem.image_url || 'https://via.placeholder.com/120x160',
        progress: dbPost.location_context || undefined,
      },
      date: formatDate(dbPost.created_at || new Date().toISOString()),
      title: dbPost.title || undefined,
      contentType: 'text', // For now, all posts are text-based
      content: dbPost.content || '',
      textContent: dbPost.content || '',
      commentCount: dbPost.comment_count || 0,
      likeCount: dbPost.like_count || 0,
      isBookmarked: false, // TODO: Check if user has bookmarked this post
      isLiked: false, // TODO: Check if user has liked this post
      rating: dbPost.rating || undefined,
    };
  }

  // Refresh feed data
  async refreshFeed(feedType: 'forYou' | 'friends'): Promise<FeedPost[]> {
    if (feedType === 'forYou') {
      return this.getForYouFeed();
    } else {
      return this.getFriendsFeed();
    }
  }

  // Load more posts for infinite scroll
  async loadMorePosts(feedType: 'forYou' | 'friends', currentPostsCount: number): Promise<FeedPost[]> {
    if (feedType === 'forYou') {
      return this.getForYouFeed(20, currentPostsCount);
    } else {
      return this.getFriendsFeed(20, currentPostsCount);
    }
  }
}

export const feedService = new FeedService(); 