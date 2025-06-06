import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/components/AppHeader';
import { useBookmarks } from '@/contexts/BookmarksContext';
import { communityRevuesService, MediaCommunityStats } from '@/lib/communityRevuesService';
import { mediaSearchService, MediaItem } from '@/lib/mediaService';

export default function MediaDetailScreen() {
  const router = useRouter();
  
  // Enhanced parameter handling
  const params = useLocalSearchParams();
  const mediaId = Array.isArray(params.id) ? params.id[0] : params.id || '';

  console.log('🎬 MediaDetailScreen params:', { params, mediaId });

  // Safely get bookmarks context with error handling
  let bookmarksContext;
  try {
    bookmarksContext = useBookmarks();
  } catch (error) {
    console.error('❌ useBookmarks failed:', error);
    // Provide fallback bookmarks context
    bookmarksContext = {
      isBookmarked: () => false,
      toggleBookmark: async () => false,
      bookmarkedPosts: [],
      addBookmark: async () => {},
      removeBookmark: async () => {},
      loading: false,
      refreshBookmarks: async () => {},
      error: 'Failed to load bookmarks context'
    };
  }
  
  const { isBookmarked: isPostBookmarked, toggleBookmark } = bookmarksContext;

  // Media data state
  const [mediaData, setMediaData] = useState<MediaItem | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Community data state
  const [communityData, setCommunityData] = useState<MediaCommunityStats | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);

  // Action states
  const [bookmarking, setBookmarking] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Enhanced parameter validation
  useEffect(() => {
    console.log('🔍 Media Detail useEffect triggered:', {
      mediaId,
      mediaIdLength: mediaId?.length,
      mediaIdType: typeof mediaId
    });
    
    if (!mediaId || mediaId.trim() === '') {
      console.error('❌ No valid media ID provided');
      setLoadingMedia(false);
      setMediaError('No media ID provided');
      return;
    }
    
    loadMediaData();
  }, [mediaId]);

  // Load community data when media data is available
  useEffect(() => {
    if (mediaData && mediaData.id) {
      loadCommunityData();
    } else {
      setLoadingCommunity(false);
    }
  }, [mediaData]);

  const loadMediaData = async () => {
    if (!mediaId) {
      setLoadingMedia(false);
      setMediaError('No media ID provided');
      return;
    }

    try {
      setLoadingMedia(true);
      setMediaError(null);
      
      console.log('🎬 Fetching media data for ID:', mediaId);
      const data = await mediaSearchService.getMediaById(mediaId);
      
      if (data) {
        setMediaData(data);
        console.log('✅ Media data loaded:', {
          id: data.id,
          title: data.title,
          type: data.type,
          hasImage: !!data.image
        });
      } else {
        console.error('❌ Media data not found for ID:', mediaId);
        
        // Check if we have navigation parameters to use as fallback
        const hasParams = params.title && params.type;
        if (hasParams) {
          console.log('📋 Using navigation parameters as fallback data');
          const fallbackData: MediaItem = {
            id: mediaId,
            title: Array.isArray(params.title) ? params.title[0] : params.title,
            type: (Array.isArray(params.type) ? params.type[0] : params.type) as 'movie' | 'tv' | 'book',
            year: params.year ? (Array.isArray(params.year) ? params.year[0] : params.year) : undefined,
            image: params.image ? (Array.isArray(params.image) ? params.image[0] : params.image) : undefined,
            description: params.description ? (Array.isArray(params.description) ? params.description[0] : params.description) : undefined,
            author: params.author ? (Array.isArray(params.author) ? params.author[0] : params.author) : undefined,
            rating: params.rating ? parseFloat(Array.isArray(params.rating) ? params.rating[0] : params.rating) : undefined,
            source: mediaId.startsWith('nyt_') ? 'nyt_bestsellers' : 'popular',
            originalId: mediaId.split('_').slice(1).join('_'),
          };
          
          setMediaData(fallbackData);
          console.log('✅ Fallback media data created from navigation params:', {
            id: fallbackData.id,
            title: fallbackData.title,
            type: fallbackData.type,
            hasImage: !!fallbackData.image
          });
        } else {
        setMediaError('Media not found');
        }
      }
    } catch (error) {
      console.error('❌ Error loading media data:', error);
      
      // Check if we have navigation parameters to use as fallback
      const hasParams = params.title && params.type;
      if (hasParams) {
        console.log('📋 Using navigation parameters as fallback after error');
        const fallbackData: MediaItem = {
          id: mediaId,
          title: Array.isArray(params.title) ? params.title[0] : params.title,
          type: (Array.isArray(params.type) ? params.type[0] : params.type) as 'movie' | 'tv' | 'book',
          year: params.year ? (Array.isArray(params.year) ? params.year[0] : params.year) : undefined,
          image: params.image ? (Array.isArray(params.image) ? params.image[0] : params.image) : undefined,
          description: params.description ? (Array.isArray(params.description) ? params.description[0] : params.description) : undefined,
          author: params.author ? (Array.isArray(params.author) ? params.author[0] : params.author) : undefined,
          rating: params.rating ? parseFloat(Array.isArray(params.rating) ? params.rating[0] : params.rating) : undefined,
          source: mediaId.startsWith('nyt_') ? 'nyt_bestsellers' : 'popular',
          originalId: mediaId.split('_').slice(1).join('_'),
        };
        
        setMediaData(fallbackData);
        console.log('✅ Fallback media data created from navigation params after error');
      } else {
      setMediaError(error instanceof Error ? error.message : 'Failed to load media data');
      }
    } finally {
      setLoadingMedia(false);
    }
  };

  const loadCommunityData = async () => {
    if (!mediaData?.id) {
      console.log('⚠️ No media data available for community loading');
      setLoadingCommunity(false);
      return;
    }
    
    try {
      setLoadingCommunity(true);
      console.log('👥 Loading community data for media:', mediaData.id);
      
      const data = await communityRevuesService.getMediaCommunityData(mediaData.id);
      setCommunityData(data);
      
      console.log('✅ Community data loaded:', {
        totalRevues: data.totalRevues,
        averageRating: data.averageRating,
        recentRevuesCount: data.recentRevues?.length || 0
      });
    } catch (error) {
      console.error('❌ Error loading community data:', error);
      // Set empty data on error to prevent rendering issues
      setCommunityData({
        totalRevues: 0,
        averageRating: 0,
        readingCount: 0,
        wantToReadCount: 0,
        recentRevues: [],
      });
    } finally {
      setLoadingCommunity(false);
    }
  };

  // Enhanced debug logging
  if (__DEV__) {
    console.log('📱 MediaDetailScreen State:', {
      rawParams: params,
      processedMediaId: mediaId,
      loadingMedia,
      mediaError,
      hasMediaData: !!mediaData,
      mediaTitle: mediaData?.title,
      loadingCommunity,
      hasCommunityData: !!communityData,
    });
  }

  // Enhanced loading state
  if (loadingMedia) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader 
          title="Loading..." 
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004D00" />
          <Text style={styles.loadingText}>Loading media details...</Text>
          {mediaId && (
            <Text style={styles.loadingSubtext}>Media ID: {mediaId}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Enhanced error state
  if (mediaError || !mediaData) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader 
          title="Error" 
          showBackButton={true}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Media Not Found</Text>
          <Text style={styles.errorMessage}>
            {mediaError || 'The requested media could not be loaded.'}
          </Text>
          {mediaId && (
            <Text style={styles.errorDetails}>Media ID: {mediaId}</Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={loadMediaData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.goBackButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Create a mock post object for bookmark functionality
  const createBookmarkPost = () => ({
    id: `media_${mediaData.id}`,
    user: { name: 'System', avatar: 'https://via.placeholder.com/40' },
    media: {
      id: mediaData.id,
      title: mediaData.title,
      type: mediaData.type,
      cover: mediaData.image || 'https://via.placeholder.com/120x160',
    },
    date: new Date().toISOString(),
    contentType: 'text' as const,
    content: `Bookmarked: ${mediaData.title}`,
    commentCount: 0,
    likeCount: 0,
    isBookmarked: true,
    isLiked: false,
  });

  const mockPost = createBookmarkPost();
  const isBookmarked = isPostBookmarked(mockPost.id);

  const getMediaTypeColor = (type: string) => {
    switch (type) {
      case 'movie': return '#FF6B6B';
      case 'tv': return '#4ECDC4';
      case 'book': return '#45B7D1';
      default: return '#8B9A7D';
    }
  };

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return 'film-outline';
      case 'tv': return 'tv-outline';
      case 'book': return 'book-outline';
      default: return 'help-outline';
    }
  };

  const getGenre = (type: string) => {
    // This is a simplified genre mapping - in a real app you'd get this from the API
    switch (type) {
      case 'movie': return 'Drama';
      case 'tv': return 'Sci-Fi';
      case 'book': return 'Fiction';
      default: return 'General';
    }
  };

  const getCapitalizedType = (type: string) => {
    if (!type || typeof type !== 'string' || type.length === 0) {
      return 'Media';
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Safe text helper to ensure strings are always wrapped
  const safeString = (value: any, fallback: string = '') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    return String(value);
  };

  // Safe rendering helper to prevent text errors
  const renderCommunityStats = () => {
    if (loadingCommunity) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#004D00" />
          <Text style={styles.loadingText}>Loading community stats...</Text>
        </View>
      );
    }

    const totalRevues = communityData?.totalRevues ?? 0;
    const readingCount = communityData?.readingCount ?? 0;
    const wantToReadCount = communityData?.wantToReadCount ?? 0;
    const averageRating = communityData?.averageRating ?? 0;

    return (
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => {
            if (totalRevues > 0) {
              router.push({
                pathname: '/media/[id]/community/revuers',
                params: { 
                  id: mediaData.id,
                  title: mediaData.title
                }
              });
            }
          }}
        >
          <Text style={styles.statNumber}>{totalRevues}</Text>
          <Text style={styles.statLabel}>revues</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => {
            if (readingCount > 0) {
              router.push({
                pathname: '/media/[id]/community/readers',
                params: { 
                  id: mediaData.id,
                  title: mediaData.title
                }
              });
            }
          }}
        >
          <Text style={styles.statNumber}>{readingCount}</Text>
          <Text style={styles.statLabel}>reading</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => {
            if (wantToReadCount > 0) {
              router.push({
                pathname: '/media/[id]/community/want-to-read',
                params: { 
                  id: mediaData.id,
                  title: mediaData.title
                }
              });
            }
          }}
        >
          <Text style={styles.statNumber}>{wantToReadCount}</Text>
          <Text style={styles.statLabel}>want to read</Text>
        </TouchableOpacity>

        {averageRating > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        )}
      </View>
    );
  };

  const handleBookmark = async () => {
    if (bookmarking || !mediaData) return;
    
    try {
      setBookmarking(true);
      console.log('🔖 Toggling bookmark for media:', mediaData.id);
      const result = await toggleBookmark(mockPost);
      console.log('Bookmark result:', result);
    } catch (error) {
      console.error('❌ Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to bookmark. Please try again.');
    } finally {
      setBookmarking(false);
    }
  };

  const handleCreatePost = () => {
    if (loadingMedia || !mediaData || bookmarking || sharing) return;
    
    console.log('📝 Creating post for media:', mediaData.id);
    try {
      router.push({
        pathname: '/(post_flow)/step1',
        params: {
          mediaId: mediaData.id,
          title: mediaData.title,
          type: mediaData.type,
          creator: mediaData.author || '',
          image: mediaData.image || '',
          // Pre-populate to skip directly to step 3 as per step1.tsx logic
        },
      });
    } catch (error) {
      console.error('❌ Error navigating to create post:', error);
      Alert.alert('Error', 'Failed to open post creation. Please try again.');
    }
  };

  const handleShare = async () => {
    if (sharing || !mediaData) return;
    
    try {
      setSharing(true);
      console.log('📤 Sharing media:', mediaData.title);
      
      const shareOptions = {
        message: `Check out "${mediaData.title}" on Revue!`,
        url: `revue://media/${mediaData.id}`, // Deep link for the app
        title: mediaData.title,
      };

      if (Platform.OS === 'ios') {
        await Share.share({
          message: shareOptions.message,
          url: shareOptions.url,
          title: shareOptions.title,
        });
      } else {
        await Share.share({
          message: `${shareOptions.message} ${shareOptions.url}`,
          title: shareOptions.title,
        });
      }
    } catch (error) {
      console.error('❌ Error sharing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage !== 'User did not share') {
        Alert.alert('Error', 'Failed to share. Please try again.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showBackButton={true}
        title={safeString(getCapitalizedType(mediaData.type))}
        rightComponent={
          <TouchableOpacity 
            onPress={handleShare} 
            style={[styles.headerButton, sharing && styles.disabledButton]}
            disabled={sharing || loadingMedia}
          >
            {sharing ? (
              <ActivityIndicator size={20} color="#666" />
            ) : (
              <Ionicons name="share-outline" size={24} color={sharing ? "#CCC" : "#666"} />
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.imageContainer}>
            {mediaData.image ? (
              <Image source={{ uri: mediaData.image }} style={styles.mediaImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: getMediaTypeColor(mediaData.type) }]}>
                <Ionicons name={getMediaTypeIcon(mediaData.type) as any} size={48} color="white" />
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.mediaTitle} numberOfLines={3}>{safeString(mediaData.title)}</Text>
            
            <View style={styles.metaContainer}>
              <View style={[styles.typeTag, { backgroundColor: getMediaTypeColor(mediaData.type) }]}>
                <Text style={styles.mediaType}>{safeString(mediaData.type, 'movie').toUpperCase()}</Text>
              </View>
              {mediaData.year ? (
                <Text style={styles.mediaYear}>{safeString(mediaData.year)}</Text>
              ) : null}
            </View>

            {mediaData.author ? (
              <Text style={styles.author}>by {safeString(mediaData.author)}</Text>
            ) : null}

            {mediaData.rating ? (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{mediaData.rating.toFixed(1)}</Text>
                <Text style={styles.ratingOutOf}>/ 10</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.primaryButton, 
              (loadingMedia || bookmarking || sharing) && styles.disabledPrimaryButton
            ]} 
            onPress={handleCreatePost}
            disabled={loadingMedia || bookmarking || sharing}
          >
            <Ionicons 
              name="create-outline" 
              size={20} 
              color={(loadingMedia || bookmarking || sharing) ? "#CCC" : "white"} 
            />
            <Text style={[
              styles.primaryButtonText,
              (loadingMedia || bookmarking || sharing) && styles.disabledPrimaryButtonText
            ]}>
              Create Revue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.secondaryButton, 
              isBookmarked && styles.bookmarkedButton,
              bookmarking && styles.disabledSecondaryButton
            ]} 
            onPress={handleBookmark}
            disabled={bookmarking || loadingMedia}
          >
            {bookmarking ? (
              <ActivityIndicator size={20} color={isBookmarked ? "#004D00" : "#666"} />
            ) : (
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={isBookmarked ? "#004D00" : "#666"} 
              />
            )}
            <Text style={[
              styles.secondaryButtonText, 
              isBookmarked && styles.bookmarkedText,
              bookmarking && styles.disabledSecondaryButtonText
            ]}>
              {bookmarking ? 'Saving...' : (isBookmarked ? 'Saved' : 'Save')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description Section */}
        {mediaData.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{safeString(mediaData.description)}</Text>
          </View>
        ) : null}

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Stats</Text>
          {renderCommunityStats()}
        </View>

        {/* Community Revues Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Revues</Text>
          {loadingCommunity ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#004D00" />
              <Text style={styles.loadingText}>Loading revues...</Text>
            </View>
          ) : communityData?.recentRevues && communityData.recentRevues.length > 0 ? (
            <View style={styles.revuesContainer}>
              {communityData.recentRevues.map((revue) => {
                const userName = safeString(revue.user.name, 'Anonymous');
                const reviewDate = revue.createdAt 
                  ? new Date(revue.createdAt).toLocaleDateString() 
                  : 'Unknown date';
                const reviewContent = safeString(revue.content, 'No content available');
                const likeCount = (revue.likeCount || 0).toString();
                const commentCount = (revue.commentCount || 0).toString();
                const hasRating = revue.rating && typeof revue.rating === 'number' && revue.rating > 0;

                return (
                  <View key={revue.id} style={styles.revueCard}>
                    <View style={styles.revueHeader}>
                      <Image 
                        source={{ uri: revue.user.avatar || 'https://via.placeholder.com/40' }} 
                        style={styles.userAvatar}
                      />
                      <View style={styles.revueUserInfo}>
                        <Text style={styles.reviewTitle}>{userName}</Text>
                        <Text style={styles.reviewDate}>{reviewDate}</Text>
                      </View>
                      {hasRating ? (
                        <View style={styles.revueRating}>
                          <Ionicons name="star" size={12} color="#FFD700" />
                          <Text style={styles.ratingText}>{revue.rating!.toFixed(1)}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.reviewText} numberOfLines={3}>
                      {reviewContent}
                    </Text>
                    <View style={styles.revueFooter}>
                      <View style={styles.revueStats}>
                        <Ionicons name="heart-outline" size={14} color="#999" />
                        <Text style={styles.communityCount}>{likeCount}</Text>
                        <Ionicons name="chatbubble-outline" size={14} color="#999" style={{ marginLeft: 12 }} />
                        <Text style={styles.communityCount}>{commentCount}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity 
                style={[
                  styles.viewAllButton,
                  (loadingCommunity || loadingMedia) && styles.disabledViewAllButton
                ]}
                disabled={loadingCommunity || loadingMedia}
              >
                <Text style={[
                  styles.viewAllButtonText,
                  (loadingCommunity || loadingMedia) && styles.disabledViewAllButtonText
                ]}>
                  View All Revues
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color={(loadingCommunity || loadingMedia) ? "#CCC" : "#004D00"} 
                />
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#E0E0E0" />
            <Text style={styles.emptyStateTitle}>No revues yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Be the first to share your thoughts about "{safeString(mediaData.title)}"
            </Text>
            <TouchableOpacity 
              style={[
                styles.createFirstButton,
                (loadingMedia || bookmarking || sharing) && styles.disabledCreateFirstButton
              ]} 
              onPress={handleCreatePost}
              disabled={loadingMedia || bookmarking || sharing}
            >
              <Text style={[
                styles.createFirstButtonText,
                (loadingMedia || bookmarking || sharing) && styles.disabledCreateFirstButtonText
              ]}>
                Write First Revue
              </Text>
            </TouchableOpacity>
          </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  content: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  heroSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  imageContainer: {
    marginRight: 16,
  },
  mediaImage: {
    width: 120,
    height: 180,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  imagePlaceholder: {
    width: 120,
    height: 180,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heroInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  mediaTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 4,
  },
  mediaType: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'LibreBaskerville_700Bold',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  mediaYear: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
    marginLeft: 8,
  },
  author: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 4,
    fontWeight: '600',
  },
  ratingOutOf: {
    fontSize: 14,
    color: '#999',
    marginLeft: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginBottom: 8,
    gap: 12,
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#004D00',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#004D00',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bookmarkedButton: {
    backgroundColor: '#E8F5E8',
    borderColor: '#004D00',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 6,
  },
  bookmarkedText: {
    color: '#004D00',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    lineHeight: 20,
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#004D00',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  createFirstButton: {
    backgroundColor: '#004D00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createFirstButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 30,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  loadingSubtext: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  revuesContainer: {
    padding: 20,
  },
  revueCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  revueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  revueUserInfo: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  revueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'LibreBaskerville_400Regular',
    lineHeight: 20,
  },
  revueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  revueStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityCount: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#666',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginTop: 16,
  },
  viewAllButtonText: {
    color: '#004D00',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#004D00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  goBackButton: {
    backgroundColor: '#004D00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledPrimaryButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  disabledPrimaryButtonText: {
    color: '#999999',
  },
  disabledSecondaryButton: {
    opacity: 0.6,
    backgroundColor: '#F0F0F0',
  },
  disabledSecondaryButtonText: {
    color: '#CCCCCC',
  },
  disabledCreateFirstButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  disabledCreateFirstButtonText: {
    color: '#999999',
  },
  disabledViewAllButton: {
    opacity: 0.6,
  },
  disabledViewAllButtonText: {
    color: '#CCCCCC',
  },
});