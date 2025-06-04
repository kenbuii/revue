import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '@/lib/mediaService';

interface SearchResultsProps {
  results: MediaItem[];
  isLoading: boolean;
  onItemPress: (item: MediaItem) => void;
  searchQuery: string;
}

function SearchResultItem({ item, onPress }: { item: MediaItem; onPress: (item: MediaItem) => void }) {
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

  return (
    <TouchableOpacity style={styles.resultItem} onPress={() => onPress(item)}>
      <View style={styles.resultImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.resultImage} />
        ) : (
          <View style={[styles.resultImagePlaceholder, { backgroundColor: getMediaTypeColor(item.type) }]}>
            <Ionicons name={getMediaTypeIcon(item.type) as any} size={24} color="white" />
          </View>
        )}
      </View>
      
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.resultMeta}>
          <View style={[styles.typeTag, { backgroundColor: getMediaTypeColor(item.type) }]}>
            <Text style={styles.typeTagText}>{item.type}</Text>
          </View>
          {item.year && <Text style={styles.resultYear}>{item.year}</Text>}
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {item.author && <Text style={styles.resultAuthor}>by {item.author}</Text>}
        {item.description && (
          <Text style={styles.resultDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );
}

export default function SearchResults({ results, isLoading, onItemPress, searchQuery }: SearchResultsProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#004D00" />
        <Text style={styles.loadingText}>Searching...</Text>
      </View>
    );
  }

  if (!searchQuery) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>Search for movies, TV shows, and books</Text>
        <Text style={styles.emptySubtitle}>Type keywords to find content you want to review</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="help-circle-outline" size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptySubtitle}>Try different keywords or check your spelling</Text>
      </View>
    );
  }

  // Group results by type
  const movies = results.filter(item => item.type === 'movie');
  const tvShows = results.filter(item => item.type === 'tv');
  const books = results.filter(item => item.type === 'book');

  return (
    <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.resultsHeader}>Found {results.length} results for "{searchQuery}"</Text>
      
      {movies.length > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>Movies ({movies.length})</Text>
          {movies.map(item => (
            <SearchResultItem key={item.id} item={item} onPress={onItemPress} />
          ))}
        </View>
      )}

      {tvShows.length > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>TV Shows ({tvShows.length})</Text>
          {tvShows.map(item => (
            <SearchResultItem key={item.id} item={item} onPress={onItemPress} />
          ))}
        </View>
      )}

      {books.length > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>Books ({books.length})</Text>
          {books.map(item => (
            <SearchResultItem key={item.id} item={item} onPress={onItemPress} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsHeader: {
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#004D00',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  resultImageContainer: {
    marginRight: 12,
  },
  resultImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
  },
  resultImagePlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  typeTagText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'LibreBaskerville_700Bold',
    textTransform: 'uppercase',
  },
  resultYear: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    marginBottom: 4,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  resultAuthor: {
    fontSize: 12,
    color: '#666',
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
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'center',
    marginTop: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 15,
  },
  movieTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 4,
  },
  movieYear: {
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#666',
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'LibreBaskerville_700Bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  listText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  publishedText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  rankText: {
    fontSize: 12,
    color: '#FFD700',
    fontStyle: 'italic',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  descriptionText: {
    fontSize: 12,
    color: '#777',
    fontFamily: 'LibreBaskerville_400Regular',
  },
}); 