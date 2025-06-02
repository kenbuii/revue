import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableWithoutFeedback, 
  Keyboard,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/components/AppHeader';
import SearchResults from '@/components/search/SearchResults';
import TrendingSection from '@/components/search/TrendingSection';
import { mediaSearchService, MediaItem } from '@/lib/mediaService';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Track if user has submitted a search
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Trending data
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTV, setTrendingTV] = useState<MediaItem[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<MediaItem[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);

  // Load trending data on mount
  useEffect(() => {
    loadTrendingData();
  }, []);

  // Search with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await mediaSearchService.searchMedia(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('Search Error', 'Failed to search media. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const loadTrendingData = async () => {
    try {
      setIsTrendingLoading(true);
      const trending = await mediaSearchService.getAllTrending();
      setTrendingMovies(trending.movies);
      setTrendingTV(trending.tv);
      setTrendingBooks(trending.books);
    } catch (error) {
      console.error('Error loading trending data:', error);
      Alert.alert('Loading Error', 'Failed to load trending content. Please try again.');
    } finally {
      setIsTrendingLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTrendingData();
    setIsRefreshing(false);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    // Clear search state when query is cleared
    if (!text.trim()) {
      setHasSearched(false);
    }
  };

  const handleSearchSubmit = (text: string) => {
    if (text.trim()) {
      setSearchQuery(text);
      setHasSearched(true); // Mark that user has submitted a search
      setIsSearchFocused(false); // Allow keyboard to dismiss but keep search results
      Keyboard.dismiss();
    }
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    // Don't clear hasSearched here - let it persist
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setIsSearchFocused(false);
  };

  const handleItemPress = (item: MediaItem) => {
    // Navigate to media detail screen with item data as URL params
    router.push({
      pathname: '/media/[id]' as const,
      params: {
        id: item.id,
        title: item.title,
        type: item.type,
        year: item.year || '',
        image: item.image || '',
        description: item.description || '',
        rating: item.rating?.toString() || '',
        author: item.author || '',
      },
    });
  };

  const createPostForMedia = (item: MediaItem) => {
    // This would integrate with the post creation flow
    Alert.alert('Coming Soon', `Post creation for "${item.title}" will be available soon!`);
  };

  const renderContent = () => {
    // Show search results when user has searched OR when search is focused with query
    const shouldShowSearchResults = hasSearched || (isSearchFocused && searchQuery.trim());
    
    if (shouldShowSearchResults) {
      return (
        <View style={styles.searchContainer}>
          {hasSearched && (
            <View style={styles.searchHeader}>
              <TouchableOpacity style={styles.backToTrending} onPress={handleClearSearch}>
                <Ionicons name="arrow-back" size={20} color="#004D00" />
                <Text style={styles.backToTrendingText}>Back to Trending</Text>
              </TouchableOpacity>
            </View>
          )}
          <SearchResults
            results={searchResults}
            isLoading={isSearching}
            onItemPress={handleItemPress}
            searchQuery={searchQuery}
          />
        </View>
      );
    }

    // Show trending content
    return (
      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#004D00"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Trending Now</Text>
        
        {isTrendingLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading trending content...</Text>
          </View>
        ) : (
          <>
            <TrendingSection
              title="Trending Movies"
              items={trendingMovies}
              onItemPress={handleItemPress}
              headerImage="https://images.unsplash.com/photo-1489599843714-2e4d1b3ca3a2?q=80&w=200&auto=format&fit=crop"
            />
            
            <TrendingSection
              title="Trending TV Shows"
              items={trendingTV}
              onItemPress={handleItemPress}
              headerImage="https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=200&auto=format&fit=crop"
            />
            
            <TrendingSection
              title="Trending Books"
              items={trendingBooks}
              onItemPress={handleItemPress}
              headerImage="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=200&auto=format&fit=crop"
            />
          </>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <AppHeader 
          showLogo={true} 
          showSearchBar={true}
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onSearchFocus={handleSearchFocus}
          onSearchBlur={handleSearchBlur}
          searchPlaceholder="Search movies, TV shows, books..."
        />
      </View>
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {renderContent()}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  headerContainer: {
    backgroundColor: '#FFFDF6',
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    backgroundColor: '#FFFDF6',
  },
  backToTrending: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToTrendingText: {
    fontSize: 16,
    color: '#004D00',
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 16,
    color: '#004D00',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  bottomPadding: {
    height: 60,
  },
});
