import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

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

  // TODO: Implement fetch from Supabase when backend is ready
  // useEffect(() => {
  //   const fetchNotifications = async () => {
  //     // Get user notifications from Supabase
  //     // const { data, error } = await supabase
  //     //   .from('notifications')
  //     //   .select('*')
  //     //   .order('created_at', { ascending: false });
  //   };
  //   fetchNotifications();
  // }, []);

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    // Review notification
    if (item.type === 'review') {
      return (
        <View style={styles.notificationItem}>
          <View style={styles.notificationHeader}>
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationText}>
                <Text style={styles.username}>{item.user.name}</Text> is revuing{' '}
                <Text style={styles.highlight}>{item.content.title}</Text> {item.content.details}
              </Text>
              <Text style={styles.timestamp}>{item.content.time}</Text>
            </View>
            <TouchableOpacity style={styles.menuButton}>
              <Feather name="more-horizontal" size={20} color="black" />
            </TouchableOpacity>
          </View>
          
          {item.hasPostTitle && (
            <View style={styles.postContainer}>
              <Text style={styles.postTitle}>{item.postTitle}</Text>
              <Text style={styles.postContent}>{item.postContent}</Text>
              
              <View style={styles.postFooter}>
                <View style={styles.footerItem}>
                  <Feather name="message-circle" size={16} color="#555" />
                  <Text style={styles.footerText}>{item.commentsCount} comments</Text>
                </View>
                <View style={styles.footerItem}>
                  <Feather name="heart" size={16} color="#555" />
                  <Text style={styles.footerText}>{item.likesCount} likes</Text>
                </View>
                <TouchableOpacity style={styles.footerItem}>
                  <Feather name="bookmark" size={16} color="#555" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <Image source={{ uri: item.content.image }} style={styles.mediaImage} />
        </View>
      );
    }
    
    // Comment notification
    if (item.type === 'comment') {
      return (
        <View style={styles.notificationItem}>
          <View style={styles.notificationRow}>
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            <View style={styles.notificationContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.username}>{item.user.name}</Text>
                <Text style={styles.timestamp}>{item.content.time}</Text>
              </View>
              <Text style={styles.commentText}>commented on your revue</Text>
              <Text style={styles.commentContent}>{item.content.comment}</Text>
            </View>
            <Image source={{ uri: item.content.image }} style={styles.smallMediaImage} />
          </View>
        </View>
      );
    }
    
    // Like notification
    if (item.type === 'like') {
      return (
        <View style={styles.notificationItem}>
          <View style={styles.notificationRow}>
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            <View style={styles.notificationContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.username}>{item.user.name}</Text>
                <Text style={styles.timestamp}>{item.content.time}</Text>
              </View>
              <Text style={styles.commentText}>{item.content.action}</Text>
            </View>
            <Image source={{ uri: item.content.image }} style={styles.smallMediaImage} />
          </View>
        </View>
      );
    }
    
    return null;
  };

  return (
    <>
      {/* Hide the default header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container}>
        <View style={styles.topSpacer} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#4CAF50" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight} />
        </View>

        <FlatList
          data={notificationData}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
    height: 0, // Add extra spacing at the top
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    marginBottom: 10, // Increased from 10 to 20
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backText: {
    fontSize: 16,
    marginLeft: 2,
    color: '#4CAF50',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 30,
    width: 80,
  },
  headerRight: {
    width: 70, // For balance with back button
  },
  listContainer: {
    padding: 16,
    paddingTop: 10,
  },
  notificationItem: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    paddingBottom: 20,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  },
  username: {
    fontWeight: '600',
  },
  highlight: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  menuButton: {
    padding: 5,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 10,
  },
  smallMediaImage: {
    width: 50,
    height: 70,
    borderRadius: 6,
    marginLeft: 10,
  },
  postContainer: {
    marginLeft: 52,
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  commentContent: {
    fontSize: 14,
    marginTop: 4,
    color: '#333',
  },
});
