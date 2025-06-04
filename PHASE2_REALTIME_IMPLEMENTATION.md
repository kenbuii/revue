# 🔴 Phase 2: Real-time Notifications Implementation
## Real-time Notifications Service (1 week)

---

## **📋 Overview**
Transform the notifications system from pull-based to real-time push-based using Supabase Realtime subscriptions.

### **Key Features**
- ⚡ Instant notification delivery
- 🔴 Live unread count updates  
- 📱 In-app notification banners
- 🌐 Connection status management
- 🔄 Graceful fallback handling

---

## **🎯 Implementation Steps**

### **Step 2.1: Enhanced Real-time Context**

#### **File: `contexts/NotificationsRealtimeContext.tsx`**
```typescript
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
```

---

### **Step 2.2: Enhanced Notifications Context**

#### **Update: `contexts/NotificationsContext.tsx`**
Add these methods to support real-time updates:

```typescript
// Add to NotificationsContextType interface
interface NotificationsContextType {
  // ... existing properties
  addNewNotification: (notification: NotificationRow) => void;
  updateUnreadCount: (updater: (count: number) => number) => void;
  showConnectionStatus: boolean;
}

// Add to NotificationsProvider component
const addNewNotification = useCallback((newNotification: NotificationRow) => {
  setNotifications(prev => {
    // Check if notification already exists to prevent duplicates
    const exists = prev.some(n => n.id === newNotification.id);
    if (exists) return prev;
    
    // Add to beginning of array (most recent first)
    return [newNotification, ...prev];
  });
}, []);

const updateUnreadCount = useCallback((updater: (count: number) => number) => {
  setUnreadCount(prev => {
    const newCount = updater(prev);
    return Math.max(0, newCount); // Ensure count never goes negative
  });
}, []);

// Add connection status visibility toggle
const [showConnectionStatus, setShowConnectionStatus] = useState(false);

// Add to context value
const value: NotificationsContextType = {
  // ... existing properties
  addNewNotification,
  updateUnreadCount,
  showConnectionStatus,
};
```

---

### **Step 2.3: In-App Notification Banner**

#### **File: `components/NotificationBanner.tsx`**
```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NotificationRow } from '../types/database';
import { notificationsService } from '../lib/notificationsService';

interface Props {
  notification: NotificationRow | null;
  onPress: () => void;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export const NotificationBanner: React.FC<Props> = ({
  notification,
  onPress,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(new Animated.Value(-100));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        hideBanner();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const hideBanner = () => {
    Animated.spring(slideAnim, {
      toValue: -100,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setVisible(false);
      onDismiss();
    });
  };

  if (!notification || !visible) return null;

  const displayText = notificationsService.getNotificationDisplayText(notification);
  const actorName = notification.actor_profile?.display_name || 
                   notification.actor_profile?.username || 
                   'Someone';

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={() => {
          hideBanner();
          onPress();
        }}
        activeOpacity={0.9}
      >
        {/* Actor Avatar */}
        <View style={styles.avatarContainer}>
          {notification.actor_profile?.avatar_url ? (
            <Image
              source={{ uri: notification.actor_profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Ionicons name="person" size={20} color="#666" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {actorName}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {displayText}
          </Text>
        </View>

        {/* Notification Type Icon */}
        <View style={styles.iconContainer}>
          {notification.type === 'like_post' && (
            <Ionicons name="heart" size={18} color="#FF6B6B" />
          )}
          {notification.type === 'comment_post' && (
            <Ionicons name="chatbubble" size={18} color="#4ECDC4" />
          )}
          {notification.type === 'follow_user' && (
            <Ionicons name="person-add" size={18} color="#45B7D1" />
          )}
          {notification.type === 'new_post_from_followed' && (
            <Ionicons name="document-text" size={18} color="#FFA07A" />
          )}
        </View>

        {/* Dismiss Button */}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={(e) => {
            e.stopPropagation();
            hideBanner();
          }}
        >
          <Ionicons name="close" size={16} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultAvatar: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#666',
    lineHeight: 16,
  },
  iconContainer: {
    marginRight: 8,
  },
  dismissButton: {
    padding: 4,
  },
});
```

