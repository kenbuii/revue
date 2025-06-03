import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { userProfileService, UserProfile, UserStats, MediaPreference, UserReview } from '@/lib/userProfile';
import { likedPostsService, LikedPost } from '@/lib/likedPostsService';
import { useAuth } from './AuthContext';

interface UserProfileContextType {
  // Profile data
  profile: UserProfile | null;
  stats: UserStats;
  mediaPreferences: MediaPreference[];
  recentReviews: UserReview[];
  likedPosts: LikedPost[];
  
  // Loading states
  loadingProfile: boolean;
  loadingStats: boolean;
  loadingMedia: boolean;
  loadingReviews: boolean;
  loadingLikedPosts: boolean;
  
  // Actions
  refreshProfile: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshMediaPreferences: () => Promise<void>;
  refreshRecentReviews: () => Promise<void>;
  refreshLikedPosts: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePicture: (file: Blob) => Promise<{ success: boolean; url?: string; error?: string }>;
  
  // Media preference management
  removeMediaPreference: (mediaId: string) => Promise<{ success: boolean; error?: string }>;
  updateMediaPreferencesOrder: (orderedPreferences: MediaPreference[]) => Promise<{ success: boolean; error?: string }>;
  
  // Liked posts management
  likePost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  unlikePost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Error states
  profileError: string | null;
  statsError: string | null;
  mediaError: string | null;
  reviewsError: string | null;
  likedPostsError: string | null;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

interface UserProfileProviderProps {
  children: ReactNode;
}

export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const { isAuthenticated, user } = useAuth();
  
  // Profile data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ reviewCount: 0, followers: 0, following: 0 });
  const [mediaPreferences, setMediaPreferences] = useState<MediaPreference[]>([]);
  const [recentReviews, setRecentReviews] = useState<UserReview[]>([]);
  const [likedPosts, setLikedPosts] = useState<LikedPost[]>([]);
  
