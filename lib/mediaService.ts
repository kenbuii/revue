import Constants from 'expo-constants';

// Media item interface
export interface MediaItem {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'book';
  year?: string;
  image?: string;
  description?: string;
  source: 'tmdb' | 'google_books' | 'popular' | 'nyt_bestsellers';
  originalId?: string; // Keep original API ID for future reference
  rating?: number; // For trending items
  author?: string; // For books
  director?: string; // For movies
}

// API configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';
const NYT_BOOKS_API = 'https://api.nytimes.com/svc/books/v3';

class MediaSearchService {
  private tmdbApiKey: string | undefined;
  private googleBooksApiKey: string | undefined;
  private nytApiKey: string | undefined;

  constructor() {
    // Get API keys from environment
    this.tmdbApiKey = Constants.expoConfig?.extra?.tmdbApiKey;
    this.googleBooksApiKey = Constants.expoConfig?.extra?.googleBooksApiKey;
    this.nytApiKey = Constants.expoConfig?.extra?.nytApiKey;
  }

  /**
   * Get trending movies from TMDB
   */
  async getTrendingMovies(): Promise<MediaItem[]> {
    if (!this.tmdbApiKey) {
      console.log('🔧 TMDb API key not configured - using fallback data');
      return this.getFallbackTrendingMovies();
    }

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/movie/day?api_key=${this.tmdbApiKey}`,
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
        ?.slice(0, 10) // Limit to 10 trending movies
        ?.map((item: any) => ({
          id: `tmdb_movie_${item.id}`,
          title: item.title,
          type: 'movie' as const,
          year: item.release_date ? new Date(item.release_date).getFullYear().toString() : undefined,
          image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : undefined,
          description: item.overview,
          source: 'tmdb' as const,
          originalId: item.id.toString(),
          rating: item.vote_average,
        })) || [];

    } catch (error) {
      console.error('TMDb trending movies error:', error);
      return this.getFallbackTrendingMovies();
    }
  }

  /**
   * Get trending TV shows from TMDB
   */
  async getTrendingTV(): Promise<MediaItem[]> {
    if (!this.tmdbApiKey) {
      console.log('🔧 TMDb API key not configured - using fallback data');
      return this.getFallbackTrendingTV();
    }

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/tv/day?api_key=${this.tmdbApiKey}`,
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
        ?.slice(0, 10) // Limit to 10 trending TV shows
        ?.map((item: any) => ({
          id: `tmdb_tv_${item.id}`,
          title: item.name,
          type: 'tv' as const,
          year: item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : undefined,
          image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : undefined,
          description: item.overview,
          source: 'tmdb' as const,
          originalId: item.id.toString(),
          rating: item.vote_average,
        })) || [];

    } catch (error) {
      console.error('TMDb trending TV error:', error);
      return this.getFallbackTrendingTV();
    }
  }

  /**
   * Get trending books from New York Times Bestsellers API
   */
  async getTrendingBooks(): Promise<MediaItem[]> {
    if (!this.nytApiKey) {
      console.log('🔧 NYT API key not configured - trying enhanced Google Books search');
      return this.getEnhancedGoogleBooks();
    }

    try {
      // Rotate between different NYT bestseller lists for variety
      const bestsellerLists = [
        'combined-print-and-e-book-fiction',
        'combined-print-and-e-book-nonfiction',
        'hardcover-fiction',
        'hardcover-nonfiction',
        'paperback-nonfiction',
      ];
      
      const randomList = bestsellerLists[Math.floor(Math.random() * bestsellerLists.length)];
      
      console.log(`🏆 Fetching NYT bestsellers from: ${randomList}`);
      
      const response = await fetch(
        `${NYT_BOOKS_API}/lists/current/${randomList}.json?api-key=${this.nytApiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`NYT Books API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results?.books) {
        throw new Error('Invalid NYT API response structure');
      }

      return data.results.books
        ?.slice(0, 10) // Limit to 10 books
        ?.map((book: any) => ({
          id: `nyt_${book.primary_isbn13 || book.primary_isbn10 || Math.random()}`,
          title: book.title,
          type: 'book' as const,
          author: book.author,
          description: book.description || `#${book.rank} on NYT ${data.results.display_name} list`,
          image: book.book_image,
          source: 'nyt_bestsellers' as const,
          originalId: book.primary_isbn13 || book.primary_isbn10,
          rating: this.calculateNYTRating(book.weeks_on_list, book.rank),
          year: new Date().getFullYear().toString(), // Current year for bestsellers
        })) || [];

    } catch (error) {
      console.error('NYT Books API error:', error);
      console.log('📚 Falling back to enhanced Google Books search');
      return this.getEnhancedGoogleBooks();
    }
  }

  /**
   * Calculate a rating score based on NYT bestseller metrics
   */
  private calculateNYTRating(weeksOnList: number, rank: number): number {
    // Convert weeks on list and rank to a 1-5 rating scale
    // More weeks on list = higher rating, lower rank number = higher rating
    const weeksScore = Math.min(weeksOnList * 0.1, 2); // Up to 2 points for weeks
    const rankScore = Math.max(3 - (rank * 0.2), 0.5); // Up to 3 points for rank (rank 1 = 3, rank 15 = 0.5)
    return Math.min(weeksScore + rankScore, 5);
  }

  /**
   * Enhanced Google Books search as fallback for trending books
   */
  private async getEnhancedGoogleBooks(): Promise<MediaItem[]> {
    try {
      // Use curated subjects and better filtering instead of "bestseller" search
      const subjects = [
        'fiction bestseller',
        'popular fiction',
        'award winning books',
        'contemporary literature',
        'bestselling authors'
      ];
      
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      
      const url = this.googleBooksApiKey 
        ? `${GOOGLE_BOOKS_BASE_URL}/volumes?q=${encodeURIComponent(randomSubject)}&key=${this.googleBooksApiKey}&maxResults=20&orderBy=relevance&printType=books&filter=paid-ebooks`
        : `${GOOGLE_BOOKS_BASE_URL}/volumes?q=${encodeURIComponent(randomSubject)}&maxResults=20&orderBy=relevance&printType=books&filter=paid-ebooks`;

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
      
      if (!data.items) {
        return this.getFallbackTrendingBooks();
      }

      // Filter for books with good ratings and published recently
      const filteredBooks = data.items
        .filter((item: any) => {
          const volumeInfo = item.volumeInfo;
          const publishedYear = volumeInfo.publishedDate ? 
            new Date(volumeInfo.publishedDate).getFullYear() : 0;
          
          return (
            volumeInfo.title &&
            volumeInfo.authors &&
            publishedYear >= 2020 && // Recent books
            (volumeInfo.averageRating >= 4.0 || !volumeInfo.averageRating) &&
            (volumeInfo.ratingsCount >= 50 || !volumeInfo.ratingsCount)
          );
        })
        .slice(0, 10)
        .map((item: any) => ({
          id: `enhanced_book_${item.id}`,
          title: item.volumeInfo.title,
          type: 'book' as const,
          year: item.volumeInfo.publishedDate ? 
            new Date(item.volumeInfo.publishedDate).getFullYear().toString() : undefined,
          image: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail,
          description: item.volumeInfo.description,
          source: 'google_books' as const,
          originalId: item.id,
          author: item.volumeInfo.authors?.join(', '),
          rating: item.volumeInfo.averageRating || 4.0,
        }));

      return filteredBooks.length > 0 ? filteredBooks : this.getFallbackTrendingBooks();

    } catch (error) {
      console.error('Enhanced Google Books search error:', error);
      return this.getFallbackTrendingBooks();
    }
  }

  /**
   * Get all trending content in one call
   */
  async getAllTrending(): Promise<{ movies: MediaItem[], tv: MediaItem[], books: MediaItem[] }> {
    try {
      const [movies, tv, books] = await Promise.all([
        this.getTrendingMovies(),
        this.getTrendingTV(),
        this.getTrendingBooks()
      ]);

      return { movies, tv, books };
    } catch (error) {
      console.error('Error fetching all trending:', error);
      return {
        movies: this.getFallbackTrendingMovies(),
        tv: this.getFallbackTrendingTV(),
        books: this.getFallbackTrendingBooks()
      };
    }
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
   * Get popular media items using real API data
   * Fetches equal numbers of movies, TV shows, and books from trending APIs
   */
  async getPopularItems(): Promise<MediaItem[]> {
    try {
      console.log('🔥 Fetching popular items from real APIs...');
      
      // Get trending data from all sources
      const trending = await this.getAllTrending();
      
      // Take equal numbers from each category (3 of each = 9 total)
      const moviesSlice = trending.movies.slice(0, 3);
      const tvSlice = trending.tv.slice(0, 3);
      const booksSlice = trending.books.slice(0, 3);
      
      // Combine and shuffle for variety
      const combined = [...moviesSlice, ...tvSlice, ...booksSlice];
      
      // Shuffle array to mix types
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
      
      console.log(`✅ Popular items fetched: ${moviesSlice.length} movies, ${tvSlice.length} TV shows, ${booksSlice.length} books`);
      
      return combined;
      
    } catch (error) {
      console.error('❌ Error fetching popular items, falling back to static data:', error);
      return this.getFallbackPopularItems();
    }
  }

  /**
   * Fallback popular items when APIs are unavailable
   */
  private getFallbackPopularItems(): MediaItem[] {
    return [
      {
        id: 'popular_movie_1',
        title: 'Oppenheimer',
        type: 'movie',
        year: '2023',
        source: 'tmdb',
        description: 'The story of J. Robert Oppenheimer and the Manhattan Project',
        rating: 8.3,
      },
      {
        id: 'popular_tv_1',
        title: 'House of the Dragon',
        type: 'tv',
        year: '2022',
        source: 'tmdb',
        description: 'The Targaryen civil war, set 200 years before Game of Thrones',
        rating: 8.4,
      },
      {
        id: 'popular_book_1',
        title: 'Fourth Wing',
        type: 'book',
        year: '2023',
        source: 'google_books',
        description: 'A deadly war college where dragons choose their riders',
        author: 'Rebecca Yarros',
        rating: 4.5,
      },
      {
        id: 'popular_movie_2',
        title: 'Barbie',
        type: 'movie',
        year: '2023',
        source: 'tmdb',
        description: 'A doll living in Barbieland gets expelled for being imperfect',
        rating: 7.2,
      },
      {
        id: 'popular_tv_2',
        title: 'The Last of Us',
        type: 'tv',
        year: '2023',
        source: 'tmdb',
        description: 'Joel and Ellie navigate a post-apocalyptic world',
        rating: 8.8,
      },
      {
        id: 'popular_book_2',
        title: 'Tomorrow, and Tomorrow, and Tomorrow',
        type: 'book',
        year: '2022',
        source: 'google_books',
        description: 'A novel about friendship and video game design',
        author: 'Gabrielle Zevin',
        rating: 4.3,
      },
      {
        id: 'popular_movie_3',
        title: 'Spider-Man: Across the Spider-Verse',
        type: 'movie',
        year: '2023',
        source: 'tmdb',
        description: 'Miles Morales catapults across the Multiverse',
        rating: 8.7,
      },
      {
        id: 'popular_tv_3',
        title: 'Wednesday',
        type: 'tv',
        year: '2022',
        source: 'tmdb',
        description: 'Wednesday Addams at Nevermore Academy',
        rating: 8.1,
      },
      {
        id: 'popular_book_3',
        title: 'The Seven Moons of Maali Almeida',
        type: 'book',
        year: '2022',
        source: 'google_books',
        description: 'A magical realist novel set in Sri Lanka',
        author: 'Shehan Karunatilaka',
        rating: 4.1,
      },
    ];
  }

  /**
   * Fallback trending movies when API is unavailable
   */
  private getFallbackTrendingMovies(): MediaItem[] {
    return [
      {
        id: 'trending_movie_1',
        title: 'Oppenheimer',
        type: 'movie',
        year: '2023',
        source: 'tmdb',
        description: 'The story of J. Robert Oppenheimer and the Manhattan Project',
        rating: 8.3,
      },
      {
        id: 'trending_movie_2',
        title: 'Barbie',
        type: 'movie',
        year: '2023',
        source: 'tmdb',
        description: 'A doll living in Barbieland gets expelled for being imperfect',
        rating: 7.2,
      },
      {
        id: 'trending_movie_3',
        title: 'Spider-Man: Across the Spider-Verse',
        type: 'movie',
        year: '2023',
        source: 'tmdb',
        description: 'Miles Morales catapults across the Multiverse',
        rating: 8.7,
      },
    ];
  }

  /**
   * Fallback trending TV shows when API is unavailable
   */
  private getFallbackTrendingTV(): MediaItem[] {
    return [
      {
        id: 'trending_tv_1',
        title: 'House of the Dragon',
        type: 'tv',
        year: '2022',
        source: 'tmdb',
        description: 'The Targaryen civil war, set 200 years before Game of Thrones',
        rating: 8.4,
      },
      {
        id: 'trending_tv_2',
        title: 'The Last of Us',
        type: 'tv',
        year: '2023',
        source: 'tmdb',
        description: 'Joel and Ellie navigate a post-apocalyptic world',
        rating: 8.8,
      },
      {
        id: 'trending_tv_3',
        title: 'Wednesday',
        type: 'tv',
        year: '2022',
        source: 'tmdb',
        description: 'Wednesday Addams at Nevermore Academy',
        rating: 8.1,
      },
    ];
  }

  /**
   * Fallback trending books when API is unavailable
   */
  private getFallbackTrendingBooks(): MediaItem[] {
    return [
      {
        id: 'trending_book_1',
        title: 'Fourth Wing',
        type: 'book',
        year: '2023',
        source: 'google_books',
        description: 'A deadly war college where dragons choose their riders',
        author: 'Rebecca Yarros',
        rating: 4.5,
      },
      {
        id: 'trending_book_2',
        title: 'Tomorrow, and Tomorrow, and Tomorrow',
        type: 'book',
        year: '2022',
        source: 'google_books',
        description: 'A novel about friendship and video game design',
        author: 'Gabrielle Zevin',
        rating: 4.3,
      },
      {
        id: 'trending_book_3',
        title: 'The Seven Moons of Maali Almeida',
        type: 'book',
        year: '2022',
        source: 'google_books',
        description: 'A magical realist novel set in Sri Lanka',
        author: 'Shehan Karunatilaka',
        rating: 4.1,
      },
    ];
  }

  /**
   * Get media item by ID - supports all media sources and types
   * This fixes the "empty params" issue by properly returning media data
   */
  async getMediaById(id: string): Promise<MediaItem | null> {
    try {
      console.log('🔍 Fetching media by ID:', id);

      // Parse the ID to determine source and type
      const { source, type, originalId } = this.parseMediaId(id);

      if (!source || !type || !originalId) {
        console.warn('⚠️ Invalid media ID format:', id);
        return this.getFallbackMediaById(id);
      }

      switch (source) {
        case 'tmdb':
          return await this.getTMDBMediaById(type, originalId);
        case 'google_books':
          return await this.getGoogleBooksMediaById(originalId);
        case 'nyt_bestsellers':
          return await this.getNYTMediaById(originalId);
        case 'popular':
        default:
          return this.getFallbackMediaById(id);
      }
    } catch (error) {
      console.error('❌ Error fetching media by ID:', error);
      return this.getFallbackMediaById(id);
    }
  }

  /**
   * Parse media ID to extract source, type, and original ID
   */
  private parseMediaId(id: string): { source?: string; type?: string; originalId?: string } {
    // Expected formats:
    // tmdb_movie_123, tmdb_tv_456, google_books_abc, nyt_isbn, popular_movie_1, book_abc (database format)
    const parts = id.split('_');
    
    if (parts.length < 2) {
      return {};
    }

    const source = parts[0];
    
    if (source === 'tmdb' && parts.length >= 3) {
      return {
        source,
        type: parts[1], // movie or tv
        originalId: parts.slice(2).join('_')
      };
    }
    
    if (source === 'google' && parts[1] === 'books' && parts.length >= 3) {
      return {
        source: 'google_books',
        type: 'book',
        originalId: parts.slice(2).join('_')
      };
    }

    // Handle database book format: book_googleBooksId
    if (source === 'book' && parts.length >= 2) {
      return {
        source: 'google_books',
        type: 'book',
        originalId: parts.slice(1).join('_')
      };
    }

    if (source === 'nyt' && parts.length >= 2) {
      return {
        source: 'nyt_bestsellers',
        type: 'book',
        originalId: parts.slice(1).join('_')
      };
    }

    if (source === 'popular' && parts.length >= 3) {
      return {
        source: 'popular',
        type: parts[1],
        originalId: parts.slice(2).join('_')
      };
    }

    return { source, originalId: parts.slice(1).join('_') };
  }

  /**
   * Get TMDB media by type and original ID
   */
  private async getTMDBMediaById(type: string, originalId: string): Promise<MediaItem | null> {
    if (!this.tmdbApiKey) {
      console.log('🔧 TMDb API key not configured - using fallback');
      return null;
    }

    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const response = await fetch(
        `${TMDB_BASE_URL}/${endpoint}/${originalId}?api_key=${this.tmdbApiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`TMDb API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        id: `tmdb_${type}_${originalId}`,
        title: data.title || data.name,
        type: type as 'movie' | 'tv',
        year: data.release_date ? new Date(data.release_date).getFullYear().toString() : 
              data.first_air_date ? new Date(data.first_air_date).getFullYear().toString() : undefined,
        image: data.poster_path ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}` : undefined,
        description: data.overview,
        source: 'tmdb',
        originalId,
        rating: data.vote_average,
        director: data.director, // This would need additional API call for full credits
      };
    } catch (error) {
      console.error('❌ Error fetching TMDB media:', error);
      return null;
    }
  }

  /**
   * Get Google Books media by original ID
   */
  private async getGoogleBooksMediaById(originalId: string): Promise<MediaItem | null> {
    try {
      console.log('📚 Fetching Google Books data for ID:', originalId);
      
      const response = await fetch(
        `${GOOGLE_BOOKS_BASE_URL}/volumes/${originalId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        console.error(`Google Books API error: ${response.status}`);
        throw new Error(`Google Books API error: ${response.status}`);
      }

      const data = await response.json();
      const volumeInfo = data.volumeInfo || {};

      console.log('✅ Google Books data received:', {
        title: volumeInfo.title,
        authors: volumeInfo.authors,
        publishedDate: volumeInfo.publishedDate
      });

      return {
        id: `google_books_${originalId}`,
        title: volumeInfo.title || 'Unknown Title',
        type: 'book',
        year: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate).getFullYear().toString() : undefined,
        image: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail,
        description: volumeInfo.description,
        source: 'google_books',
        originalId,
        author: volumeInfo.authors?.join(', '),
        rating: volumeInfo.averageRating,
      };
    } catch (error) {
      console.error('❌ Error fetching Google Books media:', error);
      return null;
    }
  }

  /**
   * Get NYT Bestseller media by ISBN
   */
  private async getNYTMediaById(isbn: string): Promise<MediaItem | null> {
    // NYT API doesn't have a direct "get by ISBN" endpoint
    // Fall back to Google Books API search using the ISBN
    console.log('⚠️ NYT media by ID not implemented - falling back to Google Books search with ISBN:', isbn);
    
    try {
      // Try to search Google Books using the ISBN
      const searchUrl = this.googleBooksApiKey 
        ? `${GOOGLE_BOOKS_BASE_URL}/volumes?q=isbn:${isbn}&key=${this.googleBooksApiKey}&maxResults=1`
        : `${GOOGLE_BOOKS_BASE_URL}/volumes?q=isbn:${isbn}&maxResults=1`;

      console.log('📚 Searching Google Books by ISBN:', isbn);
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Google Books search error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const volumeInfo = item.volumeInfo || {};

        console.log('✅ Found book via Google Books ISBN search:', {
          title: volumeInfo.title,
          authors: volumeInfo.authors,
          isbn: isbn
        });

        return {
          id: `google_books_${item.id}`, // Use Google Books ID for consistency
          title: volumeInfo.title || 'Unknown Title',
          type: 'book',
          year: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate).getFullYear().toString() : undefined,
          image: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail,
          description: volumeInfo.description,
          source: 'google_books', // Change source to indicate it came from Google Books
          originalId: item.id,
          author: volumeInfo.authors?.join(', '),
          rating: volumeInfo.averageRating,
        };
      } else {
        console.log('📚 No results found in Google Books for ISBN:', isbn);
    return null;
      }
    } catch (error) {
      console.error('❌ Error searching Google Books by ISBN:', error);
      return null;
    }
  }

  /**
   * Fallback media data when API calls fail
   */
  private getFallbackMediaById(id: string): MediaItem | null {
    // Check if it's in our fallback data
    const allFallbackData = [
      ...this.getFallbackPopularItems(),
      ...this.getFallbackTrendingMovies(),
      ...this.getFallbackTrendingTV(),
      ...this.getFallbackTrendingBooks(),
    ];

    const found = allFallbackData.find(item => item.id === id);
    
    if (found) {
      console.log('✅ Found media in fallback data:', found.title);
      return found;
    }

    // If not found, return a basic media item to prevent empty params
    console.log('⚠️ Media not found, returning basic fallback for ID:', id);
    return {
      id,
      title: 'Unknown Media',
      type: 'movie', // Default type
      source: 'popular',
      description: 'Media information not available',
      year: new Date().getFullYear().toString(),
    };
  }
}

// Export singleton instance
export const mediaSearchService = new MediaSearchService(); 