import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseAuth } from '@/lib/supabase';

export interface HiddenPost {
  postId: string;
  reason: 'user_hidden' | 'reported_spam' | 'reported_inappropriate' | 'reported_harassment' | 'reported_other';
  timestamp: string;
  reportDetails?: string;
}

export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'other';

interface HiddenPostsContextType {
  // Hidden posts state
  hiddenPostIds: Set<string>;
  hiddenPosts: HiddenPost[];
  
  // Query methods
  isPostHidden: (postId: string) => boolean;
  getHiddenReason: (postId: string) => string | null;
  
  // Hide actions
  hidePost: (postId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  unhidePost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Report actions (which auto-hide)
  reportPost: (postId: string, reason: ReportReason, details?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Filtering utilities
  filterVisiblePosts: <T extends { id: string }>(posts: T[]) => T[];
  
  // Cache management
  refreshHiddenPosts: () => Promise<void>;
  clearAllHiddenPosts: () => Promise<{ success: boolean; error?: string }>;
  
  // Statistics
  getHiddenPostCount: () => number;
  getReportedPostCount: () => number;
  
  // Loading state
  loading: boolean;
  error: string | null;
}

const HiddenPostsContext = createContext<HiddenPostsContextType | undefined>(undefined);

const HIDDEN_POSTS_STORAGE_KEY = '@revue_hidden_posts';

export function HiddenPostsProvider({ children }: { children: ReactNode }) {
  // State
  const [hiddenPosts, setHiddenPosts] = useState<HiddenPost[]>([]);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state (with error handling)
  let authState;
  try {
    authState = useAuth();
  } catch (error) {
    console.error('HiddenPostsContext: Error accessing auth state:', error);
    authState = { isAuthenticated: false, user: null };
  }
  
  const { isAuthenticated, user } = authState;

  // Load hidden posts on mount and auth changes
  useEffect(() => {
    loadHiddenPosts();
  }, [isAuthenticated, user]);

  // Update hiddenPostIds when hiddenPosts changes
  useEffect(() => {
    const ids = new Set(hiddenPosts.map(hp => hp.postId));
    setHiddenPostIds(ids);
  }, [hiddenPosts]);

  /**
   * Local storage helpers
   */
  const saveHiddenPostsLocally = async (posts: HiddenPost[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(HIDDEN_POSTS_STORAGE_KEY, JSON.stringify(posts));
      console.log('✅ Hidden posts saved locally:', posts.length);
    } catch (error) {
      console.error('❌ Error saving hidden posts locally:', error);
    }
  };

  const getHiddenPostsLocally = async (): Promise<HiddenPost[]> => {
    try {
      const data = await AsyncStorage.getItem(HIDDEN_POSTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error loading hidden posts from local storage:', error);
      return [];
    }
  };

  /**
   * Database helpers (for future implementation)
   */
  const callRPC = async (functionName: string, params: any = {}) => {
    const session = await supabaseAuth.getSession();
    const token = session.data.session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RPC call failed: ${response.status} - ${error}`);
    }

    return response.json();
  };

  /**
   * Load hidden posts from storage and database
   */
  const loadHiddenPosts = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading hidden posts...');

      // Load from local storage first
      const localHiddenPosts = await getHiddenPostsLocally();
      setHiddenPosts(localHiddenPosts);

      // TODO: Sync with database when get_user_hidden_posts function is available
      // For now, we'll use local storage only
      
      console.log('✅ Hidden posts loaded:', localHiddenPosts.length);
    } catch (error) {
      console.error('❌ Error loading hidden posts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load hidden posts');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Query methods
   */
  const isPostHidden = (postId: string): boolean => {
    return hiddenPostIds.has(postId);
  };

  const getHiddenReason = (postId: string): string | null => {
    const hiddenPost = hiddenPosts.find(hp => hp.postId === postId);
    return hiddenPost?.reason || null;
  };

  /**
   * Hide a post manually
   */
  const hidePost = async (postId: string, reason: string = 'user_hidden'): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🙈 Hiding post:', postId, 'reason:', reason);

      // Check if already hidden
      if (isPostHidden(postId)) {
        console.log('⚠️ Post already hidden:', postId);
        return { success: true };
      }

      const hiddenPost: HiddenPost = {
        postId,
        reason: reason as HiddenPost['reason'],
        timestamp: new Date().toISOString(),
      };

      // Update local state
      const updatedHiddenPosts = [...hiddenPosts, hiddenPost];
      setHiddenPosts(updatedHiddenPosts);

      // Save locally
      await saveHiddenPostsLocally(updatedHiddenPosts);

      // TODO: Save to database when hide_post function is available
      // await callRPC('hide_post', { p_post_id: postId, p_reason: reason });

      console.log('✅ Post hidden successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error hiding post:', error);
      
      // Revert local state
      await loadHiddenPosts();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to hide post',
      };
    }
  };

  /**
   * Unhide a post
   */
  const unhidePost = async (postId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('👁️ Unhiding post:', postId);

      // Check if actually hidden
      if (!isPostHidden(postId)) {
        console.log('⚠️ Post not hidden:', postId);
        return { success: true };
      }

      // Update local state
      const updatedHiddenPosts = hiddenPosts.filter(hp => hp.postId !== postId);
      setHiddenPosts(updatedHiddenPosts);

      // Save locally
      await saveHiddenPostsLocally(updatedHiddenPosts);

      // TODO: Save to database when unhide_post function is available
      // await callRPC('unhide_post', { p_post_id: postId });

      console.log('✅ Post unhidden successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error unhiding post:', error);
      
      // Revert local state
      await loadHiddenPosts();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unhide post',
      };
    }
  };

  /**
   * Report a post (which automatically hides it)
   */
  const reportPost = async (postId: string, reason: ReportReason, details?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚨 Reporting post:', postId, 'reason:', reason);

      const reportReason = `reported_${reason}` as HiddenPost['reason'];
      
      const hiddenPost: HiddenPost = {
        postId,
        reason: reportReason,
        timestamp: new Date().toISOString(),
        reportDetails: details,
      };

      // Update local state (this also hides the post)
      const updatedHiddenPosts = hiddenPosts.filter(hp => hp.postId !== postId); // Remove any existing entry
      updatedHiddenPosts.push(hiddenPost);
      setHiddenPosts(updatedHiddenPosts);

      // Save locally
      await saveHiddenPostsLocally(updatedHiddenPosts);

      // TODO: Save to database and notify moderation system
      // await callRPC('report_post', { p_post_id: postId, p_reason: reason, p_details: details });

      console.log('✅ Post reported and hidden successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error reporting post:', error);
      
      // Revert local state
      await loadHiddenPosts();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to report post',
      };
    }
  };

  /**
   * Filter posts to exclude hidden ones
   */
  const filterVisiblePosts = <T extends { id: string }>(posts: T[]): T[] => {
    return posts.filter(post => !isPostHidden(post.id));
  };

  /**
   * Refresh hidden posts from database
   */
  const refreshHiddenPosts = async (): Promise<void> => {
    await loadHiddenPosts();
  };

  /**
   * Clear all hidden posts
   */
  const clearAllHiddenPosts = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🧹 Clearing all hidden posts');

      setHiddenPosts([]);
      await saveHiddenPostsLocally([]);

      // TODO: Clear from database when available
      // await callRPC('clear_hidden_posts');

      console.log('✅ All hidden posts cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing hidden posts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear hidden posts',
      };
    }
  };

  /**
   * Statistics
   */
  const getHiddenPostCount = (): number => {
    return hiddenPosts.length;
  };

  const getReportedPostCount = (): number => {
    return hiddenPosts.filter(hp => hp.reason.startsWith('reported_')).length;
  };

  const value: HiddenPostsContextType = {
    // Hidden posts state
    hiddenPostIds,
    hiddenPosts,
    
    // Query methods
    isPostHidden,
    getHiddenReason,
    
    // Hide actions
    hidePost,
    unhidePost,
    
    // Report actions
    reportPost,
    
    // Filtering utilities
    filterVisiblePosts,
    
    // Cache management
    refreshHiddenPosts,
    clearAllHiddenPosts,
    
    // Statistics
    getHiddenPostCount,
    getReportedPostCount,
    
    // Loading state
    loading,
    error,
  };

  return (
    <HiddenPostsContext.Provider value={value}>
      {children}
    </HiddenPostsContext.Provider>
  );
}

export function useHiddenPosts() {
  const context = useContext(HiddenPostsContext);
  if (context === undefined) {
    throw new Error('useHiddenPosts must be used within a HiddenPostsProvider');
  }
  return context;
}

// Convenience hook for filtering posts in feeds
export function useVisiblePosts<T extends { id: string }>(posts: T[]) {
  const { filterVisiblePosts } = useHiddenPosts();
  return filterVisiblePosts(posts);
} 