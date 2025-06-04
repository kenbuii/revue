import { supabaseAuth } from './supabase';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

export type NotificationType = 
  | 'like_post' 
  | 'like_comment' 
  | 'comment_post' 
  | 'reply_comment' 
  | 'follow_user' 
  | 'post_mention' 
  | 'comment_mention' 
  | 'new_post_from_followed';

export type EntityType = 'post' | 'comment' | 'user';

export interface Notification {
  id: string;
  actor_id: string;
  actor_username: string;
  actor_display_name: string;
  actor_avatar_url: string;
  type: NotificationType;
  entity_type: EntityType;
  entity_id: string;
  metadata: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  like_notifications: boolean;
  comment_notifications: boolean;
  follow_notifications: boolean;
  mention_notifications: boolean;
  post_notifications: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushNotificationToken {
  id: string;
  user_id: string;
  token: string;
  device_type: 'ios' | 'android' | 'web' | 'unknown';
  device_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
  has_more: boolean;
}

export interface MarkAsReadResult {
  success: boolean;
  marked_count: number;
  error?: string;
}

export interface NotificationSubscriptionCallback {
  (notification: Notification): void;
}

// ==========================================
// NOTIFICATIONS SERVICE CLASS
// ==========================================

class NotificationsService {
  private supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  private subscriptions: Set<() => void> = new Set();

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
   * Make authenticated query to Supabase table
   */
  private async queryTable(table: string, query: string, params: any = {}) {
    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || this.supabaseAnonKey;

    const url = new URL(`${this.supabaseUrl}/rest/v1/${table}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': this.supabaseAnonKey!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...query.length > 0 && { 'Select': query },
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Query failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ==========================================
  // CORE NOTIFICATION METHODS
  // ==========================================

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<NotificationsResponse> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('🔔 Fetching notifications:', { limit, offset, unreadOnly });

      // Get notifications
      const notifications = await this.callRPC('get_user_notifications', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
        p_unread_only: unreadOnly,
      });

      // Get unread count
      const unreadCount = await this.callRPC('get_unread_notification_count', {
        p_user_id: userId,
      });

      const result: NotificationsResponse = {
        notifications: Array.isArray(notifications) ? notifications.map(this.formatNotification) : [],
        unread_count: unreadCount || 0,
        has_more: Array.isArray(notifications) && notifications.length === limit,
      };

      console.log(`✅ Fetched ${result.notifications.length} notifications, ${result.unread_count} unread`);
      return result;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      return {
        notifications: [],
        unread_count: 0,
        has_more: false,
      };
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds?: string[]): Promise<MarkAsReadResult> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('✅ Marking notifications as read:', notificationIds?.length || 'all');

      const result = await this.callRPC('mark_notifications_read', {
        p_user_id: userId,
        p_notification_ids: notificationIds || null,
      });

      console.log(`✅ Marked ${result} notifications as read`);
      return {
        success: true,
        marked_count: result || 0,
      };
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
      return {
        success: false,
        marked_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get unread notification count only
   */
  async getUnreadCount(): Promise<number> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        return 0;
      }

      const count = await this.callRPC('get_unread_notification_count', {
        p_user_id: userId,
      });

      return count || 0;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  // ==========================================
  // NOTIFICATION PREFERENCES
  // ==========================================

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const preferences = await this.queryTable('notification_preferences', '*', {
        user_id: `eq.${userId}`,
      });

      if (preferences && preferences.length > 0) {
        return preferences[0];
      }

      // Create default preferences if they don't exist
      return await this.createDefaultPreferences(userId);
    } catch (error) {
      console.error('❌ Error fetching notification preferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    updates: Partial<Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('⚙️ Updating notification preferences:', updates);

      const response = await fetch(`${this.supabaseUrl}/rest/v1/notification_preferences`, {
        method: 'PATCH',
        headers: {
          'apikey': this.supabaseAnonKey!,
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Update failed: ${response.status} - ${error}`);
      }

      console.log('✅ Notification preferences updated');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create default notification preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPrefs: Omit<NotificationPreferences, 'created_at' | 'updated_at'> = {
      user_id: userId,
      email_notifications: true,
      push_notifications: true,
      like_notifications: true,
      comment_notifications: true,
      follow_notifications: true,
      mention_notifications: true,
      post_notifications: true,
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '08:00:00',
      quiet_hours_enabled: false,
    };

