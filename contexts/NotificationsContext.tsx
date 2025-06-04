import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  notificationsService, 
  Notification, 
  NotificationPreferences, 
  NotificationsResponse,
  MarkAsReadResult 
} from '@/lib/notificationsService';
import { useAuth } from './AuthContext';

// ==========================================
// CONTEXT INTERFACE
// ==========================================

interface NotificationsContextType {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  preferences: NotificationPreferences | null;
  
  // Actions
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (notificationIds?: string[]) => Promise<MarkAsReadResult>;
  markAllAsRead: () => Promise<MarkAsReadResult>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<{ success: boolean; error?: string }>;
  
  // Real-time actions
  addNewNotification: (notification: Notification) => void;
  updateUnreadCount: (updater: (count: number) => number) => void;
  
  // Utility
  getDisplayText: (notification: Notification) => string;
  formatTime: (timestamp: string) => string;
}

// ==========================================
// CONTEXT PROVIDER
// ==========================================

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  // Auth state
  const { isAuthenticated, user } = useAuth();
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // ==========================================
  // CORE METHODS
  // ==========================================

  /**
   * Load initial notifications and preferences
   */
  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔔 Loading initial notifications data...');
      
      // Load notifications and preferences in parallel
      const [notificationsResponse, userPreferences] = await Promise.all([
        notificationsService.getUserNotifications(pageSize, 0),
        notificationsService.getNotificationPreferences(),
      ]);

      setNotifications(notificationsResponse.notifications);
      setUnreadCount(notificationsResponse.unread_count);
      setHasMore(notificationsResponse.has_more);
      setPreferences(userPreferences);
      setCurrentPage(0);

      console.log(`✅ Loaded ${notificationsResponse.notifications.length} notifications`);
    } catch (error) {
      console.error('❌ Error loading initial notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  /**
   * Refresh notifications (pull-to-refresh)
   */
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing notifications...');
      
      const response = await notificationsService.getUserNotifications(pageSize, 0);
      
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
      setHasMore(response.has_more);
      setCurrentPage(0);

      console.log(`✅ Refreshed with ${response.notifications.length} notifications`);
    } catch (error) {
      console.error('❌ Error refreshing notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  /**
   * Load more notifications (pagination)
   */
  const loadMoreNotifications = useCallback(async () => {
    if (!isAuthenticated || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const nextPage = currentPage + 1;
      const offset = nextPage * pageSize;
      
      console.log(`📄 Loading page ${nextPage} (offset: ${offset})`);
      
      const response = await notificationsService.getUserNotifications(pageSize, offset);
      
      if (response.notifications.length > 0) {
        setNotifications(prev => [...prev, ...response.notifications]);
        setCurrentPage(nextPage);
      }
      
      setHasMore(response.has_more);

      console.log(`✅ Loaded ${response.notifications.length} more notifications`);
    } catch (error) {
      console.error('❌ Error loading more notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isLoading, hasMore, currentPage]);

  /**
   * Mark specific notifications as read
   */
  const markAsRead = useCallback(async (notificationIds?: string[]): Promise<MarkAsReadResult> => {
    if (!isAuthenticated) {
      return { success: false, marked_count: 0, error: 'Not authenticated' };
    }

    try {
      const result = await notificationsService.markAsRead(notificationIds);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => {
            if (!notificationIds || notificationIds.includes(notification.id)) {
              return { ...notification, read_at: new Date().toISOString() };
            }
            return notification;
          })
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - result.marked_count));
        
        console.log(`✅ Marked ${result.marked_count} notifications as read`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
      return { 
        success: false, 
        marked_count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [isAuthenticated]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async (): Promise<MarkAsReadResult> => {
    return await markAsRead(); // No specific IDs = mark all
  }, [markAsRead]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (
    updates: Partial<Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const result = await notificationsService.updateNotificationPreferences(updates);
      
      if (result.success && preferences) {
        // Update local preferences state
        setPreferences(prev => prev ? { ...prev, ...updates } : null);
        console.log('✅ Notification preferences updated locally');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [isAuthenticated, preferences]);

  // ==========================================
  // REAL-TIME METHODS
  // ==========================================

  /**
   * Add a new notification to the beginning of the list (real-time)
   */
  const addNewNotification = useCallback((newNotification: Notification) => {
    setNotifications(prev => {
      // Check if notification already exists to prevent duplicates
      const exists = prev.some(n => n.id === newNotification.id);
      if (exists) return prev;
      
      // Add to beginning of array (most recent first)
      return [newNotification, ...prev];
    });
  }, []);

  /**
   * Update unread count (real-time)
   */
  const updateUnreadCount = useCallback((updater: (count: number) => number) => {
    setUnreadCount(prev => {
      const newCount = updater(prev);
      return Math.max(0, newCount); // Ensure count never goes negative
    });
  }, []);

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  const getDisplayText = useCallback((notification: Notification): string => {
    return notificationsService.getNotificationDisplayText(notification);
  }, []);

  const formatTime = useCallback((timestamp: string): string => {
    return notificationsService.formatNotificationTime(timestamp);
  }, []);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Load initial data when user authenticates
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      notificationsService.cleanup();
    };
  }, []);

  // Periodic unread count refresh (optional)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.warn('Failed to refresh unread count:', error);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const contextValue: NotificationsContextType = {
    // State
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    hasMore,
    preferences,
    
    // Actions
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    
    // Real-time actions
    addNewNotification,
    updateUnreadCount,
    
    // Utility
    getDisplayText,
    formatTime,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ==========================================
// CUSTOM HOOK
// ==========================================

export function useNotifications() {
  const context = useContext(NotificationsContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  
  return context;
}

// ==========================================
// UTILITY HOOKS
// ==========================================

/**
 * Hook for just the unread count (lightweight)
 */
export function useUnreadNotificationsCount() {
  const { unreadCount } = useNotifications();
  return unreadCount;
}

/**
 * Hook for notification preferences management
 */
export function useNotificationPreferences() {
  const { preferences, updatePreferences } = useNotifications();
  return { preferences, updatePreferences };
} 