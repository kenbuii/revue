import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '@/lib/mediaService';

interface TrendingSectionProps {
  title: string;
  items: MediaItem[];
  onItemPress: (item: MediaItem) => void;
  headerImage?: string;
}

function TrendingItem({ item, onPress }: { item: MediaItem; onPress: (item: MediaItem) => void }) {
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

  const isNYTBestseller = item.source === 'nyt_bestsellers';

  return (
    <TouchableOpacity style={styles.trendingItem} onPress={() => onPress(item)}>
      <View style={styles.itemImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImagePlaceholder, { backgroundColor: getMediaTypeColor(item.type) }]}>
            <Ionicons name={getMediaTypeIcon(item.type) as any} size={24} color="white" />
          </View>
        )}
        {isNYTBestseller ? (
          <View style={styles.nytBadge}>
            <Text style={styles.nytBadgeText}>NYT</Text>
          </View>
        ) : null}
        {item.rating ? (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.itemMeta}>
          <View style={[styles.typeIndicator, { backgroundColor: getMediaTypeColor(item.type) }]} />
          <Text style={styles.itemType}>{item.type}</Text>
          {item.year ? (
            <Text style={styles.itemYear}>• {item.year}</Text>
          ) : null}
        </View>
        {item.author ? <Text style={styles.itemAuthor}>{item.author}</Text> : null}
        {isNYTBestseller ? (
          <Text style={styles.bestsellerText}>NYT Bestseller</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function TrendingSection({ title, items, onItemPress, headerImage }: TrendingSectionProps) {
  if (items.length === 0) {
    return null;
  }

  const postCount = Math.floor(Math.random() * 200) + 50; // Mock post count for now
  const hasNYTBooks = items.some(item => item.source === 'nyt_bestsellers');

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
          <View style={styles.postCountRow}>
            <Text style={styles.postCount}>
              {postCount} posts in past day
            </Text>
            {hasNYTBooks ? (
              <View style={styles.nytIndicator}>
                <Text style={styles.nytIndicatorText}>NYT Data</Text>
              </View>
            ) : null}
          </View>
        </View>
        {headerImage ? (
          <Image source={{ uri: headerImage }} style={styles.headerImage} />
        ) : (
          <View style={styles.headerImagePlaceholder}>
            <Ionicons name="trending-up" size={24} color="#004D00" />
          </View>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemsContainer}
      >
        {items.map(item => (
          <TrendingItem key={item.id} item={item} onPress={onItemPress} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#F8F6ED',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 12,
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  postCount: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  headerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsContainer: {
    paddingLeft: 4,
    paddingRight: 8,
    gap: 12,
  },
  trendingItem: {
    width: 140,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  itemImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 32,
  },
  ratingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'LibreBaskerville_700Bold',
    marginLeft: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 4,
    lineHeight: 16,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  itemType: {
    fontSize: 10,
    color: '#666',
    textTransform: 'capitalize',
  },
  itemYear: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  itemAuthor: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  postCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nytIndicator: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  nytIndicatorText: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  nytBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nytBadgeText: {
    color: 'white',
    fontSize: 8,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  bestsellerText: {
    fontSize: 8,
    color: '#004D00',
    fontFamily: 'LibreBaskerville_700Bold',
    marginTop: 2,
  },
  emptyMessage: {
    fontSize: 32,
    color: '#ccc',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    textAlign: 'center',
    marginTop: 100,
  },
  bookTitle: {
    fontSize: 10,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 12,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#666',
    textAlign: 'center',
  },
  movieTitle: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'center',
    marginBottom: 2,
  },
  movieYear: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'center',
  },
  movieRating: {
    fontSize: 9,
    color: '#FFD700',
    fontStyle: 'italic',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    textAlign: 'center',
    marginTop: 2,
  },
  listName: {
    fontSize: 9,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#fff',
    textAlign: 'center',
  },
  tagText: {
    fontSize: 8,
    fontFamily: 'LibreBaskerville_700Bold',
    color: 'white',
  },
  rankBadgeText: {
    fontSize: 8,
    color: '#333',
    fontFamily: 'LibreBaskerville_700Bold',
  },
}); 