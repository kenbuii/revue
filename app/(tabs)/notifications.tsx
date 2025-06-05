import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, FlatList, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Notification } from '@/lib/notificationsService';

// Define types for notification data
interface NotificationUser {
  name: string;
  avatar: string;
}

interface ReviewNotification {
  id: string;
  type: 'review';
  user: NotificationUser;
  content: {
    title: string;
    details: string;
    image: string;
    time: string;
  };
  hasPostTitle: boolean;
  postTitle?: string;
  postContent?: string;
  commentsCount?: number;
  likesCount?: number;
}

interface CommentNotification {
  id: string;
  type: 'comment';
  user: NotificationUser;
  content: {
    comment: string;
    time: string;
    image: string;
  };
}

interface LikeNotification {
  id: string;
  type: 'like';
  user: NotificationUser;
  content: {
    action: string;
    time: string;
    image: string;
  };
}

type NotificationItem = ReviewNotification | CommentNotification | LikeNotification;

// Mock data for notifications
// TODO: Replace with data from Supabase when implementing backend
const notificationData: NotificationItem[] = [
  {
    id: '1',
    type: 'review',
    user: {
      name: 'kristine',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    content: {
      title: 'GILMORE GIRLS',
      details: 'show @ S1E4',
      image: 'https://deadline.com/wp-content/uploads/2016/04/gilmore-girls-e1461599887367.jpg',
      time: 'September 16',
    },
    hasPostTitle: true,
    postTitle: 'Optional Post Title',
    postContent: 'user post/content lorem ipsum Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.\nWhy do we use it?\nIt is a long established fact that a reader will be distracted by the...',
    commentsCount: 3,
    likesCount: 12,
  },
  {
    id: '2',
    type: 'comment',
    user: {
      name: 'maria',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    },
    content: {
      comment: 'how many times has jk rowing been cancelled now',
      time: '2 hours ago',
      image: 'https://upload.wikimedia.org/wikipedia/en/6/6b/Harry_Potter_and_the_Philosopher%27s_Stone_Book_Cover.jpg',
    },
  },
  {
    id: '3',
    type: 'like',
    user: {
      name: 'maria',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    },
    content: {
      action: 'liked your revue',
      time: '2 hours ago',
      image: 'https://upload.wikimedia.org/wikipedia/en/6/6b/Harry_Potter_and_the_Philosopher%27s_Stone_Book_Cover.jpg',
    },
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    hasMore,
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    getDisplayText,
    formatTime
  } = useNotifications();

  // Local state for UI
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Mark notification as read when tapped
  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      await markAsRead([notification.id]);
    }

    // Navigate based on notification type
    // TODO: Implement proper navigation based on your app's routing structure
    console.log('Notification tapped:', notification.type, notification.entity_id);
    
    // switch (notification.type) {
    //   case 'like_post':
    //   case 'comment_post':
    //   case 'new_post_from_followed':
    //     // Navigate to post detail
    //     router.push(`/post/${notification.entity_id}`);
    //     break;
    //   case 'follow_user':
    //     // Navigate to user profile
    //     router.push(`/profile/${notification.actor_id}`);
    //     break;
    //   case 'like_comment':
    //   case 'reply_comment':
    //     // Navigate to post containing the comment
    //     const postId = notification.metadata?.post_id;
    //     if (postId) {
    //       router.push(`/post/${postId}`);
    //     }
    //     break;
    //   default:
    //     console.log('Unknown notification type:', notification.type);
    // }
  };

  // Handle load more when reaching end of list
  const handleEndReached = () => {
    if (hasMore && !isLoading) {
      loadMoreNotifications();
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0) {
      await markAllAsRead();
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.read_at;
    const displayText = getDisplayText(item);
    const timeText = formatTime(item.created_at);

      return (
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          isUnread && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationRow}>
          <Image 
            source={{ uri: item.actor_avatar_url }} 
            style={styles.avatar} 
          />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationText}>
              {displayText}
              </Text>
            <Text style={styles.timestamp}>{timeText}</Text>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
      );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="bell" size={48} color="#CCC" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        When someone likes or comments on your reviews, you'll see it here.
      </Text>
        </View>
      );

  const renderLoadingFooter = () => {
    if (!isLoading || notifications.length === 0) return null;
    
      return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#004D00" />
        <Text style={styles.loadingText}>Loading more...</Text>
        </View>
      );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {unreadCount > 0 && (
        <Text style={styles.unreadCountText}>
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );

  return (
    <>
      {/* Hide the default header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container}>
        <View style={styles.topSpacer} />
        
        <AppHeader showBackButton={false} />

        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={notifications.length === 0 ? styles.emptyListContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshNotifications}
              tintColor="#004D00"
              colors={['#004D00']}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.1}
          ListHeaderComponent={notifications.length > 0 ? renderHeader : null}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          ListFooterComponent={renderLoadingFooter}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        {/* Initial loading indicator */}
        {isLoading && notifications.length === 0 && (
          <View style={styles.initialLoadingContainer}>
            <ActivityIndicator size="large" color="#004D00" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  topSpacer: {
    height: 0,
  },
  listContainer: {
    padding: 16,
    paddingTop: 10,
  },
  emptyListContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 10,
  },
  headerContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#004D00',
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  unreadCountText: {
    fontSize: 14,
    color: '#666',
  },
  notificationItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  unreadNotification: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderBottomWidth: 0,
    marginBottom: 12,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  timestamp: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#004D00',
    marginLeft: 8,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  initialLoadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -50 }],
  },
});
