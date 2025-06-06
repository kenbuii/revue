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
import { supabaseAuth } from '@/lib/supabase';

interface MediaData {
  id: string;
  title: string;
  media_type: string;
  author?: string;
  description?: string;
  cover_image_url?: string;
  publication_date?: string;
  average_rating?: number;
  total_ratings?: number;
  source?: 'database' | 'params' | 'api';
}

export default function MediaDetailScreen() {
  const router = useRouter();
  
  // Debug the params to see if there's an issue
  let params;
  try {
    console.log('🔍 About to call useLocalSearchParams...');
    params = useLocalSearchParams();
    console.log('✅ useLocalSearchParams successful:', params);
  } catch (error) {
    console.error('❌ useLocalSearchParams failed:', error);
    params = {};
  }
  
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
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Community data state
  const [communityData, setCommunityData] = useState<MediaCommunityStats | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);

  // Get media ID from params
  const mediaId = (params.id as string) || '';

  // Extract param values to stabilize them (prevent infinite re-renders)
  const paramTitle = params.title as string;
  const paramImage = params.image as string;
  const paramAuthor = params.author as string;
  const paramType = params.type as string;
  const paramDescription = params.description as string;
  const paramYear = params.year as string;
  const paramRating = params.rating as string;

  // Enhanced: Try to construct media data from URL params first
  useEffect(() => {
    if (mediaId) {
      // First, try to use URL params if we have them (from Search or enhanced Feed navigation)
      // Use extracted param values to avoid infinite re-renders
      const hasUrlParams = paramTitle || paramImage || paramAuthor;
      
      if (hasUrlParams) {
        console.log('📋 Using URL params for media data');
        const mediaFromParams: MediaData = {
          id: mediaId,
          title: paramTitle || 'Unknown Title',
          media_type: paramType || 'unknown',
          author: paramAuthor || undefined,
          description: paramDescription || undefined,
          cover_image_url: paramImage || undefined,
          publication_date: paramYear ? `${paramYear}-01-01` : undefined,
          average_rating: paramRating ? Number(paramRating) : undefined,
          total_ratings: undefined,
          source: 'params'
        };
        
        setMediaData(mediaFromParams);
        setLoadingMedia(false);
        setMediaError(null);
        
        console.log('✅ Media data set from URL params:', mediaFromParams.title);
      } else {
        // Fallback to database lookup
        console.log('📊 No URL params, falling back to database lookup');
        loadMediaDetails();
      }
    } else {
      setLoadingMedia(false);
      setMediaError('No media ID provided');
    }
  }, [mediaId]); // FIXED: Only depend on mediaId, not params object

  // Load community data when media data is available
  useEffect(() => {
    if (mediaData && mediaData.id) {
      loadCommunityData();
    } else {
      setLoadingCommunity(false);
    }
  }, [mediaData]);

  const loadMediaDetails = async () => {
    try {
      setLoadingMedia(true);
      setMediaError(null);
      
      console.log('📱 Loading media details from database for:', mediaId);
      
      // Make direct request to get media details
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      const session = await supabaseAuth.getSession();
      const token = session.data.session?.access_token || supabaseAnonKey;

      const response = await fetch(`${supabaseUrl}/rest/v1/media_items?id=eq.${mediaId}`, {
        headers: {
          'apikey': supabaseAnonKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load media: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        setMediaData({ ...data[0], source: 'database' });
        console.log('✅ Media details loaded from database:', data[0].title);
      } else {
        // Final fallback: Try to use partial URL params even if incomplete
        if (paramTitle) {
          console.log('⚠️ Database lookup failed, using partial URL params as fallback');
          const fallbackMedia: MediaData = {
            id: mediaId,
            title: paramTitle || 'Unknown Title',
            media_type: paramType || 'unknown',
            author: paramAuthor || undefined,
            description: paramDescription || undefined,
            cover_image_url: paramImage || undefined,
            source: 'params'
          };
          setMediaData(fallbackMedia);
        } else {
          setMediaError('Media not found in database and no URL params available');
        }
      }
    } catch (err: any) {
      console.error('❌ Error loading media details:', err);
      
      // Final fallback: Try URL params if database fails
      if (paramTitle) {
        console.log('🔄 Database error, falling back to URL params');
        const fallbackMedia: MediaData = {
          id: mediaId,
          title: paramTitle || 'Unknown Title',
          media_type: paramType || 'unknown',
          author: paramAuthor || undefined,
          description: paramDescription || undefined,
          cover_image_url: paramImage || undefined,
          source: 'params'
        };
        setMediaData(fallbackMedia);
      } else {
        setMediaError(err.message || 'Failed to load media details');
      }
    } finally {
      setLoadingMedia(false);
    }
  };

  const loadCommunityData = async () => {
    if (!mediaData?.id) return;
    
    try {
      setLoadingCommunity(true);
      const data = await communityRevuesService.getMediaCommunityData(mediaData.id);
      setCommunityData(data);
    } catch (error) {
      console.error('Error loading community data:', error);
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

  // Debug logging to help diagnose parameter issues
  if (__DEV__) {
    console.log('📱 MediaDetailScreen state:', {
      rawParams: params,
      mediaId,
      loadingMedia,
      mediaData: mediaData ? { 
        id: mediaData.id, 
        title: mediaData.title, 
        type: mediaData.media_type,
        hasImage: !!mediaData.cover_image_url,
        source: mediaData.source
      } : null,
    });
  }

  // Show loading state
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
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
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
          <TouchableOpacity style={styles.retryButton} onPress={loadMediaDetails}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Create a mock post object for bookmark functionality
  const mockPost = {
    id: `media_${mediaData.id}`,
    user: { name: 'User', avatar: 'https://via.placeholder.com/40' },
    media: {
      id: mediaData.id,
      title: mediaData.title,
      type: mediaData.media_type,
      cover: mediaData.cover_image_url || 'https://via.placeholder.com/120x160',
    },
    date: new Date().toISOString(),
    contentType: 'text' as const,
    content: `Bookmarked: ${mediaData.title}`,
    commentCount: 0,
    likeCount: 0,
    isBookmarked: true,
    isLiked: false,
  };

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
    try {
      const newBookmarkState = await toggleBookmark(mockPost);
      console.log('Bookmark toggled:', newBookmarkState);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  const handleCreatePost = () => {
    console.log('Create post pressed for media:', mediaData.title);
    router.push({
      pathname: '/(post_flow)/step1',
      params: {
        preselectedMedia: JSON.stringify({
          id: mediaData.id,
          title: mediaData.title,
          type: mediaData.media_type,
          author: mediaData.author,
          image: mediaData.cover_image_url,
          description: mediaData.description,
        })
      }
    });
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        message: `Check out ${mediaData.title} on Revue!`,
        url: `https://revue.app/media/${mediaData.id}`,
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getMediaTypeEmoji = (type: string) => {
    switch (type) {
      case 'movie': return '🎬';
      case 'tv': 
      case 'tv_show': return '📺';
      case 'book': return '📚';
      case 'audiobook': return '🎧';
      case 'podcast': return '🎙️';
      default: return '🎭';
    }
  };

  const formatMediaType = (type: string) => {
    switch (type) {
      case 'tv_show': return 'TV Show';
      case 'audiobook': return 'Audiobook';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showBackButton={true}
        title={safeString(getCapitalizedType(mediaData.media_type))}
        rightComponent={
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="#666" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.imageContainer}>
            {mediaData.cover_image_url ? (
              <Image source={{ uri: mediaData.cover_image_url }} style={styles.mediaImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: getMediaTypeColor(mediaData.media_type) }]}>
                <Text style={styles.placeholderEmoji}>
                  {getMediaTypeEmoji(mediaData.media_type)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.mediaTitle} numberOfLines={3}>{safeString(mediaData.title)}</Text>
            
            <View style={styles.metaContainer}>
              <View style={[styles.typeTag, { backgroundColor: getMediaTypeColor(mediaData.media_type) }]}>
                <Text style={styles.mediaType}>{safeString(formatMediaType(mediaData.media_type))}</Text>
              </View>
              {mediaData.publication_date && (
                <Text style={styles.mediaYear}>{safeString(new Date(mediaData.publication_date).getFullYear())}</Text>
              )}
            </View>

            {mediaData.author && (
              <Text style={styles.author}>by {safeString(mediaData.author)}</Text>
            )}

            {mediaData.average_rating && mediaData.average_rating > 0 && (
              <View style={styles.ratingContainer}>
                <Text style={styles.rating}>⭐ {safeString(mediaData.average_rating.toFixed(1))}</Text>
                {mediaData.total_ratings && (
                  <Text style={styles.ratingCount}>({safeString(mediaData.total_ratings.toString())} rating{safeString(mediaData.total_ratings !== 1 ? 's' : '')})</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreatePost}>
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Write a Review</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, isBookmarked && styles.bookmarkedButton]} 
            onPress={handleBookmark}
          >
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={20} 
              color={isBookmarked ? "#004D00" : "#666"} 
            />
            <Text style={[styles.secondaryButtonText, isBookmarked && styles.bookmarkedText]}>
              {isBookmarked ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description Section */}
        {mediaData.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{safeString(mediaData.description)}</Text>
          </View>
        )}

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
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllButtonText}>View All Revues</Text>
                <Ionicons name="chevron-forward" size={16} color="#004D00" />
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#E0E0E0" />
            <Text style={styles.emptyStateTitle}>No revues yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Be the first to share your thoughts about "{safeString(mediaData.title)}"
            </Text>
            <TouchableOpacity style={styles.createFirstButton} onPress={handleCreatePost}>
              <Text style={styles.createFirstButtonText}>Write First Revue</Text>
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
  ratingCount: {
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
  placeholderEmoji: {
    fontSize: 48,
    color: 'white',
  },
});