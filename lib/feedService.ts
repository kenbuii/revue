import { supabaseAuth } from './supabase';
import { Post } from './posts';

export interface FeedPost extends Post {
  // Additional feed-specific properties if needed
}

class FeedService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Add proper RPC calling method (similar to postService)
  private async callRPC(functionName: string, params: any = {}) {
    const session = await supabaseAuth.getSession();
    
    // FIXED: Ensure we have valid auth token instead of falling back to anon key
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required for feed');
    }
    
    const token = session.data.session.access_token;

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
      console.error(`RPC call failed: ${response.status} - ${error}`);
      throw new Error(`Failed to ${functionName}: ${error}`);
    }

    const result = await response.json();
    
    // FIXED: Handle null results gracefully
    if (result === null) {
      throw new Error(`${functionName} returned null - check authentication context`);
    }

    return result;
  }

  private async makeDirectRequest(endpoint: string, method: string = 'GET', body?: any) {
    const session = await supabaseAuth.getSession();
    
    // FIXED: Ensure we have valid auth token instead of falling back to anon key
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required for feed');
    }
    
    const token = session.data.session.access_token;

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
      console.error(`Request failed: ${response.status} - ${error}`);
      throw new Error(`Request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // HYBRID APPROACH: Use RPC for complex "For You" feed with personalization
  async getForYouFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      console.log('📰 Fetching For You feed using RPC...');
      
      // TEMPORARY: Force fallback to debug the issue
      console.log('🚨 TEMPORARILY USING POSTGREST FALLBACK FOR DEBUGGING');
      return this.getForYouFeedFallback(limit, offset);
      
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;
      
      // Use proper RPC call with POST method and body params
      const posts = await this.callRPC('get_for_you_feed', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

      console.log(`✅ Found ${posts.length} posts for For You feed`);
      return posts.map((post: any) => this.transformRPCPostToFeedPost(post));
    } catch (error) {
      console.error('❌ Error fetching For You feed:', error);
      // Fallback to PostgREST if RPC fails
      return this.getForYouFeedFallback(limit, offset);
    }
  }

  // HYBRID APPROACH: Use RPC for friends feed
  async getFriendsFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      // TEMPORARY: Force fallback to debug the issue
      console.log('🚨 TEMPORARILY USING POSTGREST FALLBACK FOR DEBUGGING');
      return this.getFriendsFeedFallback(limit, offset);
      
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        console.log('⚠️ No user session for friends feed');
        return [];
      }

      console.log('👥 Fetching Friends + Following feed using RPC...');
      
      // Use proper RPC call with POST method and body params
      const posts = await this.callRPC('get_friends_feed', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

      console.log(`✅ Found ${posts.length} posts for Friends feed`);
      return posts.map((post: any) => this.transformRPCPostToFeedPost(post));
    } catch (error) {
      console.error('❌ Error fetching Friends feed:', error);
      // Fallback to PostgREST if RPC fails
      return this.getFriendsFeedFallback(limit, offset);
    }
  }

  // HYBRID APPROACH: Use PostgREST for simple user posts query
  async getUserPosts(userId?: string, limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('⚠️ No user ID provided for user posts');
        return [];
      }

      console.log(`📋 Fetching posts for user: ${targetUserId} using PostgREST...`);
      
      // Use PostgREST for simple queries (now that FK constraint is fixed)
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles(*),media_items(*)`
        + `&user_id=eq.${targetUserId}`
        + `&is_public=eq.true`
        + `&order=created_at.desc`
        + `&limit=${limit}`
        + `&offset=${offset}`
      );

      console.log(`✅ Found ${posts.length} posts for user ${targetUserId}`);
      return posts.map((post: any) => this.transformPostgRESTPostToFeedPost(post));
    } catch (error) {
      console.error(`❌ Error fetching user posts:`, error);
      return [];
    }
  }

  // Transform RPC function results to FeedPost format
  private transformRPCPostToFeedPost(dbPost: any): FeedPost {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
      if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    return {
      id: dbPost.id,
      user: {
        name: dbPost.display_name || dbPost.username || 'Unknown User',
        avatar: dbPost.avatar_url || 'https://via.placeholder.com/40',
      },
      media: {
        id: dbPost.media_item_id || '',
        title: dbPost.media_title || 'Unknown Media',
        type: dbPost.media_type || 'unknown',
        cover: dbPost.media_cover_url || 'https://via.placeholder.com/120x160',
        progress: undefined, // Can be added later if needed
      },
      date: formatDate(dbPost.created_at),
      title: dbPost.title,
      contentType: 'text', // For now, all posts are text-based
      content: dbPost.content,
      textContent: dbPost.content,
      commentCount: dbPost.comment_count || 0,
      likeCount: dbPost.like_count || 0,
      isBookmarked: false, // TODO: Check if user has bookmarked this post
      isLiked: false, // TODO: Check if user has liked this post
      rating: dbPost.rating,
    };
  }

  // Transform PostgREST results to FeedPost format (legacy format)
  private transformPostgRESTPostToFeedPost(dbPost: any): FeedPost {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
      if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}d ago`;
      return date.toLocaleDateString();
    };

    return {
      id: dbPost.id,
      user: {
        name: dbPost.user_profiles?.display_name || dbPost.user_profiles?.username || 'Unknown User',
        avatar: dbPost.user_profiles?.avatar_url || 'https://via.placeholder.com/40',
      },
      media: {
        id: dbPost.media_item_id || '',
        title: dbPost.media_items?.title || 'Unknown Media',
        type: dbPost.media_items?.media_type || 'unknown',
        cover: dbPost.media_items?.cover_image_url || 'https://via.placeholder.com/120x160',
        progress: undefined,
      },
      date: formatDate(dbPost.created_at),
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

  // Fallback to PostgREST for For You feed if RPC fails
  private async getForYouFeedFallback(limit: number, offset: number): Promise<FeedPost[]> {
    try {
      console.log('⚠️ Using PostgREST fallback for For You feed...');
      
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles(*),media_items(*)`
        + `&is_public=eq.true`
        + `&user_profiles.onboarding_completed=eq.true`
        + `&order=created_at.desc`
        + `&limit=${limit}`
        + `&offset=${offset}`
      );

      console.log(`📊 PostgREST fallback returned ${posts.length} posts`);
      return posts.map((post: any) => this.transformPostgRESTPostToFeedPost(post));
    } catch (error) {
      console.error('❌ PostgREST fallback also failed:', error);
      return [];
    }
  }

  // Fallback to PostgREST for Friends feed if RPC fails
  private async getFriendsFeedFallback(limit: number, offset: number): Promise<FeedPost[]> {
    try {
      console.log('⚠️ Using PostgREST fallback for Friends feed...');
      
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles(*),media_items(*)`
        + `&is_public=eq.true`
        + `&user_profiles.onboarding_completed=eq.true`
        + `&order=created_at.desc`
        + `&limit=${limit}`
        + `&offset=${offset}`
      );

      console.log(`📊 PostgREST fallback returned ${posts.length} posts`);
      return posts.map((post: any) => this.transformPostgRESTPostToFeedPost(post));
    } catch (error) {
      console.error('❌ PostgREST fallback also failed:', error);
      return [];
    }
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