  // Loading states
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingLikedPosts, setLoadingLikedPosts] = useState(false);
  
  // Error states
  const [profileError, setProfileError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [likedPostsError, setLikedPostsError] = useState<string | null>(null);

  // Refresh functions
  const refreshProfile = async () => {
    if (!isAuthenticated || !user) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    setLoadingProfile(true);
    setProfileError(null);
    
    try {
      console.log('🔄 Refreshing user profile...');
      const profileData = await userProfileService.getUserProfile();
      setProfile(profileData);
      console.log('✅ Profile refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing profile:', error);
      setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const refreshStats = async () => {
    if (!isAuthenticated || !user) {
      setStats({ reviewCount: 0, followers: 0, following: 0 });
      setStatsError(null);
      return;
    }

    setLoadingStats(true);
    setStatsError(null);
    
    try {
      console.log('🔄 Refreshing user stats...');
      const statsData = await userProfileService.getUserStats();
      setStats(statsData);
      console.log('✅ Stats refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const refreshMediaPreferences = async () => {
    if (!isAuthenticated || !user) {
      setMediaPreferences([]);
      setMediaError(null);
      return;
    }

    setLoadingMedia(true);
    setMediaError(null);
    
    try {
      console.log('🔄 Refreshing media preferences...');
      const mediaData = await userProfileService.getUserMediaPreferences();
      console.log('🎬 Media data received in context:', {
        length: mediaData.length,
        data: mediaData,
        firstItem: mediaData[0]
      });
      setMediaPreferences(mediaData);
      console.log('✅ Media preferences set in context state, new length:', mediaData.length);
    } catch (error) {
      console.error('❌ Error refreshing media preferences:', error);
      setMediaError(error instanceof Error ? error.message : 'Failed to load media preferences');
    } finally {
      setLoadingMedia(false);
    }
  };

  const refreshRecentReviews = async () => {
    if (!isAuthenticated || !user) {
      setRecentReviews([]);
      setReviewsError(null);
      return;
    }

    setLoadingReviews(true);
    setReviewsError(null);
    
    try {
      console.log('🔄 Refreshing recent reviews...');
      const reviewsData = await userProfileService.getUserRecentReviews();
      setRecentReviews(reviewsData);
      console.log('✅ Recent reviews refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing recent reviews:', error);
      setReviewsError(error instanceof Error ? error.message : 'Failed to load recent reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  const refreshLikedPosts = async () => {
    if (!isAuthenticated || !user) {
      setLikedPosts([]);
      setLikedPostsError(null);
      return;
    }

    setLoadingLikedPosts(true);
    setLikedPostsError(null);
    
    try {
      console.log('🔄 Refreshing liked posts...');
      const likedPostsData = await likedPostsService.getUserLikedPosts();
      setLikedPosts(likedPostsData);
      console.log('✅ Liked posts refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing liked posts:', error);
      setLikedPostsError(error instanceof Error ? error.message : 'Failed to load liked posts');
    } finally {
      setLoadingLikedPosts(false);
    }
  };

  const refreshAll = async () => {
    console.log('🔄 Refreshing all profile data...');
    await Promise.all([
      refreshProfile(),
      refreshStats(),
      refreshMediaPreferences(),
      refreshRecentReviews(),
      refreshLikedPosts(),
    ]);
    console.log('✅ All profile data refreshed');
  };

  // Update profile function
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      console.log('🔄 Updating profile...', updates);
      const result = await userProfileService.updateUserProfile(updates);
      
      if (result.success) {
        // Update local state
        setProfile(prev => prev ? { ...prev, ...updates } : null);
        console.log('✅ Profile updated successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  // Upload profile picture function
  const uploadProfilePicture = async (file: Blob) => {
    try {
      console.log('🔄 Uploading profile picture...');
      const result = await userProfileService.uploadProfilePicture(file);
      
      if (result.success && result.url) {
        // Update local state with new avatar URL
        setProfile(prev => prev ? { ...prev, avatar_url: result.url! } : null);
        console.log('✅ Profile picture uploaded successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  // Media preference management functions
  const removeMediaPreference = async (mediaId: string) => {
    try {
      console.log('🔄 Removing media preference...');
      const result = await userProfileService.removeMediaPreference(mediaId);
      
      if (result.success) {
        // Update local state
        setMediaPreferences(prev => prev.filter(mp => mp.media_id !== mediaId));
        console.log('✅ Media preference removed successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error removing media preference:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const updateMediaPreferencesOrder = async (orderedPreferences: MediaPreference[]) => {
    try {
      console.log('🔄 Updating media preferences order...');
      const result = await userProfileService.updateMediaPreferencesOrder(orderedPreferences);
      
      if (result.success) {
        // Update local state
        setMediaPreferences(orderedPreferences);
        console.log('✅ Media preferences order updated successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error updating media preferences order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  // Liked posts functions
  const likePost = async (postId: string) => {
    try {
      console.log('🔄 Liking post...', postId);
      const result = await likedPostsService.likePost(postId);
      
      if (result.success) {
        // Refresh liked posts to get updated list
        await refreshLikedPosts();
        console.log('✅ Post liked successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error liking post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const unlikePost = async (postId: string) => {
    try {
      console.log('🔄 Unliking post...', postId);
      const result = await likedPostsService.unlikePost(postId);
      
      if (result.success) {
        // Refresh liked posts to get updated list
        await refreshLikedPosts();
        console.log('✅ Post unliked successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error unliking post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  // Effect to load data when authentication changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 Authentication detected, loading profile data...');
      refreshAll();
    } else {
      console.log('🔄 No authentication, clearing profile data...');
      // Clear all data when user logs out
      setProfile(null);
      setStats({ reviewCount: 0, followers: 0, following: 0 });
      setMediaPreferences([]);
      setRecentReviews([]);
      setLikedPosts([]);
      setProfileError(null);
      setStatsError(null);
      setMediaError(null);
      setReviewsError(null);
      setLikedPostsError(null);
    }
  }, [isAuthenticated, user]);

  const contextValue: UserProfileContextType = {
    // Profile data
    profile,
    stats,
    mediaPreferences,
    recentReviews,
    likedPosts,
    
    // Loading states
    loadingProfile,
    loadingStats,
    loadingMedia,
    loadingReviews,
    loadingLikedPosts,
    
    // Actions
    refreshProfile,
    refreshStats,
    refreshMediaPreferences,
    refreshRecentReviews,
    refreshLikedPosts,
    refreshAll,
    updateProfile,
    uploadProfilePicture,
    
    // Media preference management
    removeMediaPreference,
    updateMediaPreferencesOrder,
    
    // Liked posts management
    likePost,
    unlikePost,
    
    // Error states
    profileError,
    statsError,
    mediaError,
    reviewsError,
    likedPostsError,
  };

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
}

// Custom hook to use user profile context
export function useUserProfile() {
  const context = useContext(UserProfileContext);
  
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  
  return context;
} 