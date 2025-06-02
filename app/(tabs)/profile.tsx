import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { router } from 'expo-router';
import { useBookmarks } from '@/contexts/BookmarksContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import DraggableMediaList from '@/components/DraggableMediaList';

// Mock data for sections that don't have backend yet
const favoriteVues = [
  { id: '1', title: 'Fantastic Mr. Fox', cover: 'https://m.media-amazon.com/images/M/MV5BOGUwYTU4NGEtNDM4MS00NDRjLTkwNmQtOTkwMWMyMjhmMjdlXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_FMjpg_UX1000_.jpg', comment: 'wes anderson hater but this one is forever going to be one of my favori...' },
  { id: '2', title: 'The Count of Monte Cristo', cover: 'https://m.media-amazon.com/images/I/51uLvJlKpNL.jpg', comment: 'wes anderson hater but this one is forever going to be one of my favori...' },
  { id: '3', title: 'Never Let Me Go', cover: 'https://m.media-amazon.com/images/I/71kwkajubgL._AC_UF1000,1000_QL80_.jpg', comment: 'wes anderson hater but this one is forever going to be one of my favori...' },
];

const recentRevues = [
  { 
    id: '1', 
    title: 'Never Let Me Go, Chapter 4',
    time: '4 days ago',
    content: 'suzanne collins got tired of us forgetting what fascism is... i\'m so tired of lorem epsom the lazy fox jumps over the moon and eats pie. Lorem Ipsum has been the industry\'s standard dum...',
    cover: 'https://m.media-amazon.com/images/I/71DgZ3LElXL.jpg'
  },
  { 
    id: '2', 
    title: 'Sunrise on the Reaping, Chapter 6',
    time: '4 days ago',
    content: 'suzanne collins got tired of us forgetting what fascism is... i\'m so tired of lorem epsom the lazy fox jumps over the moon and eats pie. Lorem Ipsum has been the industry\'s standard dum...',
    cover: 'https://prodimage.images-bn.com/pimages/9781546171461_p0_v5_s1200x630.jpg'
  },
];

