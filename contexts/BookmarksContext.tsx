import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { bookmarkService, Post } from '@/lib/bookmarks';

interface BookmarksContextType {
  bookmarkedPosts: Post[];
  addBookmark: (post: Post) => Promise<void>;
  removeBookmark: (postId: string) => Promise<void>;
  isBookmarked: (postId: string) => boolean;
  toggleBookmark: (post: Post) => Promise<boolean>; // Returns new bookmark state
  loading: boolean;
  refreshBookmarks: () => Promise<void>;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Load bookmarks on mount and when auth state changes
  useEffect(() => {
    loadBookmarks();
  }, [isAuthenticated, user]);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && user) {
        console.log('🔖 Loading bookmarks from Supabase...');
        // Try to load from Supabase first
        try {
          const supabaseBookmarks = await bookmarkService.getUserBookmarks();
          setBookmarkedPosts(supabaseBookmarks);
          
          // Save to local storage as backup
          await bookmarkService.saveBookmarksLocally(supabaseBookmarks);
          console.log('✅ Bookmarks loaded from Supabase:', supabaseBookmarks.length);
        } catch (error) {
          console.error('❌ Failed to load from Supabase, falling back to local storage:', error);
          // Fallback to local storage
          const localBookmarks = await bookmarkService.getBookmarksLocally();
          setBookmarkedPosts(localBookmarks);
          console.log('✅ Bookmarks loaded from local storage:', localBookmarks.length);
        }
      } else {
        console.log('🔖 Loading bookmarks from local storage (not authenticated)...');
        // Not authenticated, use local storage only
        const localBookmarks = await bookmarkService.getBookmarksLocally();
        setBookmarkedPosts(localBookmarks);
        console.log('✅ Bookmarks loaded from local storage:', localBookmarks.length);
      }
    } catch (error) {
      console.error('❌ Error loading bookmarks:', error);
      setBookmarkedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBookmarks = async () => {
    await loadBookmarks();
  };

  const addBookmark = async (post: Post) => {
    try {
      console.log('🔖 Adding bookmark:', post.id);
      
      // Check if already bookmarked
      if (bookmarkedPosts.some(p => p.id === post.id)) {
        console.log('⚠️ Post already bookmarked:', post.id);
        return;
      }

      // Update local state immediately for better UX
      const newBookmark = { ...post, isBookmarked: true };
      setBookmarkedPosts(prev => [...prev, newBookmark]);

      // Save to local storage
      const updatedBookmarks = [...bookmarkedPosts, newBookmark];
      await bookmarkService.saveBookmarksLocally(updatedBookmarks);

      // If authenticated, save to Supabase
      if (isAuthenticated && user) {
        try {
          await bookmarkService.addBookmark(post);
          console.log('✅ Bookmark saved to Supabase');
        } catch (error) {
          console.error('❌ Failed to save bookmark to Supabase:', error);
          // The bookmark is still saved locally, so it will sync later
        }
      }
    } catch (error) {
      console.error('❌ Error adding bookmark:', error);
      // Revert local state if something went wrong
      setBookmarkedPosts(prev => prev.filter(p => p.id !== post.id));
    }
  };

  const removeBookmark = async (postId: string) => {
    try {
      console.log('🔖 Removing bookmark:', postId);

      // Update local state immediately
      const updatedBookmarks = bookmarkedPosts.filter(post => post.id !== postId);
      setBookmarkedPosts(updatedBookmarks);

      // Save to local storage
      await bookmarkService.saveBookmarksLocally(updatedBookmarks);

      // If authenticated, remove from Supabase
      if (isAuthenticated && user) {
        try {
          await bookmarkService.removeBookmark(postId);
          console.log('✅ Bookmark removed from Supabase');
        } catch (error) {
          console.error('❌ Failed to remove bookmark from Supabase:', error);
          // The bookmark is still removed locally
        }
      }
    } catch (error) {
      console.error('❌ Error removing bookmark:', error);
      // Revert local state if something went wrong
      await loadBookmarks();
    }
  };

  const isBookmarked = (postId: string) => {
    return bookmarkedPosts.some(post => post.id === postId);
  };

  const toggleBookmark = async (post: Post): Promise<boolean> => {
    const currentlyBookmarked = isBookmarked(post.id);
    
    if (currentlyBookmarked) {
      await removeBookmark(post.id);
      return false;
    } else {
      await addBookmark(post);
      return true;
    }
  };

  // Sync local bookmarks to Supabase when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      const syncBookmarks = async () => {
        try {
          console.log('🔄 Syncing local bookmarks to Supabase...');
          await bookmarkService.syncLocalBookmarksToSupabase();
          // Refresh bookmarks after sync
          await loadBookmarks();
        } catch (error) {
          console.error('❌ Error syncing bookmarks:', error);
        }
      };
      
      syncBookmarks();
    }
  }, [isAuthenticated, user]);

  const value: BookmarksContextType = {
    bookmarkedPosts,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
    loading,
    refreshBookmarks,
  };

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarksProvider');
  }
  return context;
} 