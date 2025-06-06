import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { favoriteService, Post } from '@/lib/favorites';
import { likesService } from '@/lib/likesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced interaction types
export type InteractionType = 'like' | 'favorite';

export interface PostInteraction {
  postId: string;
  type: InteractionType;
  timestamp: string;
}

interface PostInteractionsContextType {
  // Combined state
  likedPosts: Post[];
  favoritedPosts: Post[];
  
  // Interaction methods
  toggleLike: (post: Post) => Promise<boolean>; // Returns new like state
  toggleFavorite: (post: Post) => Promise<boolean>; // Returns new favorite state
  
  // Query methods
  isLiked: (postId: string) => boolean;
  isFavorited: (postId: string) => boolean;
  
  // Batch operations
  refreshInteractions: () => Promise<void>;
  
  // Loading states
  loadingLikes: boolean;
  loadingFavorites: boolean;
  
  // Error states
  likesError: string | null;
  favoritesError: string | null;
}

const PostInteractionsContext = createContext<PostInteractionsContextType | undefined>(undefined);

const LIKES_STORAGE_KEY = '@revue_likes';
const FAVORITES_STORAGE_KEY = '@revue_favorites';

export function PostInteractionsProvider({ children }: { children: ReactNode }) {
  // State management
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [favoritedPosts, setFavoritedPosts] = useState<Post[]>([]);
  
  // Loading states
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  
  // Error states
  const [likesError, setLikesError] = useState<string | null>(null);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  // Auth state (with error handling)
  let authState;
  try {
    authState = useAuth();
  } catch (error) {
    console.error('PostInteractionsContext: Error accessing auth state:', error);
    authState = { isAuthenticated: false, user: null };
  }
  
  const { isAuthenticated, user } = authState;

  // Load interactions on mount and auth changes
  useEffect(() => {
    loadAllInteractions();
  }, [isAuthenticated, user]);

  /**
   * Local storage helpers
   */
  const saveLikesLocally = async (posts: Post[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(posts));
      console.log('✅ Likes saved locally:', posts.length);
    } catch (error) {
      console.error('❌ Error saving likes locally:', error);
    }
  };

  const getLikesLocally = async (): Promise<Post[]> => {
    try {
      const data = await AsyncStorage.getItem(LIKES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error loading likes from local storage:', error);
      return [];
    }
  };

  const saveFavoritesLocally = async (posts: Post[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(posts));
      console.log('✅ Favorites saved locally:', posts.length);
    } catch (error) {
      console.error('❌ Error saving favorites locally:', error);
    }
  };

  const getFavoritesLocally = async (): Promise<Post[]> => {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error loading favorites from local storage:', error);
      return [];
    }
  };

  /**
   * Load all interactions
   */
  const loadAllInteractions = async () => {
    await Promise.all([
      loadLikes(),
      loadFavorites()
    ]);
  };

  const loadLikes = async () => {
    setLoadingLikes(true);
    setLikesError(null);
    
    try {
      // For now, use local storage. In future, sync with database
      const likes = await getLikesLocally();
      setLikedPosts(likes);
      console.log('✅ Likes loaded:', likes.length);
    } catch (error) {
      console.error('❌ Error loading likes:', error);
      setLikesError(error instanceof Error ? error.message : 'Failed to load likes');
      setLikedPosts([]);
    } finally {
      setLoadingLikes(false);
    }
  };

  const loadFavorites = async () => {
    setLoadingFavorites(true);
    setFavoritesError(null);
    
    try {
      const favorites = await favoriteService.getUserFavorites();
      setFavoritedPosts(favorites);
      console.log('✅ Favorites loaded:', favorites.length);
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setFavoritesError(error instanceof Error ? error.message : 'Failed to load favorites');
      setFavoritedPosts([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  /**
   * Like functionality
   */
  const toggleLike = async (post: Post): Promise<boolean> => {
    const currentlyLiked = isLiked(post.id);
    
    try {
      if (currentlyLiked) {
        // Remove like
        console.log('💔 Removing like from post:', post.id);
        
        // Optimistic update
        const updatedLikes = likedPosts.filter(p => p.id !== post.id);
        setLikedPosts(updatedLikes);
        
        // Persist locally
        await saveLikesLocally(updatedLikes);
        
        // TODO: Call database service when available
        await likesService.togglePostLike(post.id);
        
        return false;
      } else {
        // Add like
        console.log('❤️ Adding like to post:', post.id);
        
        // Optimistic update
        const likedPost = { ...post, isLiked: true };
        const updatedLikes = [...likedPosts, likedPost];
        setLikedPosts(updatedLikes);
        
        // Persist locally
        await saveLikesLocally(updatedLikes);
        
        // TODO: Call database service when available
        await likesService.togglePostLike(post.id);
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      
      // Revert optimistic update
      await loadLikes();
      
      throw error;
    }
  };

  /**
   * Favorite functionality (using existing service)
   */
  const toggleFavorite = async (post: Post): Promise<boolean> => {
    const currentlyFavorited = isFavorited(post.id);
    
    try {
      if (currentlyFavorited) {
        console.log('⭐ Removing favorite from post:', post.id);
        
        // Optimistic update
        const updatedFavorites = favoritedPosts.filter(p => p.id !== post.id);
        setFavoritedPosts(updatedFavorites);
        
        // Call service
        const result = await favoriteService.removeFavorite(post.id);
        
        if (!result.success) {
          // Revert on failure
          await loadFavorites();
          throw new Error(result.error);
        }
        
        return false;
      } else {
        console.log('🌟 Adding favorite to post:', post.id);
        
        // Optimistic update
        const favoritedPost = { ...post, isLiked: true };
        const updatedFavorites = [...favoritedPosts, favoritedPost];
        setFavoritedPosts(updatedFavorites);
        
        // Call service
        const result = await favoriteService.addFavorite(post);
        
        if (!result.success) {
          // Revert on failure
          await loadFavorites();
          throw new Error(result.error);
        }
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      
      // Revert optimistic update
      await loadFavorites();
      
      throw error;
    }
  };

  /**
   * Query methods
   */
  const isLiked = (postId: string): boolean => {
    return likedPosts.some(post => post.id === postId);
  };

  const isFavorited = (postId: string): boolean => {
    return favoritedPosts.some(post => post.id === postId);
  };

  /**
   * Refresh all interactions
   */
  const refreshInteractions = async () => {
    await loadAllInteractions();
  };

  const value: PostInteractionsContextType = {
    // Combined state
    likedPosts,
    favoritedPosts,
    
    // Interaction methods
    toggleLike,
    toggleFavorite,
    
    // Query methods
    isLiked,
    isFavorited,
    
    // Batch operations
    refreshInteractions,
    
    // Loading states
    loadingLikes,
    loadingFavorites,
    
    // Error states
    likesError,
    favoritesError,
  };

  return (
    <PostInteractionsContext.Provider value={value}>
      {children}
    </PostInteractionsContext.Provider>
  );
}

export function usePostInteractions() {
  const context = useContext(PostInteractionsContext);
  if (context === undefined) {
    throw new Error('usePostInteractions must be used within a PostInteractionsProvider');
  }
  return context;
}

// Backward compatibility hooks
export function useLikes() {
  const { likedPosts, toggleLike, isLiked, loadingLikes, likesError } = usePostInteractions();
  return {
    likedPosts,
    toggleLike,
    isLiked,
    loading: loadingLikes,
    error: likesError,
  };
}

export function useFavorites() {
  const { favoritedPosts, toggleFavorite, isFavorited, loadingFavorites, favoritesError } = usePostInteractions();
  return {
    favoritePosts: favoritedPosts,
    toggleFavorite,
    isFavorited,
    loading: loadingFavorites,
    error: favoritesError,
    // Legacy methods for backward compatibility
    addFavorite: async (post: Post) => {
      await toggleFavorite(post);
    },
    removeFavorite: async (postId: string) => {
      const post = favoritedPosts.find(p => p.id === postId);
      if (post) {
        await toggleFavorite(post);
      }
    },
    refreshFavorites: async () => {
      // This will be handled by the main context
    },
  };
} 