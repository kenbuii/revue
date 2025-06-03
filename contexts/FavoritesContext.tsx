import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { favoriteService, Post } from '@/lib/favorites';

interface FavoritesContextType {
  favoritePosts: Post[];
  addFavorite: (post: Post) => Promise<void>;
  removeFavorite: (postId: string) => Promise<void>;
  isFavorited: (postId: string) => boolean;
  toggleFavorite: (post: Post) => Promise<boolean>; // Returns new favorite state
  loading: boolean;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const favorites = await favoriteService.getUserFavorites();
      setFavoritePosts(favorites);
      console.log('✅ Favorites loaded:', favorites.length);
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setFavoritePosts([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshFavorites = async () => {
    await loadFavorites();
  };

  const addFavorite = async (post: Post) => {
    try {
      console.log('❤️ Adding favorite:', post.id);
      
      // Check if already favorited
      if (favoritePosts.some(p => p.id === post.id)) {
        console.log('⚠️ Post already favorited:', post.id);
        return;
      }

      // Update local state immediately for better UX
      const newFavorite = { ...post, isLiked: true };
      setFavoritePosts(prev => [...prev, newFavorite]);

      // Save to storage
      const result = await favoriteService.addFavorite(post);
      
      if (!result.success) {
        // Revert local state if storage save failed
        setFavoritePosts(prev => prev.filter(p => p.id !== post.id));
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Error adding favorite:', error);
      // Revert local state if something went wrong
      setFavoritePosts(prev => prev.filter(p => p.id !== post.id));
    }
  };

  const removeFavorite = async (postId: string) => {
    try {
      console.log('💔 Removing favorite:', postId);

      // Update local state immediately
      const updatedFavorites = favoritePosts.filter(post => post.id !== postId);
      setFavoritePosts(updatedFavorites);

      // Remove from storage
      const result = await favoriteService.removeFavorite(postId);
      
      if (!result.success) {
        // Revert local state if storage removal failed
        await loadFavorites();
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Error removing favorite:', error);
      // Revert local state if something went wrong
      await loadFavorites();
    }
  };

  const isFavorited = (postId: string) => {
    return favoritePosts.some(post => post.id === postId);
  };

  const toggleFavorite = async (post: Post): Promise<boolean> => {
    const currentlyFavorited = isFavorited(post.id);
    
    if (currentlyFavorited) {
      await removeFavorite(post.id);
      return false;
    } else {
      await addFavorite(post);
      return true;
    }
  };

  const value: FavoritesContextType = {
    favoritePosts,
    addFavorite,
    removeFavorite,
    isFavorited,
    toggleFavorite,
    loading,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
} 