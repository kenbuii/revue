import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { commentsService, Comment, CreateCommentParams } from '@/lib/commentsService';

interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  lastFetched: number;
}

interface CommentsContextType {
  // Comment state by post ID
  getPostComments: (postId: string) => Comment[];
  getPostCommentsState: (postId: string) => CommentState;
  
  // Comment actions
  loadComments: (postId: string, forceRefresh?: boolean) => Promise<void>;
  createComment: (params: CreateCommentParams) => Promise<{ success: boolean; comment?: Comment; error?: string }>;
  toggleCommentLike: (commentId: string, postId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Real-time updates
  addCommentToPost: (postId: string, comment: Comment) => void;
  updateCommentInPost: (postId: string, commentId: string, updates: Partial<Comment>) => void;
  removeCommentFromPost: (postId: string, commentId: string) => void;
  
  // Cache management
  clearCache: () => void;
  refreshAllComments: () => Promise<void>;
  
  // Utility
  getCommentCount: (postId: string) => number;
  isLoadingComments: (postId: string) => boolean;
}

const CommentsContext = createContext<CommentsContextType | undefined>(undefined);

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

export function CommentsProvider({ children }: { children: ReactNode }) {
  // State: Map of postId -> CommentState
  const [commentsCache, setCommentsCache] = useState<Map<string, CommentState>>(new Map());

  // Auth state (with error handling)
  let authState;
  try {
    authState = useAuth();
  } catch (error) {
    console.error('CommentsContext: Error accessing auth state:', error);
    authState = { isAuthenticated: false, user: null };
  }
  
  const { isAuthenticated, user } = authState;

  /**
   * Get comments for a specific post
   */
  const getPostComments = (postId: string): Comment[] => {
    const state = commentsCache.get(postId);
    return state?.comments || [];
  };

  /**
   * Get full comment state for a post
   */
  const getPostCommentsState = (postId: string): CommentState => {
    return commentsCache.get(postId) || {
      comments: [],
      loading: false,
      error: null,
      lastFetched: 0,
    };
  };

  /**
   * Check if cache is still fresh
   */
  const isCacheFresh = (postId: string): boolean => {
    const state = commentsCache.get(postId);
    if (!state || state.lastFetched === 0) return false;
    
    const now = Date.now();
    return (now - state.lastFetched) < CACHE_TTL;
  };

  /**
   * Update comment state for a post
   */
  const updateCommentState = (postId: string, updates: Partial<CommentState>) => {
    setCommentsCache(prev => {
      const newCache = new Map(prev);
      const currentState = newCache.get(postId) || {
        comments: [],
        loading: false,
        error: null,
        lastFetched: 0,
      };
      
      newCache.set(postId, { ...currentState, ...updates });
      return newCache;
    });
  };

  /**
   * Load comments for a post (memoized to prevent infinite loops)
   */
  const loadComments = useCallback(async (postId: string, forceRefresh: boolean = false): Promise<void> => {
    console.log('💬 Loading comments for post:', postId);

    // Check cache first (unless force refresh)
    if (!forceRefresh && isCacheFresh(postId)) {
      console.log('📋 Using cached comments for post:', postId);
      return;
    }

    // Set loading state
    updateCommentState(postId, { loading: true, error: null });

    try {
      const comments = await commentsService.getPostComments(postId);
      
      updateCommentState(postId, {
        comments,
        loading: false,
        error: null,
        lastFetched: Date.now(),
      });

      console.log('✅ Comments loaded for post:', postId, '- Count:', comments.length);
    } catch (error) {
      console.error('❌ Error loading comments for post:', postId, error);
      
      updateCommentState(postId, {
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load comments',
        lastFetched: 0,
      });
    }
  }, [commentsCache]); // Depend on commentsCache to ensure proper memoization

  /**
   * Create a new comment (memoized)
   */
  const createComment = useCallback(async (params: CreateCommentParams): Promise<{ success: boolean; comment?: Comment; error?: string }> => {
    console.log('✍️ Creating comment for post:', params.post_id);

    try {
      const result = await commentsService.createComment(params);
      
      if (result.success && result.comment) {
        // Add comment to cache immediately for optimistic update
        const currentState = getPostCommentsState(params.post_id);
        const updatedComments = [result.comment, ...currentState.comments];
        
        updateCommentState(params.post_id, {
          comments: updatedComments,
          lastFetched: Date.now(),
        });

        console.log('✅ Comment created and added to cache:', result.comment.id);
        return result;
      } else {
        console.error('❌ Comment creation failed:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Error creating comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      };
    }
  }, []);

  /**
   * Toggle like on a comment (memoized)
   */
  const toggleCommentLike = useCallback(async (commentId: string, postId: string): Promise<{ success: boolean; error?: string }> => {
    console.log('👍 Toggling like on comment:', commentId);

    try {
      const result = await commentsService.likeComment(commentId);
      
      if (result.success) {
        // Update comment in cache
        updateCommentInPost(postId, commentId, {
          is_liked_by_user: result.isLiked || false,
          like_count: result.likeCount || 0,
        });

        console.log('✅ Comment like toggled successfully');
        return { success: true };
      } else {
        console.error('❌ Comment like toggle failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error toggling comment like:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle comment like',
      };
    }
  }, []);

  /**
   * Real-time update methods
   */
  const addCommentToPost = (postId: string, comment: Comment) => {
    const currentState = getPostCommentsState(postId);
    const updatedComments = [comment, ...currentState.comments];
    
    updateCommentState(postId, {
      comments: updatedComments,
      lastFetched: Date.now(),
    });

    console.log('📝 Comment added to post in real-time:', postId, comment.id);
  };

  const updateCommentInPost = (postId: string, commentId: string, updates: Partial<Comment>) => {
    const currentState = getPostCommentsState(postId);
    const updatedComments = currentState.comments.map(comment =>
      comment.id === commentId ? { ...comment, ...updates } : comment
    );
    
    updateCommentState(postId, {
      comments: updatedComments,
      lastFetched: Date.now(),
    });

    console.log('🔄 Comment updated in post:', postId, commentId);
  };

  const removeCommentFromPost = (postId: string, commentId: string) => {
    const currentState = getPostCommentsState(postId);
    const updatedComments = currentState.comments.filter(comment => comment.id !== commentId);
    
    updateCommentState(postId, {
      comments: updatedComments,
      lastFetched: Date.now(),
    });

    console.log('🗑️ Comment removed from post:', postId, commentId);
  };

  /**
   * Cache management
   */
  const clearCache = () => {
    setCommentsCache(new Map());
    console.log('🧹 Comments cache cleared');
  };

  const refreshAllComments = async () => {
    console.log('🔄 Refreshing all cached comments');
    
    const postIds = Array.from(commentsCache.keys());
    
    // Refresh all cached posts
    await Promise.all(
      postIds.map(postId => loadComments(postId, true))
    );
    
    console.log('✅ All comments refreshed');
  };

  /**
   * Utility methods
   */
  const getCommentCount = (postId: string): number => {
    const comments = getPostComments(postId);
    return comments.length;
  };

  const isLoadingComments = (postId: string): boolean => {
    const state = getPostCommentsState(postId);
    return state.loading;
  };

  // Clear cache when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      clearCache();
    }
  }, [isAuthenticated]);

  const value: CommentsContextType = {
    // Comment state by post ID
    getPostComments,
    getPostCommentsState,
    
    // Comment actions
    loadComments,
    createComment,
    toggleCommentLike,
    
    // Real-time updates
    addCommentToPost,
    updateCommentInPost,
    removeCommentFromPost,
    
    // Cache management
    clearCache,
    refreshAllComments,
    
    // Utility
    getCommentCount,
    isLoadingComments,
  };

  return (
    <CommentsContext.Provider value={value}>
      {children}
    </CommentsContext.Provider>
  );
}

export function useComments() {
  const context = useContext(CommentsContext);
  if (context === undefined) {
    throw new Error('useComments must be used within a CommentsProvider');
  }
  return context;
}

// Convenience hook for a specific post
export function usePostComments(postId: string) {
  const {
    getPostComments,
    getPostCommentsState,
    loadComments,
    createComment,
    toggleCommentLike,
    getCommentCount,
    isLoadingComments,
  } = useComments();

  const comments = getPostComments(postId);
  const state = getPostCommentsState(postId);

  // Auto-load comments when hook is used (with proper dependencies)
  useEffect(() => {
    if (postId) {
      loadComments(postId);
    }
  }, [postId, loadComments]); // Fixed: Added loadComments to dependencies

  return {
    comments,
    loading: state.loading,
    error: state.error,
    commentCount: getCommentCount(postId),
    
    // Actions scoped to this post
    loadComments: (forceRefresh?: boolean) => loadComments(postId, forceRefresh),
    createComment: (content: string, parentCommentId?: string) => 
      createComment({ post_id: postId, content, parent_comment_id: parentCommentId }),
    toggleCommentLike: (commentId: string) => toggleCommentLike(commentId, postId),
  };
} 