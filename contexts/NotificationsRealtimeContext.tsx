import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationsContext';
import { NotificationRow } from '../types/database';

interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date | null;
  retryConnection: () => void;
}

const NotificationsRealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  connectionStatus: 'disconnected',
  lastActivity: null,
  retryConnection: () => {},
});

export const useNotificationsRealtime = () => {
  const context = useContext(NotificationsRealtimeContext);
  if (!context) {
    throw new Error('useNotificationsRealtime must be used within NotificationsRealtimeProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const NotificationsRealtimeProvider: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();
  const { refreshNotifications, addNewNotification, updateUnreadCount } = useNotifications();
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id) return;

    console.log('🔴 Setting up realtime notifications subscription...');
    setConnectionStatus('connecting');

    // Create channel for user's notifications
    const notificationsChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          const newNotification = payload.new as NotificationRow;
          
          // Add to context immediately
          addNewNotification(newNotification);
          
          // Update unread count
          updateUnreadCount(count => count + 1);
          
          // Update activity timestamp
          setLastActivity(new Date());
          
          // Show in-app banner (we'll implement this)
          showNotificationBanner(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📝 Notification updated:', payload.new);
          // Handle notification updates (like mark as read)
          refreshNotifications();
        }
      )
      .subscribe((status) => {
        console.log('🔴 Realtime status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionStatus('connected');
          console.log('✅ Realtime notifications connected');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionStatus('error');
          console.error('❌ Realtime connection error');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionStatus('error');
          console.error('⏰ Realtime connection timed out');
        }
      });

    setChannel(notificationsChannel);
  }, [user?.id, addNewNotification, updateUnreadCount, refreshNotifications]);

  const showNotificationBanner = useCallback((notification: NotificationRow) => {
    // TODO: Implement notification banner/toast
    console.log('🔔 Would show banner for:', notification.type);
  }, []);

  const retryConnection = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
    }
    setTimeout(() => {
      setupRealtimeSubscription();
    }, 1000);
  }, [channel, setupRealtimeSubscription]);

  useEffect(() => {
    if (user?.id) {
      setupRealtimeSubscription();
    }

    return () => {
      if (channel) {
        console.log('🔴 Cleaning up realtime subscription');
        channel.unsubscribe();
      }
    };
  }, [user?.id, setupRealtimeSubscription]);

  // Heartbeat to detect connection issues
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      // Check if we haven't received activity in 5 minutes
      if (lastActivity && Date.now() - lastActivity.getTime() > 5 * 60 * 1000) {
        console.log('🔄 No recent activity, checking connection...');
        // Could trigger a connection health check here
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, lastActivity]);

  const value: RealtimeContextType = {
    isConnected,
    connectionStatus,
    lastActivity,
    retryConnection,
  };

  return (
    <NotificationsRealtimeContext.Provider value={value}>
      {children}
    </NotificationsRealtimeContext.Provider>
  );
}; 