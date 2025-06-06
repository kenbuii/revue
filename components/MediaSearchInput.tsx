import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Image, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mediaSearchService, MediaItem } from '@/lib/mediaService';

interface MediaSearchInputProps {
  mediaType?: 'movie' | 'tv' | 'book' | 'all'; // Filter by specific type
  placeholder?: string;
  onMediaSelect: (media: MediaItem) => void;
  onClear?: () => void;
  showPopular?: boolean; // Show popular items when no search
  initialValue?: string;
  style?: any;
  maxResults?: number;
}

export default function MediaSearchInput({
  mediaType = 'all',
  placeholder = 'Search movies, shows, books...',
  onMediaSelect,
  onClear,
  showPopular = true,
  initialValue = '',
  style,
  maxResults = 10
}: MediaSearchInputProps) {
  const [searchText, setSearchText] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [popularItems, setPopularItems] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load popular items on mount if enabled
  useEffect(() => {
    if (showPopular) {
      loadPopularItems();
    }
  }, [showPopular, mediaType]);

  // Search with debouncing
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      await performSearch(searchText);
    }, 500); // 500ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchText, mediaType]);

  const loadPopularItems = async () => {
    try {
      setIsLoadingPopular(true);
      console.log('🔥 Loading popular items...');
      
      const items = await mediaSearchService.getPopularItems();
      
      // Filter by media type if specified
      const filteredItems = mediaType === 'all' 
        ? items 
        : items.filter(item => item.type === mediaType);
        
      setPopularItems(filteredItems.slice(0, maxResults));
      console.log(`✅ Popular items loaded: ${filteredItems.length} items`);
    } catch (error) {
      console.error('❌ Error loading popular items:', error);
    } finally {
      setIsLoadingPopular(false);
    }
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      console.log(`🔍 Searching for: "${query}"`);
      
      const results = await mediaSearchService.searchMedia(query);
      
      // Filter by media type if specified
      const filteredResults = mediaType === 'all'
        ? results
        : results.filter(item => item.type === mediaType);
        
      setSearchResults(filteredResults.slice(0, maxResults));
      console.log(`✅ Search results: ${filteredResults.length} items`);
    } catch (error) {
      console.error('❌ Search error:', error);
      Alert.alert('Search Error', 'Failed to search media. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setSearchResults([]);
    setHasSearched(false);
    onClear && onClear();
  };

  const handleMediaSelect = (media: MediaItem) => {
    console.log('📋 Media selected:', media.title);
    onMediaSelect(media);
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

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity 
      style={styles.resultItem}
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
          {getMediaTypeEmoji(item.type)} {item.type} {item.year && `• ${item.year}`}
        </Text>
        {item.author && (
          <Text style={styles.resultAuthor} numberOfLines={1}>by {item.author}</Text>
        )}
        {item.description && (
          <Text style={styles.resultDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderPopularGrid = () => (
    <View style={styles.popularGrid}>
      {popularItems.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={styles.popularItem}
          onPress={() => handleMediaSelect(item)}
        >
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.popularImage} />
          ) : (
            <View style={[styles.popularImagePlaceholder, { backgroundColor: getMediaTypeColor(item.type) }]}>
              <Text style={styles.popularEmoji}>{getMediaTypeEmoji(item.type)}</Text>
            </View>
          )}
          {item.rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.popularInfo}>
            <Text style={styles.popularTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.popularMeta}>
              {getMediaTypeEmoji(item.type)} {item.year && item.year}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#8B9A7D"
        />
        
        {isSearching ? (
          <ActivityIndicator size="small" color="#142D0A" style={styles.searchIcon} />
        ) : searchText ? (
          <TouchableOpacity onPress={handleClear} style={styles.searchIcon}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="search" size={20} color="#8B9A7D" style={styles.searchIcon} />
        )}
      </View>

      {/* Results */}
      {hasSearched ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>
            Search Results {searchResults.length > 0 && `(${searchResults.length})`}
          </Text>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.resultsList}
            />
          ) : !isSearching ? (
            <Text style={styles.noResultsText}>
              No results found for "{searchText}"
            </Text>
          ) : null}
        </View>
      ) : showPopular && (
        <View style={styles.popularContainer}>
          <Text style={styles.sectionTitle}>
            Trending {mediaType === 'all' ? 'Now' : `${mediaType}s`}
          </Text>
          {isLoadingPopular ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#142D0A" />
              <Text style={styles.loadingText}>Loading trending content...</Text>
            </View>
          ) : (
            renderPopularGrid()
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EFE6',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  searchIcon: {
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#142D0A',
    marginBottom: 16,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  resultImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  resultImagePlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultEmoji: {
    fontSize: 24,
    color: 'white',
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#142D0A',
    marginBottom: 4,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  resultMeta: {
    fontSize: 14,
    color: '#8B9A7D',
    marginBottom: 4,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  resultAuthor: {
    fontSize: 12,
    color: '#8B9A7D',
    fontStyle: 'italic',
    marginBottom: 4,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  resultDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  popularContainer: {
    flex: 1,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  popularItem: {
    width: '30%',
    aspectRatio: 0.7,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.84,
    borderColor: '#142D0A',
    backgroundColor: 'white',
  },
  popularImage: {
    width: '100%',
    flex: 1,
  },
  popularImagePlaceholder: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularEmoji: {
    fontSize: 24,
    color: 'white',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  popularInfo: {
    padding: 8,
    alignItems: 'center',
  },
  popularTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#142D0A',
    textAlign: 'center',
    marginBottom: 2,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  popularMeta: {
    fontSize: 10,
    color: '#8B9A7D',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
}); 