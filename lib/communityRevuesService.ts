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
   * Safe string helper to prevent React Native text rendering errors
   */
  private safeString(value: any, fallback: string = ''): string {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    return String(value);
  }

  /**
   * Transform raw revue data with safe string handling
   */
  private transformRevueData(revue: any): CommunityRevue {
    return {
      id: this.safeString(revue.id),
      user: {
        id: this.safeString(revue.user_id),
        name: this.safeString(revue.user_name, 'Anonymous'),
        avatar: this.safeString(revue.user_avatar, 'https://via.placeholder.com/40'),
        username: this.safeString(revue.user_username, 'user'),
      },
      content: this.safeString(revue.content, ''),
      rating: typeof revue.rating === 'number' ? revue.rating : undefined,
      createdAt: this.safeString(revue.created_at),
      likeCount: Number(revue.like_count) || 0,
      commentCount: Number(revue.comment_count) || 0,
      mediaId: this.safeString(revue.media_id, ''),
      mediaTitle: this.safeString(revue.media_title, 'Unknown Title'),
    };
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

      // Get community stats using RPC function with error handling
      let statsResult;
      try {
        statsResult = await this.callRPC('get_media_community_stats', {
        p_media_id: mediaId
      });
      console.log('📊 Stats result:', statsResult);
      } catch (error) {
        console.warn('⚠️ Stats RPC failed, using defaults:', error);
        statsResult = {};
      }

      // Get recent revues using RPC function with error handling
      let revuesResult;
      try {
        revuesResult = await this.callRPC('get_media_recent_revues', {
        p_media_id: mediaId,
        p_limit: limit,
        p_offset: 0
      });
      console.log('📝 Revues result:', revuesResult);
      } catch (error) {
        console.warn('⚠️ Revues RPC failed, using empty array:', error);
        revuesResult = [];
      }

      // Transform the revues data with safe string handling
      const revues: CommunityRevue[] = (revuesResult || []).map((revue: any) => 
        this.transformRevueData(revue)
      );

      console.log(`✅ Found ${revues.length} revues for media ${mediaId}`);

      return {
        totalRevues: Number(statsResult?.totalRevues) || 0,
        averageRating: Number(statsResult?.averageRating) || 0,
        readingCount: Number(statsResult?.readingCount) || 0,
        wantToReadCount: Number(statsResult?.wantToReadCount) || 0,
        completedCount: Number(statsResult?.completedCount) || 0,
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
        userId: this.safeString(user.user_id),
        userName: this.safeString(user.user_name, 'Anonymous'),
        userUsername: this.safeString(user.user_username, 'user'),
        userAvatar: this.safeString(user.user_avatar, 'https://via.placeholder.com/40'),
        additionalData: {
          postId: this.safeString(user.post_id),
          contentSnippet: this.safeString(user.content_snippet, ''),
          rating: typeof user.rating === 'number' ? user.rating : undefined,
          revuedAt: this.safeString(user.revued_at),
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
        userId: this.safeString(user.user_id),
        userName: this.safeString(user.user_name, 'Anonymous'),
        userUsername: this.safeString(user.user_username, 'user'),
        userAvatar: this.safeString(user.user_avatar, 'https://via.placeholder.com/40'),
        additionalData: {
          status: this.safeString(user.status, 'reading'),
          startedReading: this.safeString(user.started_reading),
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
        userId: this.safeString(user.user_id),
        userName: this.safeString(user.user_name, 'Anonymous'),
        userUsername: this.safeString(user.user_username, 'user'),
        userAvatar: this.safeString(user.user_avatar, 'https://via.placeholder.com/40'),
        additionalData: {
          source: this.safeString(user.source, 'bookmark'),
          addedAt: this.safeString(user.added_at),
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

      return (result || []).map((revue: any) => this.transformRevueData(revue));

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
      
      const searchLower = this.safeString(searchQuery).toLowerCase();
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