    const response = await fetch(`${this.supabaseUrl}/rest/v1/notification_preferences`, {
      method: 'POST',
      headers: {
        'apikey': this.supabaseAnonKey!,
        'Authorization': `Bearer ${(await supabaseAuth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(defaultPrefs),
    });

    if (!response.ok) {
      throw new Error('Failed to create default preferences');
    }

    const created = await response.json();
    return created[0];
  }

  // ==========================================
  // PUSH NOTIFICATION TOKENS
  // ==========================================

  /**
   * Register a push notification token
   */
  async registerPushToken(
    token: string,
    deviceType: 'ios' | 'android' | 'web' | 'unknown' = 'unknown',
    deviceName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('📱 Registering push token:', { deviceType, deviceName });

      const tokenData = {
        user_id: userId,
        token,
        device_type: deviceType,
        device_name: deviceName,
        is_active: true,
      };

      const response = await fetch(`${this.supabaseUrl}/rest/v1/push_notification_tokens`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseAnonKey!,
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(tokenData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token registration failed: ${response.status} - ${error}`);
      }

      console.log('✅ Push token registered successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deactivate a push notification token
   */
  async deactivatePushToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = await supabaseAuth.getSession();
      const userId = session.data.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.supabaseUrl}/rest/v1/push_notification_tokens`, {
        method: 'PATCH',
        headers: {
          'apikey': this.supabaseAnonKey!,
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          is_active: false,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token deactivation failed: ${response.status} - ${error}`);
      }

      console.log('✅ Push token deactivated');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deactivating push token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Format notification data for frontend consumption
   */
  private formatNotification(notification: any): Notification {
    return {
      id: notification.id,
      actor_id: notification.actor_id,
      actor_username: notification.actor_username,
      actor_display_name: notification.actor_display_name,
      actor_avatar_url: notification.actor_avatar_url || 'https://via.placeholder.com/40',
      type: notification.type,
      entity_type: notification.entity_type,
      entity_id: notification.entity_id,
      metadata: notification.metadata || {},
      read_at: notification.read_at,
      created_at: notification.created_at,
    };
  }

  /**
   * Format notification time for display
   */
  formatNotificationTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 60 * 24) {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      } else if (diffInMinutes < 60 * 24 * 7) {
        return `${Math.floor(diffInMinutes / (60 * 24))}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.warn('Error formatting notification time:', error);
      return 'Unknown time';
    }
  }

  /**
   * Get display text for notification type
   */
  getNotificationDisplayText(notification: Notification): string {
    const actorName = notification.actor_display_name || notification.actor_username;
    
    switch (notification.type) {
      case 'like_post':
        return `${actorName} liked your review`;
      case 'like_comment':
        return `${actorName} liked your comment`;
      case 'comment_post':
        return `${actorName} commented on your review`;
      case 'reply_comment':
        return `${actorName} replied to your comment`;
      case 'follow_user':
        return `${actorName} started following you`;
      case 'post_mention':
        return `${actorName} mentioned you in a review`;
      case 'comment_mention':
        return `${actorName} mentioned you in a comment`;
      case 'new_post_from_followed':
        return `${actorName} posted a new review`;
      default:
        return `${actorName} interacted with your content`;
    }
  }

  /**
   * Check if notifications are enabled for a specific type
   */
  async isNotificationTypeEnabled(type: NotificationType): Promise<boolean> {
    try {
      const preferences = await this.getNotificationPreferences();
      if (!preferences) return true; // Default to enabled

      switch (type) {
        case 'like_post':
        case 'like_comment':
          return preferences.like_notifications;
        case 'comment_post':
        case 'reply_comment':
          return preferences.comment_notifications;
        case 'follow_user':
          return preferences.follow_notifications;
        case 'post_mention':
        case 'comment_mention':
          return preferences.mention_notifications;
        case 'new_post_from_followed':
          return preferences.post_notifications;
        default:
          return true;
      }
    } catch (error) {
      console.warn('Error checking notification type enabled:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Cleanup method - call when component unmounts
   */
  cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService(); 