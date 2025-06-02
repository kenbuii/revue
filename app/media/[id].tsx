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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/components/AppHeader';
import { useBookmarks } from '@/contexts/BookmarksContext';

export default function MediaDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isBookmarked: isPostBookmarked, toggleBookmark } = useBookmarks();

  // Parse media data from URL params with safe defaults
  const mediaData = {
    id: (params.id as string) || 'unknown',
    title: (params.title as string) || 'Unknown Title',
    type: (params.type as 'movie' | 'tv' | 'book') || 'movie',
    year: (params.year as string) || '',
    image: (params.image as string) || '',
    description: (params.description as string) || '',
    rating: params.rating ? parseFloat(params.rating as string) : undefined,
    author: (params.author as string) || '',
  };

  // Debug logging to help diagnose parameter issues
  if (__DEV__) {
    console.log('📱 MediaDetailScreen received params:', {
      rawParams: params,
      parsedMediaData: mediaData,
    });
  }

  // Create a mock post object for bookmark functionality
  const mockPost = {
    id: `media_${mediaData.id}`,
    user: { name: 'User', avatar: 'https://via.placeholder.com/40' },
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

  const handleBookmark = async () => {
    try {
      const newBookmarkState = await toggleBookmark(mockPost);
      const message = newBookmarkState 
        ? `"${mediaData.title}" has been added to your bookmarks.`
        : `"${mediaData.title}" has been removed from your bookmarks.`;
      
      Alert.alert(
        newBookmarkState ? 'Added to bookmarks' : 'Removed from bookmarks',
        message
      );
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark. Please try again.');
    }
  };

  const handleCreatePost = () => {
    // Navigate to step3 of post_flow with pre-filled media information
    router.push({
      pathname: '/(post_flow)/step3',
      params: {
        title: mediaData.title,
        creator: mediaData.author || 'Unknown',
        type: mediaData.type,
        year: mediaData.year || '',
        genre: getGenre(mediaData.type),
        mediaId: mediaData.id,
        image: mediaData.image || '',
        // Add any other relevant fields that step3 expects
      },
    });
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        message: `Check out "${mediaData.title}" ${mediaData.author ? `by ${mediaData.author}` : ''} on Revue!`,
        url: `https://revue.app/media/${mediaData.id}`, // This would be your actual app URL
      };

      if (Platform.OS === 'ios') {
        // Use native iOS share sheet
        await Share.share({
          message: shareContent.message,
          url: shareContent.url,
        });
      } else {
        // Android fallback
        await Share.share({
          message: `${shareContent.message} ${shareContent.url}`,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Share Error', 'Unable to share this content. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showBackButton={true}
        title={getCapitalizedType(mediaData.type)}
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
            {mediaData.image ? (
              <Image source={{ uri: mediaData.image }} style={styles.mediaImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: getMediaTypeColor(mediaData.type) }]}>
                <Ionicons name={getMediaTypeIcon(mediaData.type) as any} size={48} color="white" />
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.title} numberOfLines={3}>{mediaData.title}</Text>
            
            <View style={styles.metaContainer}>
              <View style={[styles.typeTag, { backgroundColor: getMediaTypeColor(mediaData.type) }]}>
                <Text style={styles.typeTagText}>{mediaData.type.toUpperCase()}</Text>
              </View>
              {mediaData.year && <Text style={styles.year}>{mediaData.year}</Text>}
            </View>

            {mediaData.author && (
              <Text style={styles.author}>by {mediaData.author}</Text>
            )}

            {mediaData.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{mediaData.rating.toFixed(1)}</Text>
                <Text style={styles.ratingOutOf}>/ 10</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreatePost}>
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Create Revue</Text>
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
            <Text style={styles.description}>{mediaData.description}</Text>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Revues</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Reading</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Want to Read</Text>
            </View>
          </View>
        </View>

        {/* Related Posts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Revues</Text>
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color="#E0E0E0" />
            <Text style={styles.emptyStateTitle}>No revues yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Be the first to share your thoughts about "{mediaData.title}"
            </Text>
            <TouchableOpacity style={styles.createFirstButton} onPress={handleCreatePost}>
              <Text style={styles.createFirstButtonText}>Write First Revue</Text>
            </TouchableOpacity>
          </View>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 28,
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
  typeTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  year: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
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
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
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
    color: '#004D00',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E8E8',
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
});