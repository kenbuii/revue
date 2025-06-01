import Constants from 'expo-constants';

// Media item interface
export interface MediaItem {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'book';
  year?: string;
  image?: string;
  description?: string;
  source: 'tmdb' | 'google_books' | 'popular';
  originalId?: string; // Keep original API ID for future reference
}

// API configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';

class MediaSearchService {
  private tmdbApiKey: string | undefined;
  private googleBooksApiKey: string | undefined;

  constructor() {
    // Get API keys from environment
    this.tmdbApiKey = Constants.expoConfig?.extra?.tmdbApiKey;
    this.googleBooksApiKey = Constants.expoConfig?.extra?.googleBooksApiKey;
  }

  /**
   * Search across multiple media types
   * Uses only HTTP requests - no WebSocket connections
   */
  async searchMedia(query: string): Promise<MediaItem[]> {
    if (!query.trim()) return [];

    console.log(`🔍 Searching for: "${query}"`);

    try {
      // Run searches in parallel (all HTTP requests)
      const [movieTvResults, bookResults] = await Promise.all([
        this.searchMoviesAndTV(query),
        this.searchBooks(query)
      ]);

      // Combine and limit results
      const allResults = [...movieTvResults, ...bookResults];
      const limitedResults = allResults.slice(0, 20); // Limit to 20 total results

      console.log(`📊 Found ${limitedResults.length} media items`);
      return limitedResults;

    } catch (error) {
      console.error('❌ Media search error:', error);
      return [];
    }
  }

  /**
   * Search movies and TV shows via TMDb API
   * Pure HTTP request - no WebSocket connections
   */
  private async searchMoviesAndTV(query: string): Promise<MediaItem[]> {
    if (!this.tmdbApiKey) {
      console.log('🔧 TMDb API key not configured - using fallback data');
      return this.getFallbackMovieTVData(query);
    }

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`TMDb API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.results
        ?.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        ?.slice(0, 10) // Limit TMDb results
        ?.map((item: any) => ({
          id: `tmdb_${item.media_type}_${item.id}`,
          title: item.title || item.name,
          type: item.media_type === 'movie' ? 'movie' : 'tv',
          year: item.release_date ? new Date(item.release_date).getFullYear().toString() : 
                item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : undefined,
          image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : undefined,
          description: item.overview,
          source: 'tmdb' as const,
          originalId: item.id.toString(),
        })) || [];

    } catch (error) {
      console.error('TMDb search error:', error);
      return this.getFallbackMovieTVData(query);
    }
  }

  /**
   * Search books via Google Books API
   * Pure HTTP request - no WebSocket connections
   */
  private async searchBooks(query: string): Promise<MediaItem[]> {
    try {
      const url = this.googleBooksApiKey 
        ? `${GOOGLE_BOOKS_BASE_URL}/volumes?q=${encodeURIComponent(query)}&key=${this.googleBooksApiKey}&maxResults=10`
        : `${GOOGLE_BOOKS_BASE_URL}/volumes?q=${encodeURIComponent(query)}&maxResults=10`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.items
        ?.slice(0, 10) // Limit book results
        ?.map((item: any) => ({
          id: `book_${item.id}`,
          title: item.volumeInfo.title,
          type: 'book' as const,
          year: item.volumeInfo.publishedDate ? new Date(item.volumeInfo.publishedDate).getFullYear().toString() : undefined,
          image: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail,
          description: item.volumeInfo.description,
          source: 'google_books' as const,
          originalId: item.id,
        })) || [];

    } catch (error) {
      console.error('Google Books search error:', error);
      return this.getFallbackBookData(query);
    }
  }

  /**
   * Fallback movie/TV data when API is unavailable
   */
  private getFallbackMovieTVData(query: string): MediaItem[] {
    const fallbackData = [
      { title: 'The Shawshank Redemption', type: 'movie', year: '1994' },
      { title: 'Breaking Bad', type: 'tv', year: '2008' },
      { title: 'The Godfather', type: 'movie', year: '1972' },
      { title: 'The Office', type: 'tv', year: '2005' },
      { title: 'Inception', type: 'movie', year: '2010' },
    ];

    return fallbackData
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .map((item, index) => ({
        id: `fallback_${item.type}_${index}`,
        title: item.title,
        type: item.type as 'movie' | 'tv',
        year: item.year,
        source: 'tmdb' as const,
        description: `A great ${item.type} from ${item.year}`,
      }));
  }

  /**
   * Fallback book data when API is unavailable
   */
  private getFallbackBookData(query: string): MediaItem[] {
    const fallbackData = [
      { title: 'To Kill a Mockingbird', year: '1960' },
      { title: 'Pride and Prejudice', year: '1813' },
      { title: 'The Great Gatsby', year: '1925' },
      { title: 'Harry Potter and the Philosopher\'s Stone', year: '1997' },
      { title: 'The Catcher in the Rye', year: '1951' },
    ];

    return fallbackData
      .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
      .map((item, index) => ({
        id: `fallback_book_${index}`,
        title: item.title,
        type: 'book' as const,
        year: item.year,
        source: 'google_books' as const,
        description: `A classic book from ${item.year}`,
      }));
  }

  /**
   * Get popular media items (static data for now)
   */
  getPopularItems(): MediaItem[] {
    return [
      {
        id: 'popular_1',
        title: 'Harry Potter',
        type: 'book',
        source: 'popular',
        description: 'Popular fantasy book series',
      },
      {
        id: 'popular_2',
        title: 'Never Let Me Go',
        type: 'book',
        source: 'popular',
        description: 'Popular dystopian novel',
      },
      {
        id: 'popular_3',
        title: 'Pride & Prejudice',
        type: 'movie',
        source: 'popular',
        description: 'Classic romantic drama',
      },
      {
        id: 'popular_4',
        title: 'The Office',
        type: 'tv',
        source: 'popular',
        description: 'Popular comedy series',
      },
      {
        id: 'popular_5',
        title: 'Inception',
        type: 'movie',
        source: 'popular',
        description: 'Mind-bending thriller',
      },
      {
        id: 'popular_6',
        title: 'Breaking Bad',
        type: 'tv',
        source: 'popular',
        description: 'Acclaimed drama series',
      },
    ];
  }
}

// Export singleton instance
export const mediaSearchService = new MediaSearchService(); 