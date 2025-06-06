import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Feather, AntDesign, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { router } from 'expo-router';
import { useBookmarks } from '@/contexts/BookmarksContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import HorizontalDragDropCarousel from '@/components/HorizontalDragDropCarousel';
import { MediaPreference } from '@/lib/userProfile';
import ProfileEditForm from '@/components/ProfileEditForm';
import { feedService, FeedPost } from '@/lib/feedService';

// Remove mock data - now using real data from feedService
export default function ProfileScreen() {
  const { bookmarkedPosts, removeBookmark } = useBookmarks();
  const { 
    profile, 
    mediaPreferences, 
    likedPosts, 
    loadingProfile, 
    loadingMedia, 
    loadingLikedPosts,
    refreshProfile,
    refreshMediaPreferences,
    removeMediaPreference,
    updateMediaPreferencesOrder
  } = useUserProfile();
  const { isAuthenticated } = useAuth();
  
  // State for recent revues
  const [recentRevues, setRecentRevues] = useState<FeedPost[]>([]);
  const [loadingRevues, setLoadingRevues] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Load user's recent posts
  useEffect(() => {
    if (isAuthenticated && profile?.user_id) {
      loadRecentRevues();
    }
  }, [isAuthenticated, profile?.user_id]);

  const loadRecentRevues = async () => {
    try {
      setLoadingRevues(true);
      console.log('📋 Loading user recent revues...');
      
      const userPosts = await feedService.getUserPosts(profile?.user_id, 10); // Load last 10 posts
      setRecentRevues(userPosts);
      
      console.log(`✅ Loaded ${userPosts.length} recent revues for user`);
    } catch (error) {
      console.error('❌ Error loading recent revues:', error);
    } finally {
      setLoadingRevues(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh profile data and recent revues
      await Promise.all([
        refreshProfile(),
        loadRecentRevues(),
      ]);
    } catch (error) {
      console.error('❌ Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCloseEditProfile = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    // Profile will be refreshed automatically through context
  };

  const handleAddToBookshelf = () => {
    router.push('/(tabs)/search');
  };

  const handleBookmarksPress = () => {
    router.push('/bookmarks');
  };

  const handleSettingsPress = () => {
    // Navigate to settings screen
    router.push('/settings');
  };

  const handleRevuePress = (post: FeedPost) => {
    // Navigate to post detail
    router.push({
      pathname: '/post/[id]' as const,
      params: { id: post.id }
    });
  };

  const handleMediaPress = (post: FeedPost) => {
    // Navigate to media detail
    router.push({
      pathname: '/media/[id]' as const,
      params: {
        id: post.media.id,
        title: post.media.title,
        type: post.media.type,
        year: '',
        image: post.media.cover,
        description: '',
      },
    });
  };

  const handleRemoveBookmark = (postId: string, postTitle: string, event: any) => {
    event.stopPropagation();
    
    Alert.alert(
      'Remove Bookmark',
      `Remove "${postTitle}" from your bookmarks?`,
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
              Alert.alert(
                'Bookmark Removed',
                `"${postTitle}" has been removed from your bookmarks.`,
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

  const formatPostDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004D00" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />
      
      {isEditingProfile ? (
        <ProfileEditForm 
          onClose={handleCloseEditProfile}
          onSuccess={handleSaveProfile}
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#004D00"
              colors={['#004D00']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="user" size={40} color="#888" />
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <View style={styles.nameContainer}>
                  <Text style={styles.name}>
                    {profile?.display_name || profile?.username || 'Anonymous User'}
                    <Text style={styles.username}>
                      {profile?.display_name ? ` @${profile.username}` : ''}
                    </Text>
                  </Text>
                </View>
                {profile?.bio && (
                  <Text style={styles.bio}>{profile.bio}</Text>
                )}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{recentRevues.length}</Text>
                    <Text style={styles.statLabel}>revues</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{likedPosts.length}</Text>
                    <Text style={styles.statLabel}>likes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{bookmarkedPosts.length}</Text>
                    <Text style={styles.statLabel}>saved</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Feather name="edit-2" size={20} color="#004D00" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
                <Feather name="settings" size={20} color="#004D00" />
              </TouchableOpacity>
            </View>
          </View>

          {/* My Bookshelf Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>MY BOOKSHELF</Text>
            {loadingMedia ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color="#004D00" />
                <Text style={styles.loadingSectionText}>Loading your bookshelf...</Text>
              </View>
            ) : mediaPreferences.length > 0 ? (
              <HorizontalDragDropCarousel<MediaPreference>
                items={mediaPreferences}
                onRemove={removeMediaPreference}
                onReorder={updateMediaPreferencesOrder}
                getItemId={(item: MediaPreference) => item.media_id}
                getItemTitle={(item: MediaPreference) => item.title}
                renderItem={(item: MediaPreference, isActive: boolean) => (
                  <TouchableOpacity 
                    style={styles.mediaCard}
                    onPress={() => router.push({
                      pathname: '/media/[id]' as const,
                      params: {
                        id: item.media_id,
                        title: item.title,
                        type: item.media_type,
                        year: item.year || '',
                        image: item.image_url || '',
                        description: item.description || '',
                      },
                    })}
                    disabled={isActive}
                  >
                    <Image 
                      source={{ uri: item.image_url || 'https://via.placeholder.com/130x180' }} 
                      style={styles.mediaCover} 
                    />
                    <Text style={styles.mediaAuthor} numberOfLines={2}>{item.title}</Text>
                  </TouchableOpacity>
                )}
                emptyStateMessage="No media preferences found"
                emptyStateSubtext="Add some favorites during onboarding or in your settings"
                removeConfirmTitle="Remove from Bookshelf"
                removeConfirmMessage="Remove &quot;{title}&quot; from your bookshelf?"
                removeSuccessMessage="&quot;{title}&quot; has been removed from your bookshelf."
                loading={loadingMedia}
              />
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No items in your bookshelf yet</Text>
                <Text style={styles.emptySectionSubtext}>
                  Add books, movies, and shows to personalize your profile
                </Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddToBookshelf}>
                  <AntDesign name="plus" size={16} color="#004D00" />
                  <Text style={styles.addButtonText}>Add to Bookshelf</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bookmarks Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>BOOKMARKS</Text>
              <TouchableOpacity style={styles.sectionButton} onPress={handleBookmarksPress}>
                <Feather name="bookmark" size={18} color="#004D00" />
              </TouchableOpacity>
            </View>
            {bookmarkedPosts.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {bookmarkedPosts.map(item => (
                  <View key={item.id} style={styles.bookmarkCardContainer}>
                    <TouchableOpacity 
                      style={styles.bookmarkCard}
                      onPress={() => router.push({
                        pathname: '/media/[id]' as const,
                        params: {
                          id: item.media.id,
                          title: item.media.title,
                          type: item.media.type,
                          year: '',
                          image: item.media.cover,
                          description: '',
                        },
                      })}
                    >
                      <Image source={{ uri: item.media.cover }} style={styles.mediaCover} />
                      <View style={styles.bookmarkTextContainer}>
                        <Text style={styles.mediaAuthor}>{item.media.title}</Text>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Remove button */}
                    <TouchableOpacity
                      style={styles.bookmarkRemoveButton}
                      onPress={(e) => handleRemoveBookmark(item.id, item.media.title, e)}
                    >
                      <View style={styles.bookmarkRemoveButtonBackground}>
                        <Ionicons name="close" size={12} color="white" />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No bookmarks yet</Text>
                <Text style={styles.emptySectionSubtext}>
                  Bookmark posts and media to save them for later
                </Text>
              </View>
            )}
          </View>

          {/* Favorite Vues Section - Now using real data */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>FAVORITE VUES</Text>
            {loadingLikedPosts ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color="#004D00" />
                <Text style={styles.loadingSectionText}>Loading your favorites...</Text>
              </View>
            ) : likedPosts.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {likedPosts.map(item => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.favoriteCard}
                    onPress={() => router.push({
                      pathname: '/media/[id]' as const,
                      params: {
                        id: item.media.id,
                        title: item.media.title,
                        type: item.media.type,
                        year: '',
                        image: item.media.cover,
                        description: '',
                      },
                    })}
                  >
                    <Image source={{ uri: item.cover }} style={styles.mediaCover} />
                    <Text style={styles.mediaAuthor}>{item.title}</Text>
                    <View style={styles.favoriteTextContainer}>
                      <Text style={styles.favoriteComment}>{item.comment}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No favorites yet</Text>
                <Text style={styles.emptySectionSubtext}>
                  Favorite a revue to see your saved ones!
                </Text>
              </View>
            )}
          </View>

          {/* Recent Revues - Now using real data from feedService */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>RECENT REVUES</Text>
            {loadingRevues ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color="#004D00" />
                <Text style={styles.loadingSectionText}>Loading your revues...</Text>
              </View>
            ) : recentRevues.length > 0 ? (
              recentRevues.map(post => (
                <TouchableOpacity 
                  key={post.id} 
                  style={styles.revueItem}
                  onPress={() => handleRevuePress(post)}
                >
                  <TouchableOpacity 
                    style={styles.revueImageContainer}
                    onPress={() => handleMediaPress(post)}
                  >
                    <Image 
                      source={{ uri: post.media.cover }} 
                      style={styles.revueCover}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <View style={styles.revueContent}>
                    <Text style={styles.revueTitle}>
                      {post.title || `${post.media.title}${post.media.progress ? `, ${post.media.progress}` : ''}`}
                    </Text>
                    <Text style={styles.revueText} numberOfLines={4}>
                      {post.content}
                    </Text>
                    <Text style={styles.revueTime}>
                      {formatPostDate(post.date)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No recent reviews yet</Text>
                <Text style={styles.emptySectionSubtext}>
                  Start writing reviews to see them here
                </Text>
                <TouchableOpacity 
                  style={styles.addButton} 
                  onPress={() => router.push('/(post_flow)/step1')}
                >
                  <AntDesign name="plus" size={16} color="#004D00" />
                  <Text style={styles.addButtonText}>Write a Revue</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.spacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingSectionText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#FFFDF6',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    backgroundColor: '#F2EFE6',
    borderRadius: 8,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 4,
    flex: 1,
  },
  username: {
    fontFamily: 'LibreBaskerville_400Regular',
    color: '#666',
  },
  bio: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'LibreBaskerville_400Regular',
    lineHeight: 15,
    marginBottom: 7,
    maxWidth: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  statItem: {
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontFamily: 'LibreBaskerville_700Bold',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
  },
  horizontalScrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  mediaCard: {
    width: 130,
    marginRight: 10,
  },
  mediaCover: {
    width: 130,
    height: 180,
    borderRadius: 8,
    marginBottom: 5,
  },
  mediaAuthor: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  favoriteCard: {
    width: 130,
    marginRight: 10,
  },
  favoriteTextContainer: {
    backgroundColor: '#F8F6ED',
    borderRadius: 8,
    padding: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  favoriteComment: {
    fontSize: 11,
    color: '#333',
    lineHeight: 14,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  revueItem: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    height: 130,
    marginBottom: 10,
  },
  revueImageContainer: {
    width: 60,
    marginRight: 15,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    height: '100%',
  },
  revueCover: {
    width: '100%',
    height: '100%',
  },
  revueContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  revueTitle: {
    fontSize: 14,
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 5,
    height: 20,
  },
  revueText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
    lineHeight: 18,
    height: 72,
  },
  revueTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'LibreBaskerville_400Regular',
    marginTop: 5,
    height: 15,
  },
  spacer: {
    height: 80,
  },
  bookmarkCard: {
    width: 140,
    marginRight: 12,
  },
  bookmarkCardContainer: {
    position: 'relative',
    width: 140,
    marginRight: 12,
  },
  bookmarkTextContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  bookmarkButton: {
    padding: 8,
    backgroundColor: '#F8F6ED',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginLeft: 12,
  },
  bookmarkRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    borderRadius: 12,
  },
  bookmarkRemoveButtonBackground: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySection: {
    alignItems: 'center',
    padding: 20,
  },
  emptySectionText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySectionSubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EFE6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#004D00',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  settingsButton: {
    padding: 8,
    backgroundColor: '#F2EFE6',
    borderRadius: 8,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  sectionButton: {
    padding: 8,
    backgroundColor: '#F2EFE6',
    borderRadius: 8,
  },
  statsText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  followingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  displayName: {
    fontSize: 15,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  handleText: {
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  followersText: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  buttonText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  editButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  bookmarksButtonText: {
    fontSize: 14,
    fontFamily: 'LibreBaskerville_700Bold',
  },
});
