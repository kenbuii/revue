import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';
import MediaSearchInput from '@/components/MediaSearchInput';
import { MediaItem } from '@/lib/mediaService';

export default function Step2() {
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const mediaType = type as 'movie' | 'tv' | 'book';

  const getMediaTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return 'Movie';
      case 'tv': return 'TV Show';
      case 'book': return 'Book';
      default: return 'Media';
    }
  };

  const getMediaTypeEmoji = (type: string) => {
    switch (type) {
      case 'movie': return '🎬';
      case 'tv': return '📺';
      case 'book': return '📚';
      default: return '🎭';
    }
  };

  const handleMediaSelect = (media: MediaItem) => {
    console.log('📋 Media selected in step2:', media.title);
    setSelectedMedia(media);
    setShowConfirmation(true);
  };

  const handleContinue = () => {
    if (!selectedMedia) {
      Alert.alert('No Media Selected', 'Please select a media item to continue.');
      return;
    }

    // Navigate to step 3 with pre-filled media data
    router.push({
      pathname: '/(post_flow)/step3',
      params: { 
        // Media information
        mediaId: selectedMedia.id,
        title: selectedMedia.title,
        type: selectedMedia.type,
        year: selectedMedia.year || '',
        creator: selectedMedia.author || selectedMedia.director || '',
        genre: '', // Can be extended later
        image: selectedMedia.image || '',
        description: selectedMedia.description || '',
      }
    });
  };

  const handleGoBack = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
      setSelectedMedia(null);
    } else {
      router.back();
    }
  };

  const renderSelectedMedia = () => {
    if (!selectedMedia || !showConfirmation) return null;

    return (
      <View style={styles.selectedContainer}>
        <Text style={styles.selectedTitle}>Selected {getMediaTypeLabel(mediaType)}</Text>
        
        <View style={styles.selectedCard}>
          <Text style={styles.selectedEmoji}>{getMediaTypeEmoji(selectedMedia.type)}</Text>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedMediaTitle}>{selectedMedia.title}</Text>
            {selectedMedia.author && (
              <Text style={styles.selectedAuthor}>by {selectedMedia.author}</Text>
            )}
            {selectedMedia.year && (
              <Text style={styles.selectedYear}>{selectedMedia.year}</Text>
            )}
            {selectedMedia.description && (
              <Text style={styles.selectedDescription} numberOfLines={3}>
                {selectedMedia.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.confirmButtons}>
          <TouchableOpacity 
            style={styles.changeButton} 
            onPress={() => setShowConfirmation(false)}
          >
            <Text style={styles.changeButtonText}>Change Selection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.continueButton} 
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardDismissWrapper>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="chevron-back" size={24} color="#000" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>write a new revue</Text>
          <Text style={styles.stepTitle}>STEP 2</Text>
            <Text style={styles.subtitle}>
              search for the {getMediaTypeLabel(mediaType).toLowerCase()} you want to revue
            </Text>
          </View>

          {/* Search or Confirmation */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {showConfirmation ? (
              renderSelectedMedia()
            ) : (
              <View style={styles.searchSection}>
                <Text style={styles.searchTitle}>
                  {getMediaTypeEmoji(mediaType)} Find your {getMediaTypeLabel(mediaType).toLowerCase()}
                </Text>
                <Text style={styles.searchSubtitle}>
                  Search by title{mediaType === 'book' ? ', author' : ', director'}, or browse trending {getMediaTypeLabel(mediaType).toLowerCase()}s
          </Text>

                <MediaSearchInput
                  mediaType={mediaType}
                  placeholder={`Search ${getMediaTypeLabel(mediaType).toLowerCase()}s...`}
                  onMediaSelect={handleMediaSelect}
                  showPopular={true}
                  maxResults={15}
                  style={styles.searchInput}
                />
              </View>
            )}
        </ScrollView>
        </View>
      </KeyboardDismissWrapper>
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
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backText: {
    fontSize: 16,
    marginLeft: 5,
    color: '#000',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#142D0A',
    marginBottom: 8,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B9A7D',
    marginBottom: 8,
    letterSpacing: 2,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#2F4F4F',
    lineHeight: 24,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  scrollContent: {
    flex: 1,
  },
  searchSection: {
    flex: 1,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#142D0A',
    marginBottom: 8,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  searchSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  searchInput: {
    flex: 1,
    minHeight: 400, // Ensure enough space for results
  },
  selectedContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  selectedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#142D0A',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  selectedCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#142D0A',
    alignItems: 'center',
  },
  selectedEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  selectedInfo: {
    alignItems: 'center',
  },
  selectedMediaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#142D0A',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  selectedAuthor: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  selectedYear: {
    fontSize: 14,
    color: '#8B9A7D',
    marginBottom: 12,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  selectedDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'LibreBaskerville_700Bold',
  },
});