---

### **Step 2.4: Connection Status Indicator**

#### **File: `components/ConnectionStatus.tsx`**
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationsRealtime } from '../contexts/NotificationsRealtimeContext';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionStatus } = useNotificationsRealtime();

  if (connectionStatus === 'connected') return null; // Don't show when all is well

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: 'wifi-outline' as const,
          text: 'Connecting...',
          color: '#FFA500',
          backgroundColor: '#FFF3E0',
        };
      case 'disconnected':
        return {
          icon: 'wifi-outline' as const,
          text: 'Disconnected',
          color: '#FF6B6B',
          backgroundColor: '#FFEBEE',
        };
      case 'error':
        return {
          icon: 'warning-outline' as const,
          text: 'Connection Error',
          color: '#FF6B6B',
          backgroundColor: '#FFEBEE',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
});
```

---

### **Step 2.5: Global Notification Banner Manager**

#### **File: `hooks/useNotificationBanner.ts`**
```typescript
import { useState, useCallback } from 'react';
import { NotificationRow } from '../types/database';

export const useNotificationBanner = () => {
  const [currentNotification, setCurrentNotification] = useState<NotificationRow | null>(null);

  const showBanner = useCallback((notification: NotificationRow) => {
    setCurrentNotification(notification);
  }, []);

  const hideBanner = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  return {
    currentNotification,
    showBanner,
    hideBanner,
  };
};
```

---

### **Step 2.6: Integration Updates**

#### **Update: `app/_layout.tsx`**
Add real-time provider and notification banner:

```typescript
import { NotificationsRealtimeProvider } from '../contexts/NotificationsRealtimeContext';
import { NotificationBanner } from '../components/NotificationBanner';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { useNotificationBanner } from '../hooks/useNotificationBanner';

// Inside RootLayoutNav component
const { currentNotification, showBanner, hideBanner } = useNotificationBanner();

// Wrap providers
<NotificationsProvider>
  <NotificationsRealtimeProvider>
    {/* ... existing layout ... */}
    
    {/* Add these components */}
    <ConnectionStatus />
    <NotificationBanner
      notification={currentNotification}
      onPress={() => {
        // Navigate to notifications screen
        // router.push('/(tabs)/notifications');
      }}
      onDismiss={hideBanner}
    />
  </NotificationsRealtimeProvider>
</NotificationsProvider>
```

#### **Update: `app/(tabs)/notifications.tsx`**
Add connection status display:

```typescript
import { ConnectionStatus } from '../../components/ConnectionStatus';
import { useNotificationsRealtime } from '../../contexts/NotificationsRealtimeContext';

// Inside component
const { isConnected, connectionStatus, retryConnection } = useNotificationsRealtime();

// Add to render
<View style={styles.container}>
  <ConnectionStatus />
  
  {/* Add retry button for connection errors */}
  {connectionStatus === 'error' && (
    <TouchableOpacity
      style={styles.retryButton}
      onPress={retryConnection}
    >
      <Text style={styles.retryText}>Retry Connection</Text>
    </TouchableOpacity>
  )}
  
  {/* ... existing notification list ... */}
</View>
```

---

## **🧪 Testing Phase 2**

### **Real-time Test Steps**
1. **Open two devices/simulators** with same app
2. **Log in as different users** on each device
3. **Create interaction** (like, comment, follow) on device A
4. **Verify real-time notification** appears on device B
5. **Check banner animation** and auto-dismiss
6. **Test connection states** by toggling airplane mode

### **Expected Results**
- ⚡ Notifications appear instantly without refresh
- 🔴 Unread count updates live
- 📱 Banner slides down smoothly
- 🌐 Connection status shows appropriately
- 🔄 Retry works when connection fails

---

## **📚 Next Steps**
Once Phase 2 is complete, you'll have:
- ✅ Real-time notification delivery
- ✅ In-app notification banners  
- ✅ Connection status management
- ✅ Graceful error handling

Ready for **Phase 3: Push Notifications Infrastructure**! 