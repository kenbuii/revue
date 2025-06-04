import { supabaseAuth } from './supabase';

export interface CommunityRevue {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    username: string;
  };
  content: string;
  rating?: number;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  mediaId: string;
  mediaTitle: string;
}

export interface MediaCommunityStats {
  totalRevues: number;
  averageRating: number;
  readingCount: number;
  wantToReadCount: number;
  completedCount?: number;
  recentRevues: CommunityRevue[];
}

export interface CommunityUser {
  userId: string;
  userName: string;
  userUsername: string;
  userAvatar: string;
  additionalData?: any; // For extra context like review snippet, reading date, etc.
}

class CommunityRevuesService {
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

    const response = await fetch(`${this.supabaseUrl}/rest/v1/${endpoint}`, {
      method: 'GET',
      headers: {
        'apikey': this.supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Call Supabase RPC function
   */
  private async callRPC(functionName: string, params: any = {}) {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || this.supabaseAnonKey;

    const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'apikey': this.supabaseAnonKey,
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
   * Fetch community stats and recent revues for a specific media item
   */
  async getMediaCommunityData(mediaId: string, limit: number = 10): Promise<MediaCommunityStats> {
    try {
      // Check if Supabase is configured before making requests
      if (!this.supabaseUrl || !this.supabaseAnonKey) {
        console.log('ℹ️ Supabase not configured - using mock data for development');
        return this.getEmptyStats();
      }

      console.log(`🔍 Fetching community data for media: ${mediaId}`);

      // Get community stats using RPC function
      const statsResult = await this.callRPC('get_media_community_stats', {
        p_media_id: mediaId
      });

      console.log('📊 Stats result:', statsResult);

      // Get recent revues using RPC function
      const revuesResult = await this.callRPC('get_media_recent_revues', {
        p_media_id: mediaId,
        p_limit: limit,
        p_offset: 0
      });

      console.log('📝 Revues result:', revuesResult);

      // Transform the revues data
      const revues: CommunityRevue[] = (revuesResult || []).map((revue: any) => ({
        id: revue.id,
        user: {
          id: revue.user_id,
          name: revue.user_name || 'Anonymous',
          avatar: revue.user_avatar || 'https://via.placeholder.com/40',
          username: revue.user_username || 'user',
        },
        content: revue.content || '',
        rating: revue.rating,
        createdAt: revue.created_at,
        likeCount: revue.like_count || 0,
        commentCount: revue.comment_count || 0,
        mediaId: mediaId,
        mediaTitle: 'Unknown Title', // This could be enhanced with media data
      }));

      console.log(`✅ Found ${revues.length} revues for media ${mediaId}`);

      return {
        totalRevues: statsResult?.totalRevues || 0,
        averageRating: statsResult?.averageRating || 0,
        readingCount: statsResult?.readingCount || 0,
        wantToReadCount: statsResult?.wantToReadCount || 0,
        completedCount: statsResult?.completedCount || 0,
        recentRevues: revues,
      };

    } catch (error) {
      // Only log actual network/server errors, not configuration issues
      if (this.supabaseUrl && this.supabaseAnonKey) {
        console.error('❌ Community revues service error:', error);
      }
      return this.getEmptyStats();
    }
  }

  /**
   * Get users who have revued a specific media
   */
  async getMediaRevuers(mediaId: string, page: number = 0, limit: number = 20): Promise<CommunityUser[]> {
    try {
      console.log(`👥 Fetching revuers for media: ${mediaId}, page: ${page}`);

      const result = await this.callRPC('get_media_revuers', {
        p_media_id: mediaId,
        p_limit: limit,
        p_offset: page * limit
      });

      return (result || []).map((user: any) => ({
        userId: user.user_id,
        userName: user.user_name || 'Anonymous',
        userUsername: user.user_username || 'user',
        userAvatar: user.user_avatar || 'https://via.placeholder.com/40',
        additionalData: {
          postId: user.post_id,
          contentSnippet: user.content_snippet,
          rating: user.rating,
          revuedAt: user.revued_at,
        }
      }));

    } catch (error) {
      console.error('❌ Error fetching media revuers:', error);
      return [];
    }
  }

  /**
   * Get users who are currently reading a specific media
   */
  async getMediaReaders(mediaId: string, page: number = 0, limit: number = 20): Promise<CommunityUser[]> {
    try {
      console.log(`📖 Fetching readers for media: ${mediaId}, page: ${page}`);

      const result = await this.callRPC('get_media_readers', {
        p_media_id: mediaId,
        p_limit: limit,
        p_offset: page * limit
      });

      return (result || []).map((user: any) => ({
        userId: user.user_id,
        userName: user.user_name || 'Anonymous',
        userUsername: user.user_username || 'user',
        userAvatar: user.user_avatar || 'https://via.placeholder.com/40',
        additionalData: {
          status: user.status,
          startedReading: user.started_reading,
        }
      }));

    } catch (error) {
      console.error('❌ Error fetching media readers:', error);
      return [];
    }
  }

  /**
   * Get users who want to read a specific media
   */
  async getMediaWantToReaders(mediaId: string, page: number = 0, limit: number = 20): Promise<CommunityUser[]> {
    try {
      console.log(`💫 Fetching want-to-readers for media: ${mediaId}, page: ${page}`);

      const result = await this.callRPC('get_media_want_to_readers', {
        p_media_id: mediaId,
        p_limit: limit,
        p_offset: page * limit
      });

      return (result || []).map((user: any) => ({
        userId: user.user_id,
        userName: user.user_name || 'Anonymous',
        userUsername: user.user_username || 'user',
        userAvatar: user.user_avatar || 'https://via.placeholder.com/40',
        additionalData: {
          source: user.source, // 'bookmark' or 'preference'
          addedAt: user.added_at,
        }
      }));

    } catch (error) {
      console.error('❌ Error fetching want-to-readers:', error);
      return [];
    }
  }

  /**
   * Fetch more revues for infinite scroll
   */
  async getMoreRevues(mediaId: string, offset: number, limit: number = 10): Promise<CommunityRevue[]> {
    try {
      const result = await this.callRPC('get_media_recent_revues', {
        p_media_id: mediaId,
        p_limit: limit,
        p_offset: offset
      });

      return (result || []).map((revue: any) => ({
        id: revue.id,
        user: {
          id: revue.user_id,
          name: revue.user_name || 'Anonymous',
          avatar: revue.user_avatar || 'https://via.placeholder.com/40',
          username: revue.user_username || 'user',
        },
        content: revue.content || '',
        rating: revue.rating,
        createdAt: revue.created_at,
        likeCount: revue.like_count || 0,
        commentCount: revue.comment_count || 0,
        mediaId: mediaId,
        mediaTitle: 'Unknown Title',
      }));

    } catch (error) {
      console.error('❌ Error fetching more revues:', error);
      return [];
    }
  }

  /**
   * Search revues by content (using simple text search for now)
   */
  async searchRevues(mediaId: string, searchQuery: string, limit: number = 20): Promise<CommunityRevue[]> {
    try {
      // For now, get all revues and filter client-side
      // In production, you might want a dedicated search function
      const allRevues = await this.getMoreRevues(mediaId, 0, limit * 2);
      
      const searchLower = searchQuery.toLowerCase();
      return allRevues.filter(revue => 
        revue.content.toLowerCase().includes(searchLower) ||
        revue.user.name.toLowerCase().includes(searchLower)
      ).slice(0, limit);

    } catch (error) {
      console.error('❌ Error searching revues:', error);
      return [];
    }
  }

  private getEmptyStats(): MediaCommunityStats {
    return {
      totalRevues: 0,
      averageRating: 0,
      readingCount: 0,
      wantToReadCount: 0,
      completedCount: 0,
      recentRevues: [],
    };
  }
}

export const communityRevuesService = new CommunityRevuesService(); 