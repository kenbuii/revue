import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { router } from 'expo-router';
import { useBookmarks } from '@/contexts/BookmarksContext';

export default function BookmarksScreen() {
  const { bookmarkedPosts, removeBookmark } = useBookmarks();

  const handlePostPress = (post: any) => {
    // Navigate to media detail screen with media data, matching search screen navigation
    router.push({
      pathname: '/media/[id]' as const,
      params: {
        id: post.media.id || post.id,
        title: post.media.title || 'Unknown Title',
        type: post.media.type || 'media',
        year: '', // Bookmarks don't currently store year - could be enhanced
        image: post.media.cover || '',
        description: post.content || post.title || '',
        rating: '', // Bookmarks don't currently store rating - could be enhanced
        author: '', // Bookmarks don't currently store author - could be enhanced
      },
    });
  };

  const handleRemoveBookmark = (postId: string, event: any) => {
    event.stopPropagation();
    
    // Find the post to get its title for the confirmation dialog
    const post = bookmarkedPosts.find(p => p.id === postId);
    const title = post?.title || post?.media.title || 'this bookmark';
    
    Alert.alert(
      'Remove Bookmark',
      `Remove "${title}" from your bookmarks?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeBookmark(postId);
              // Success feedback
              Alert.alert(
                'Bookmark Removed',
                'The bookmark has been removed successfully.',
                [{ text: 'OK' }],
                { cancelable: true }
              );
            } catch (error) {
              console.error('Error removing bookmark:', error);
              Alert.alert('Error', 'Failed to remove bookmark. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <AppHeader 
          showBackButton={true}
          title="Bookmarks"
        />
      </View>
      
      <ScrollView style={styles.scrollContent}>
        {bookmarkedPosts.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconContainer}>
              <Feather name="bookmark" size={48} color="#ccc" />
            </View>
            <Text style={styles.emptyStateTitle}>No bookmarks yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start saving posts you want to read later by tapping the bookmark icon
            </Text>
          </View>
        ) : (
          <View style={styles.bookmarksContainer}>
            <Text style={styles.bookmarksCount}>
              {bookmarkedPosts.length} {bookmarkedPosts.length === 1 ? 'Bookmark' : 'Bookmarks'}
            </Text>
            
            {bookmarkedPosts.map((post) => (
              <TouchableOpacity 
                key={post.id} 
                style={styles.bookmarkItem}
                onPress={() => handlePostPress(post)}
              >
                <View style={styles.bookmarkImageContainer}>
                  <Image 
                    source={{ uri: post.media.cover || 'https://via.placeholder.com/80x100' }} 
                    style={styles.bookmarkCover}
                    resizeMode="cover"
                  />
                </View>
                
                <View style={styles.bookmarkContent}>
                  <View style={styles.bookmarkHeader}>
                    <View style={styles.bookmarkTitleContainer}>
                      <Text style={styles.bookmarkMediaTitle} numberOfLines={1}>
                        {post.media.title}
                      </Text>
                      <Text style={styles.bookmarkMediaType}>
                        {post.media.type?.toUpperCase() || 'MEDIA'}
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={(e) => handleRemoveBookmark(post.id, e)}
                    >
                      <Feather name="bookmark" size={20} color="#004D00" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.bookmarkMeta}>
                    <View style={styles.userInfo}>
                      <Image 
                        source={{ uri: post.user.avatar || 'https://via.placeholder.com/24' }} 
                        style={styles.userAvatar}
                      />
                      <Text style={styles.userName}>{post.user.name}</Text>
                    </View>
                    <Text style={styles.bookmarkDate}>{post.date}</Text>
                  </View>
                  
                  {(post.title || post.content) && (
                    <Text style={styles.bookmarkText} numberOfLines={3}>
                      {post.title || post.content}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  headerContainer: {
    backgroundColor: '#FFFDF6',
    zIndex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 120,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  bookmarksContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bookmarksCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  bookmarkItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  bookmarkImageContainer: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginRight: 16,
  },
  bookmarkCover: {
    width: '100%',
    height: '100%',
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookmarkTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  bookmarkMediaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  bookmarkMediaType: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  bookmarkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  userName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  bookmarkDate: {
    fontSize: 11,
    color: '#999',
  },
  bookmarkText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
}); 