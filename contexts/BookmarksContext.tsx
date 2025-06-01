import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Post {
  id: string;
  user: { name: string; avatar: string };
  media: { id: string; title: string; type: string; progress?: string; cover: string };
  date: string;
  title?: string;
  contentType: 'image' | 'text' | 'mixed';
  content: string;
  textContent?: string;
  commentCount: number;
  likeCount: number;
  isBookmarked?: boolean;
  isLiked?: boolean;
}

interface BookmarksContextType {
  bookmarkedPosts: Post[];
  addBookmark: (post: Post) => void;
  removeBookmark: (postId: string) => void;
  isBookmarked: (postId: string) => boolean;
  toggleBookmark: (post: Post) => boolean; // Returns new bookmark state
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  const addBookmark = (post: Post) => {
    setBookmarkedPosts(prev => {
      // Check if already bookmarked
      if (prev.some(p => p.id === post.id)) {
        return prev;
      }
      return [...prev, { ...post, isBookmarked: true }];
    });
  };

  const removeBookmark = (postId: string) => {
    setBookmarkedPosts(prev => prev.filter(post => post.id !== postId));
  };

  const isBookmarked = (postId: string) => {
    return bookmarkedPosts.some(post => post.id === postId);
  };

  const toggleBookmark = (post: Post) => {
    const currentlyBookmarked = isBookmarked(post.id);
    
    if (currentlyBookmarked) {
      removeBookmark(post.id);
      return false;
    } else {
      addBookmark(post);
      return true;
    }
  };

  const value: BookmarksContextType = {
    bookmarkedPosts,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
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