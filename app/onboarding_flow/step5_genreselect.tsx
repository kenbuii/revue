import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, FlatList, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { mediaSearchService, MediaItem } from '@/lib/mediaService';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';

export default function Step5GenreSelectScreen() {
  const { saveOnboardingData } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [popularItems, setPopularItems] = useState<MediaItem[]>([]);

  // Load popular items on mount
  useEffect(() => {
    const items = mediaSearchService.getPopularItems();
    setPopularItems(items);
  }, []);

  // Search function with debouncing
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await mediaSearchService.searchMedia(searchText);
        setSearchResults(results);
        setHasSearched(true);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('Search Error', 'Failed to search media. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchText]);

  const handleMediaSelect = (media: MediaItem) => {
    if (selectedMedia.find(item => item.id === media.id)) {
      // Remove if already selected
      setSelectedMedia(selectedMedia.filter(item => item.id !== media.id));
    } else if (selectedMedia.length < 9) {
      // Add if under limit
      setSelectedMedia([...selectedMedia, media]);
    } else {
      Alert.alert('Limit Reached', 'You can select up to 9 media items.');
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    setSelectedMedia(selectedMedia.filter(item => item.id !== mediaId));
  };

  const handleNext = async () => {
    // Save selected media to onboarding data
    await saveOnboardingData({
      selectedMedia: selectedMedia,
      step: 5
    });
    
    router.push('/onboarding_flow/step6_final');
  };

  const handleBack = () => {
    router.back();
  };

  const handleTestNext = () => {
    router.push('/onboarding_flow/step6_final');
  };

  const getMediaTypeColor = (type: string) => {
    switch (type) {
      case 'movie': return '#FF6B6B';
      case 'tv': return '#4ECDC4';
      case 'book': return '#45B7D1';
      default: return '#8B9A7D';
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

  const renderSelectedMediaItem = ({ item }: { item: MediaItem }) => (
    <View style={styles.selectedMediaItem}>
      <TouchableOpacity 
        style={styles.selectedMediaContent}
        onPress={() => handleRemoveMedia(item.id)}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.selectedMediaImage} />
        ) : (
          <View style={[styles.selectedMediaPlaceholder, { backgroundColor: getMediaTypeColor(item.type) }]}>
            <Text style={styles.selectedMediaEmoji}>{getMediaTypeEmoji(item.type)}</Text>
          </View>
        )}
        <Text style={styles.selectedMediaTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.selectedMediaType}>{item.type}</Text>
        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveMedia(item.id)}>
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  const renderSearchResultItem = ({ item }: { item: MediaItem }) => {
    const isSelected = selectedMedia.find(selected => selected.id === item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.searchResultItem, isSelected && styles.selectedResultItem]}
        onPress={() => handleMediaSelect(item)}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.resultImage} />
        ) : (
          <View style={[styles.resultImagePlaceholder, { backgroundColor: getMediaTypeColor(item.type) }]}>
            <Text style={styles.resultEmoji}>{getMediaTypeEmoji(item.type)}</Text>
          </View>
        )}
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.resultMeta}>
            {item.type} {item.year && `• ${item.year}`}
          </Text>
          {item.description && (
            <Text style={styles.resultDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.addButton, isSelected && styles.selectedButton]}
          onPress={() => handleMediaSelect(item)}
        >
          <Text style={[styles.addButtonText, isSelected && styles.selectedButtonText]}>
            {isSelected ? '✓' : '+'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderPopularItem = (item: MediaItem, index: number) => {
    const isSelected = selectedMedia.find(selected => selected.id === item.id);
    const colors = ['#8B4513', '#E6E6FA', '#DEB887', '#F0E68C', '#D3D3D3', '#B0E0E6'];
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.gridItem,
          { backgroundColor: colors[index % colors.length] },
          isSelected && styles.selectedItem
        ]}
        onPress={() => handleMediaSelect(item)}
      >
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemType}>{getMediaTypeEmoji(item.type)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      {/* TODO: remove before deploying - test navigation button */}
      <TouchableOpacity style={styles.testButton} onPress={handleTestNext}>
        <Text style={styles.testButtonText}>TEST →</Text>
      </TouchableOpacity>
      
      <KeyboardDismissWrapper>
        <View style={styles.contentContainer}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.pickText}>pick your</Text>
              <Text style={styles.favoriteText}>favorite vues</Text>
              <Text style={styles.subtitle}>Add up to 9!</Text>
            </View>

            {/* Selected Media Carousel */}
            {selectedMedia.length > 0 && (
              <View style={styles.selectedSection}>
                <Text style={styles.sectionTitle}>Selected ({selectedMedia.length}/9)</Text>
                <FlatList
                  data={selectedMedia}
                  renderItem={renderSelectedMediaItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.selectedCarousel}
                  contentContainerStyle={styles.selectedCarouselContent}
                />
              </View>
            )}
            
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search movies, shows, books..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#8B9A7D"
              />
              {isSearching ? (
                <ActivityIndicator size="small" color="#142D0A" style={styles.searchIcon} />
              ) : (
                <Text style={styles.searchIcon}>🔍</Text>
              )}
            </View>

            {/* Popular Items - Hide when user has searched */}
            {!hasSearched && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular</Text>
                <View style={styles.grid}>
                  {popularItems.map((item, index) => renderPopularItem(item, index))}
                </View>
              </View>
            )}

            {/* Search Results */}
            {hasSearched && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                </Text>
                {searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    renderItem={renderSearchResultItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.searchResultsList}
                  />
                ) : !isSearching ? (
                  <Text style={styles.noResultsText}>
                    No results found for "{searchText}"
                  </Text>
                ) : null}
              </View>
            )}
            
            <Text style={styles.bottomText}>
              This will be displayed on your profile page,{'\n'}
              but you can always change them later!
            </Text>
          </ScrollView>
          
          {selectedMedia.length > 0 && (
            <View style={styles.nextButtonContainer}>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardDismissWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  testButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pickText: {
    fontSize: 24,
    color: '#142D0A',
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  favoriteText: {
    fontSize: 36,
    color: '#142D0A',
    fontWeight: '300',
    marginBottom: 10,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  subtitle: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  searchInput: {
    backgroundColor: '#E8E5D3',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingRight: 50,
    fontSize: 16,
    borderWidth: 1.84,
    borderColor: '#142D0A',
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  searchIcon: {
    position: 'absolute',
    right: 20,
    top: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#142D0A',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '30%',
    aspectRatio: 0.7,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'flex-end',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  selectedItem: {
    borderWidth: 3,
    borderColor: '#142D0A',
  },
  itemContent: {
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#142D0A',
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  itemType: {
    fontSize: 12,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  bottomText: {
    fontSize: 14,
    color: '#142D0A',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  nextButtonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  selectedSection: {
    marginBottom: 40,
  },
  selectedCarousel: {
    height: 140,
  },
  selectedCarouselContent: {
    paddingHorizontal: 10,
  },
  selectedMediaItem: {
    width: 90,
    marginRight: 15,
    position: 'relative',
  },
  selectedMediaContent: {
    flex: 1,
    alignItems: 'center',
  },
  selectedMediaImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedMediaPlaceholder: {
    width: 80,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  selectedMediaEmoji: {
    fontSize: 24,
    color: 'white',
  },
  selectedMediaTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#142D0A',
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  selectedMediaType: {
    fontSize: 8,
    color: '#8B9A7D',
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_400Regular',
    marginTop: 2,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: 'white',
    borderWidth: 1.84,
    borderColor: '#142D0A',
    borderRadius: 10,
  },
  selectedResultItem: {
    borderWidth: 3,
    borderColor: '#142D0A',
    backgroundColor: '#F0F8F0',
  },
  resultImage: {
    width: 60,
    height: 80,
    borderRadius: 5,
  },
  resultImagePlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 20,
    color: 'white',
  },
  resultInfo: {
    flex: 1,
    marginHorizontal: 15,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#142D0A',
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  resultMeta: {
    fontSize: 12,
    color: '#8B9A7D',
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  resultDescription: {
    fontSize: 11,
    color: '#8B9A7D',
    lineHeight: 16,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  addButton: {
    backgroundColor: 'white',
    borderWidth: 1.84,
    borderColor: '#142D0A',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#142D0A',
  },
  addButtonText: {
    color: '#142D0A',
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  selectedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  searchResultsList: {
    gap: 0,
  },
  noResultsText: {
    fontSize: 14,
    color: '#142D0A',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
});
