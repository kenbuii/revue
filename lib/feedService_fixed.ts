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
      console.log('📰 Fetching For You feed...');
      
      // FIXED: Use correct column names (visibility instead of is_public)
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles!inner(*),media_items(*)`
        + `&visibility=eq.public`  // FIXED: was is_public=eq.true
        + `&user_profiles.onboarding_completed=eq.true`
        + `&order=created_at.desc`
        + `&limit=${limit}`
        + `&offset=${offset}`
      );

      console.log(`✅ Found ${posts.length} posts for For You feed`);
      return posts.map((post: any) => this.transformToFeedPost(post));
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
      
      // FIXED: Use correct column names
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles!inner(*),media_items(*)`
        + `&visibility=eq.public`  // FIXED: was is_public=eq.true
        + `&user_profiles.onboarding_completed=eq.true`
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
      
      // FIXED: Use correct column names
      const posts = await this.makeDirectRequest(
        `posts?select=*,user_profiles!inner(*),media_items(*)`
        + `&user_id=eq.${targetUserId}`
        + `&visibility=eq.public`  // FIXED: was is_public=eq.true
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
    };

    return {
      id: dbPost.id,
      user: {
        name: dbPost.user_profiles?.display_name || dbPost.user_profiles?.username || 'Unknown User',
        avatar: dbPost.user_profiles?.avatar_url || 'https://via.placeholder.com/40',
      },
      media: {
        // FIXED: Use correct media field name (media_item_id instead of media_id)
        id: dbPost.media_item_id,  // FIXED: was dbPost.media_id
        title: dbPost.media_items?.title || 'Unknown Media',
        type: dbPost.media_items?.media_type || 'unknown',
        cover: dbPost.media_items?.image_url || 'https://via.placeholder.com/120x160',
        progress: dbPost.location_context || undefined,
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