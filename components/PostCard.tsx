import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import CommentsModal from '@/components/modals/CommentsModal';
import LikesModal from '@/components/modals/LikesModal';
import PostOptionsModal from '@/components/modals/PostOptionsModal';
import { useBookmarks } from '@/contexts/BookmarksContext';
// Phase 4: Use new unified contexts
import { usePostInteractions } from '@/contexts/PostInteractionsContext';
import { useComments } from '@/contexts/CommentsContext';
import { useHiddenPosts } from '@/contexts/HiddenPostsContext';

// Import our new modular components
import PostHeader from '@/components/post/PostHeader';
import PostContent from '@/components/post/PostContent';
import PostActions from '@/components/post/PostActions';
import PostStats from '@/components/post/PostStats';

interface Media {
  id: string;
  title: string;
  type: string;
  progress?: string;
  cover: string;
}

interface User {
  name: string;
  avatar: string;
}

interface Post {
  id: string;
  user: User;
  media: Media;
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

export default function PostCard({ post }: { post: Post }) {
  // Phase 4: Enhanced state management with new contexts
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  
  // Use bookmarks context
  const { isBookmarked: isPostBookmarked, toggleBookmark } = useBookmarks();
  const isBookmarked = isPostBookmarked(post.id);
  
  // Phase 4: Use unified post interactions context
  const { 
    isLiked: isPostLiked, 
    isFavorited: isPostFavorited, 
    toggleLike, 
    toggleFavorite 
  } = usePostInteractions();
  
  // Phase 4: Use comments context for real-time comment count
  const { getCommentCount } = useComments();
  
  // Phase 4: Use hidden posts context
  const { hidePost, reportPost } = useHiddenPosts();
  
  // Enhanced state with Phase 4 contexts
  const isLiked = isPostLiked(post.id);
  const isFavorited = isPostFavorited(post.id);
  const commentCount = getCommentCount(post.id) || post.commentCount; // Fallback to post data
  
  // Local state for optimistic updates
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount);

  const handleMediaPress = () => {
    // Enhanced navigation - pass all available media data like Search does
    console.log('📱 Media pressed from PostCard, navigating to media detail page for:', post.media.title);
    console.log('🎯 Passing media data:', {
      id: post.media.id,
      title: post.media.title,
      type: post.media.type,
      image: post.media.cover
    });
    
    router.push({
      pathname: '/media/[id]' as const,
      params: {
        id: post.media.id,
        title: post.media.title,
        type: post.media.type,
        year: '', // Not available in post data, but media detail can handle empty
        image: post.media.cover || '', // 🎯 Pass the cover image!
        description: '', // Not available in post data
        rating: '', // Not available in post data  
        author: '', // Not available in post data
        // Flag to indicate this came from feed
        source: 'feed'
      },
    });
  };

  const handlePostPress = () => {
    console.log('Post pressed, navigating to post detail');
    router.push(`/post/${post.id}`);
  };

  const handleCommentsPress = (e?: any) => {
    if (e) e.stopPropagation();
    setShowCommentsModal(true);
  };

  const handleLikesPress = (e?: any) => {
    if (e) e.stopPropagation();
    setShowLikesModal(true);
  };

  const handleBookmarkPress = async (e?: any) => {
    if (e) e.stopPropagation();
    try {
      const newBookmarkState = await toggleBookmark(post);
      console.log('Bookmark toggled:', newBookmarkState);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleFavoritePress = async (e?: any) => {
    if (e) e.stopPropagation();
    try {
      const newFavoriteState = await toggleFavorite(post);
      console.log('Favorite toggled:', newFavoriteState);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Phase 4: Enhanced like functionality with real database integration
  const handleLikePress = async (e?: any) => {
    if (e) e.stopPropagation();
    
    // Optimistic update for like count
    const previousLikeCount = localLikeCount;
    const increment = isLiked ? -1 : 1;
    setLocalLikeCount(prev => prev + increment);

    try {
      console.log('Like toggled for post:', post.id);
      
      // Phase 4: Use real like functionality
      const newLikeState = await toggleLike(post);
      console.log('Like state updated:', newLikeState);
      
    } catch (error) {
      // Revert optimistic update on error
      setLocalLikeCount(previousLikeCount);
      console.error('Error toggling like:', error);
    }
  };

  const handleOptionsPress = (e?: any) => {
    if (e) e.stopPropagation();
    setShowOptionsModal(true);
  };

  // Phase 4: Enhanced hide post functionality
  const handleHidePost = async (postId: string) => {
    console.log('Hiding post:', postId);
    try {
      const result = await hidePost(postId, 'user_hidden');
      if (result.success) {
        console.log('✅ Post hidden successfully');
        // The post will be filtered out in the feed automatically
      } else {
        console.error('❌ Failed to hide post:', result.error);
      }
    } catch (error) {
      console.error('Error hiding post:', error);
    }
  };

  // Phase 4: Enhanced report post functionality with auto-hide
  const handleReportPost = async (postId: string, reason: string) => {
    console.log('Reporting post:', postId, 'for:', reason);
    try {
      // Map generic reason to specific report reason
      const reportReason = reason.toLowerCase().replace(' ', '_') as any;
      const result = await reportPost(postId, reportReason);
      
      if (result.success) {
        console.log('✅ Post reported and hidden successfully');
        // The post will be filtered out automatically
      } else {
        console.error('❌ Failed to report post:', result.error);
      }
    } catch (error) {
      console.error('Error reporting post:', error);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        onPress={handlePostPress} 
        activeOpacity={0.95}
      >
        {/* Post Header - User info and media info */}
        <PostHeader
          user={post.user}
          media={post.media}
          date={post.date}
          onOptionsPress={handleOptionsPress}
          onMediaPress={handleMediaPress}
        />
        
        {/* Post Content - Title, text, and images */}
        <PostContent
          title={post.title}
          contentType={post.contentType}
          content={post.content}
          textContent={post.textContent}
          expandable={true}
          maxLines={4}
        />
        
        {/* Post Stats - Like and comment counts (Phase 4: Enhanced with real-time data) */}
        <PostStats
          commentCount={commentCount}
          likeCount={localLikeCount}
          onCommentsPress={handleCommentsPress}
          onLikesPress={handleLikesPress}
          showLabels={true}
          isCompact={false}
        />
        
        {/* Post Actions - Action buttons (Phase 4: Enhanced with merged like/favorite) */}
        <PostActions
          postId={post.id}
          isBookmarked={isBookmarked}
          isFavorited={isFavorited}
          isLiked={isLiked}
          onCommentsPress={handleCommentsPress}
          onLikesPress={handleLikesPress}
          onBookmarkPress={handleBookmarkPress}
          onFavoritePress={handleFavoritePress}
          onLikePress={handleLikePress}
        />
      </TouchableOpacity>

      {/* Enhanced Modals with Phase 4 Context Integration */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        postId={post.id}
        initialCommentCount={commentCount}
      />

      <LikesModal
        visible={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        postId={post.id}
        initialLikeCount={localLikeCount}
      />

      <PostOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        postId={post.id}
        onHidePost={handleHidePost}
        onReportPost={handleReportPost}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFDF6',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
});
