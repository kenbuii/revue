import { supabaseAuth } from './supabase';

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
   * TODO: This will be updated when posts and likes tables are implemented
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

      // TODO: When posts and likes tables are ready, replace this with:
      /*
      const likedPosts = await this.makeSupabaseRequest(
        `posts_likes?user_id=eq.${targetUserId}&select=*,posts:post_id(id,title,content,media_id,media_title,media_type,media_cover,user_profiles:user_id(display_name,avatar_url))`
      );
      
      return likedPosts?.map((like: any) => ({
        id: like.posts.id,
        title: like.posts.media_title,
        cover: like.posts.media_cover,
        comment: like.posts.content,
        media: {
          id: like.posts.media_id,
          title: like.posts.media_title,
          type: like.posts.media_type,
          cover: like.posts.media_cover,
        },
        user: {
          name: like.posts.user_profiles.display_name,
          avatar: like.posts.user_profiles.avatar_url,
        },
        likedAt: like.created_at,
      })) || [];
      */

      // For now, return empty array until posts/likes tables are implemented
      console.log('✅ Liked posts fetched (empty - posts/likes tables not yet implemented)');
      return [];

    } catch (error) {
      console.error('❌ Error fetching liked posts:', error);
      return [];
    }
  }

  /**
   * Add a like to a post
   * TODO: Implement when posts and likes tables are ready
   */
  async likePost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'No authenticated user found' };
      }

      // TODO: Implement actual like functionality
      console.log('🔄 Would like post:', postId, 'for user:', userId);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error liking post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Remove a like from a post
   * TODO: Implement when posts and likes tables are ready
   */
  async unlikePost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'No authenticated user found' };
      }

      // TODO: Implement actual unlike functionality
      console.log('🔄 Would unlike post:', postId, 'for user:', userId);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error unliking post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const likedPostsService = new LikedPostsService(); 