import { supabaseAuth } from './supabase';

// Types for user profile data
export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  email_hash: string | null;
  onboarding_completed: boolean;
  contact_sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  reviewCount: number;
  followers: number;
  following: number;
}

export interface MediaPreference {
  media_id: string;
  title: string;
  media_type: 'movie' | 'tv' | 'book';
  year: string | null;
  image_url: string | null;
  description: string | null;
  source: string;
}

export interface UserReview {
  id: string;
  title: string;
  content: string;
  created_at: string;
  media?: {
    title: string;
    cover_url: string;
  };
}

// User Profile Service
class UserProfileService {
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
        'Prefer': 'return=representation', // This ensures we get a response body
        ...options.headers,
      },
      ...options,
    };

    console.log(`🔗 Making Supabase request: ${requestOptions.method} ${url}`);
    
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Supabase request failed: ${response.status} - ${error}`);
      throw new Error(`Supabase request failed: ${response.status} - ${error}`);
    }

    // Handle empty responses (like DELETE operations)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('✅ Non-JSON response (likely empty) - operation successful');
      return null; // Return null for successful operations without JSON content
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      console.log('✅ Empty response - operation successful');
      return null; // Return null for empty but successful responses
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
   * Call Supabase RPC function
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
   * Get user profile by ID
   */
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('No user ID provided and no session found');
        return null;
      }

      console.log('🔄 Fetching user profile for:', targetUserId);

      const profiles = await this.makeSupabaseRequest(
        `user_profiles?user_id=eq.${targetUserId}&select=*`
      );

      if (profiles.length === 0) {
        console.log('No profile found for user:', targetUserId);
        return null;
      }

      console.log('✅ User profile fetched successfully');
      return profiles[0] as UserProfile;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get user media preferences (On Vue items)
   */
  async getUserMediaPreferences(userId?: string): Promise<MediaPreference[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        console.log('No user ID provided and no session found');
        return [];
      }

      console.log('🔄 Fetching user media preferences for:', targetUserId);
      console.log('🔍 Session user ID:', session.data.session?.user?.id);
      console.log('🔍 Provided user ID:', userId);
      console.log('🔍 Using target user ID:', targetUserId);

      const preferences = await this.callRPC('get_user_media_preferences', {
        p_user_id: targetUserId
      });

      console.log('✅ User media preferences fetched:', preferences.length, 'items');
      console.log('🎬 Raw preferences data:', preferences);
      console.log('🎬 First preference structure:', preferences[0]);
      
      return preferences as MediaPreference[];
    } catch (error) {
      console.error('❌ Error fetching user media preferences:', error);
      return [];
    }
  }

  /**
   * Get user stats (review count, followers, following)
   */
  async getUserStats(userId?: string): Promise<UserStats> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        return { reviewCount: 0, followers: 0, following: 0 };
      }

      console.log('🔄 Fetching user stats for:', targetUserId);

      // For now, return mock data since we don't have reviews/posts table yet
      // TODO: Implement actual queries when posts/reviews tables are ready
      const stats = {
        reviewCount: 0,
        followers: 0,
        following: 0
      };

      console.log('✅ User stats fetched (mock data for now)');
      return stats;
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      return { reviewCount: 0, followers: 0, following: 0 };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'No authenticated user found' };
      }

      console.log('🔄 Updating user profile:', updates);

      await this.makeSupabaseRequest(
        `user_profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...updates,
            updated_at: new Date().toISOString()
          }),
        }
      );

      console.log('✅ User profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: Blob, userId?: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        return { success: false, error: 'No authenticated user found' };
      }

      console.log('🔄 Uploading profile picture for user:', targetUserId);

      const fileName = `${targetUserId}-${Date.now()}.jpg`;
      const token = session.data.session?.access_token || this.supabaseAnonKey;

      // Upload to Supabase Storage
      const formData = new FormData();
      formData.append('file', file as any, fileName);

      const uploadResponse = await fetch(`${this.supabaseUrl}/storage/v1/object/avatars/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': this.supabaseAnonKey!,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`Upload failed: ${error}`);
      }

      // Get public URL
      const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;

      // Update user profile with new avatar URL
      const updateResult = await this.updateUserProfile({ avatar_url: publicUrl });
      
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      console.log('✅ Profile picture uploaded successfully');
      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's recent reviews/posts
   */
  async getUserRecentReviews(userId?: string): Promise<UserReview[]> {
    try {
      const session = await supabaseAuth.getSession();
      const targetUserId = userId || session.data.session?.user?.id;

      if (!targetUserId) {
        return [];
      }

      console.log('🔄 Fetching user recent reviews for:', targetUserId);

      // TODO: Implement when posts/reviews table is ready
      // For now, return empty array
      console.log('✅ User recent reviews fetched (empty for now)');
      return [];
    } catch (error) {
      console.error('❌ Error fetching user recent reviews:', error);
      return [];
    }
  }

  /**
   * Remove a media preference from user's "On Vue" list
   */
  async removeMediaPreference(mediaId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'No authenticated user found' };
      }

      console.log('🔄 Removing media preference:', { userId, mediaId });

      await this.makeSupabaseRequest(
        `user_media_preferences?user_id=eq.${userId}&media_id=eq.${mediaId}`,
        {
          method: 'DELETE'
        }
      );

      console.log('✅ Media preference removed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing media preference:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update the order of media preferences by reordering them
   * We'll delete all existing preferences and re-insert them in the new order
   */
  async updateMediaPreferencesOrder(orderedPreferences: MediaPreference[]): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return { success: false, error: 'No authenticated user found' };
      }

      console.log('🔄 Updating media preferences order:', {
        userId,
        itemCount: orderedPreferences.length,
        items: orderedPreferences.map(p => ({ id: p.media_id, title: p.title }))
      });

      // Since we don't have an explicit order column, we'll delete all and re-insert
      // in the new order (created_at will reflect the new order)
      
      try {
        // Step 1: Delete all existing media preferences for this user
        console.log('🗑️ Deleting existing media preferences...');
        const deleteResult = await this.makeSupabaseRequest(
          `user_media_preferences?user_id=eq.${userId}&added_during_onboarding=eq.true`,
          {
            method: 'DELETE'
          }
        );
        console.log('✅ Existing preferences deleted successfully');
      } catch (deleteError) {
        console.error('❌ Error deleting existing preferences:', deleteError);
        throw new Error(`Failed to delete existing preferences: ${deleteError}`);
      }

      // Step 2: Re-insert in the new order with slight time delays to ensure ordering
      console.log('📝 Re-inserting preferences in new order...');
      
      for (let i = 0; i < orderedPreferences.length; i++) {
        const preference = orderedPreferences[i];
        const now = new Date();
        now.setMilliseconds(now.getMilliseconds() + i); // Add milliseconds to maintain order
        
        const insertData = {
          user_id: userId,
          media_id: preference.media_id,
          title: preference.title,
          media_type: preference.media_type,
          year: preference.year,
          image_url: preference.image_url,
          description: preference.description,
          source: preference.source,
          original_api_id: preference.media_id.split('_').pop() || null,
          added_during_onboarding: true,
          created_at: now.toISOString()
        };

        try {
          console.log(`📝 Inserting preference ${i + 1}/${orderedPreferences.length}: ${preference.title}`);
          
          const insertResult = await this.makeSupabaseRequest(
            'user_media_preferences',
            {
              method: 'POST',
              body: JSON.stringify(insertData)
            }
          );
          
          console.log(`✅ Preference ${i + 1} inserted successfully`);
        } catch (insertError) {
          console.error(`❌ Error inserting preference ${i + 1}:`, insertError);
          throw new Error(`Failed to insert preference "${preference.title}": ${insertError}`);
        }

        // Small delay to ensure proper ordering
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log('✅ Media preferences order updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating media preferences order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService(); 