export default function ProfileScreen() {
  const { bookmarkedPosts } = useBookmarks();
  const { isAuthenticated } = useAuth();
  const { 
    profile, 
    stats, 
    mediaPreferences, 
    recentReviews: userRecentReviews,
    loadingProfile, 
    loadingStats, 
    loadingMedia,
    profileError,
    refreshAll,
    removeMediaPreference,
    updateMediaPreferencesOrder
  } = useUserProfile();
  
  // Add bookmark removal handler
  const { removeBookmark } = useBookmarks();
  const [refreshing, setRefreshing] = React.useState(false);
  
  const handleRemoveBookmark = (postId: string, title: string) => {
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
          onPress: () => {
            removeBookmark(postId);
            // Optional: Add success feedback
            Alert.alert(
              'Bookmark Removed',
              'The bookmark has been removed successfully.',
              [{ text: 'OK' }],
              { cancelable: true }
            );
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };
  
  // Debug logging in development
  if (__DEV__) {
    console.log('🔍 Profile Screen Debug:', {
      isAuthenticated,
      hasProfile: !!profile,
      profileData: profile,
      profileFields: {
        id: profile?.id,
        username: profile?.username,
        display_name: profile?.display_name,
        bio: profile?.bio,
        avatar_url: profile?.avatar_url,
        onboarding_completed: profile?.onboarding_completed,
      },
      loadingProfile,
      profileError,
      statsData: stats,
      mediaPrefsCount: mediaPreferences.length,
      mediaPrefsData: mediaPreferences,
      loadingMedia
    });
  }
  
  const SettingsButton = () => (
    <TouchableOpacity 
      style={styles.settingsButton}
      onPress={() => router.push('../settings')}
    >
      <Feather name="settings" size={24} color="#000" />
    </TouchableOpacity>
  );

  // Handle case where user is not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <AppHeader rightComponent={<SettingsButton />} />
        </View>
        <View style={styles.unauthenticatedContainer}>
          <Text style={styles.unauthenticatedText}>Please sign in to view your profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (loadingProfile && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <AppHeader rightComponent={<SettingsButton />} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004D00" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state with fallback
  if (profileError && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <AppHeader rightComponent={<SettingsButton />} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshAll}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get user display data
  const displayName = profile?.display_name || 'User';
  const username = profile?.username ? `@${profile.username}` : '@username';
  const bio = profile?.bio || 'Welcome to my profile';
  const avatarUrl = profile?.avatar_url;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <AppHeader rightComponent={<SettingsButton />} />
      </View>
      <ScrollView 
        style={styles.scrollContent}
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
        {/* Profile Info */}
        <View style={styles.profileContainer}>
          <View style={styles.profileInfo}>
            <Image 
              style={styles.avatar} 
              source={{ 
                uri: avatarUrl || 'https://via.placeholder.com/100' 
              }} 
            />
            <View style={styles.userInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>
                  {displayName} <Text style={styles.username}>{username}</Text>
                </Text>
                <TouchableOpacity 
                  style={styles.bookmarkButton}
                  onPress={() => router.push('../bookmarks')}
                >
                  <Feather name="bookmark" size={20} color="#004D00" />
                </TouchableOpacity>
              </View>
              <Text style={styles.bio}>{bio}</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {loadingStats ? '...' : stats.reviewCount}
                  </Text>
                  <Text style={styles.statLabel}>revues</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {loadingStats ? '...' : stats.followers}
                  </Text>
                  <Text style={styles.statLabel}>followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {loadingStats ? '...' : stats.following}
                  </Text>
                  <Text style={styles.statLabel}>following</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Bookmarks Section */}
        {bookmarkedPosts.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>BOOKMARKS</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {bookmarkedPosts.map(post => (
                <TouchableOpacity 
                  key={post.id} 
                  style={styles.bookmarkCard}
                  onPress={() => router.push({
                    pathname: '/media/[id]' as const,
                    params: {
                      id: post.media.id || post.id,
                      title: post.media.title || 'Unknown Title',
                      type: post.media.type || 'media',
                      year: '', // Bookmarks don't currently store year
                      image: post.media.cover || '',
                      description: post.content || post.title || '',
                    },
                  })}
                >
                  <Image source={{ uri: post.media.cover }} style={styles.mediaCover} />
                  <Text style={styles.mediaAuthor}>{post.media.title}</Text>
                  <View style={styles.bookmarkTextContainer}>
                    <Text style={styles.bookmarkComment} numberOfLines={3}>
                      {post.title || post.content}
                    </Text>
                  </View>
                  
                  {/* Add X button overlay for bookmark removal */}
                  <TouchableOpacity
                    style={styles.bookmarkRemoveButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveBookmark(post.id, post.title || post.media.title || 'Bookmark');
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.bookmarkRemoveButtonBackground}>
                      <Feather name="x" size={14} color="white" />
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* On Vue Section - Now with drag-and-drop and remove functionality */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ON VUE</Text>
          {loadingMedia ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color="#004D00" />
              <Text style={styles.loadingSectionText}>Loading your media...</Text>
            </View>
          ) : (
            <DraggableMediaList
              mediaPreferences={mediaPreferences}
              onRemove={removeMediaPreference}
              onReorder={updateMediaPreferencesOrder}
              loading={loadingMedia}
            />
          )}
        </View>

        {/* Favorite Vues Section - Using mock data for now */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>FAVORITE VUES</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {favoriteVues.map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.favoriteCard}
                onPress={() => router.push('/media/1')}
              >
                <Image source={{ uri: item.cover }} style={styles.mediaCover} />
                <Text style={styles.mediaAuthor}>{item.title}</Text>
                <View style={styles.favoriteTextContainer}>
                  <Text style={styles.favoriteComment}>{item.comment}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Revues - Using mock data for now, will use userRecentReviews when posts table is ready */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>RECENT REVUES</Text>
          {recentRevues.length > 0 ? (
            recentRevues.map(revue => (
              <TouchableOpacity key={revue.id} style={styles.revueItem}>
                <View style={styles.revueImageContainer}>
                  <Image 
                    source={{ uri: revue.cover }} 
                    style={styles.revueCover}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.revueContent}>
                  <Text style={styles.revueTitle}>{revue.title}</Text>
                  <Text style={styles.revueText} numberOfLines={4}>{revue.content}</Text>
                  <Text style={styles.revueTime}>{revue.time}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No recent reviews yet</Text>
              <Text style={styles.emptySectionSubtext}>
                Start writing reviews to see them here
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.spacer} />
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
  settingsButton: {
    padding: 8,
    marginRight: -8,
  },
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  unauthenticatedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#004D00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  loadingSectionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptySection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySectionSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  profileContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    marginRight: 15,
    backgroundColor: '#E1E1E1',
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
    fontWeight: 'bold',
    marginBottom: 4,
    flex: 1,
  },
  username: {
    fontWeight: 'normal',
    color: '#666',
  },
  bio: {
    fontSize: 10,
    color: '#333',
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
    fontWeight: 'bold',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 10,
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
    fontWeight: 'bold',
    marginBottom: 5,
    height: 20,
  },
  revueText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    height: 72,
  },
  revueTime: {
    fontSize: 12,
    color: '#999',
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
  bookmarkTextContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  bookmarkComment: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
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
    top: 0,
    right: 0,
    padding: 4,
    borderRadius: 12,
  },
  bookmarkRemoveButtonBackground: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
