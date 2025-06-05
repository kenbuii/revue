import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';

// Import our new contexts and services
import { usePostComments } from '@/contexts/CommentsContext';
import { usePostInteractions } from '@/contexts/PostInteractionsContext';
import { useBookmarks } from '@/contexts/BookmarksContext';
import { Comment } from '@/lib/commentsService';
import { samplePosts } from '@/constants/mockData';

// Import reusable components
import PostHeader from '@/components/post/PostHeader';
import PostContent from '@/components/post/PostContent';
import PostActions from '@/components/post/PostActions';
import PostStats from '@/components/post/PostStats';

// TypeScript interfaces for better type safety
interface Post {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  media: {
    id: string;
    title: string;
    type: string;
    cover: string;
    progress?: string;
  };
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

interface CommentItemProps {
  comment: Comment;
  postId: string;
  isReply?: boolean;
}

function CommentItem({ comment, postId, isReply = false }: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [likingComment, setLikingComment] = useState(false);
  
  const { createComment, toggleCommentLike } = usePostComments(postId);

  const handleLike = async () => {
    if (likingComment) return; // Prevent double-clicks
    
    try {
      setLikingComment(true);
      console.log('👍 Toggling like on comment:', comment.id);
      await toggleCommentLike(comment.id);
    } catch (error) {
      console.error('❌ Error liking comment:', error);
      Alert.alert('Error', 'Failed to like comment. Please try again.');
    } finally {
      setLikingComment(false);
    }
  };

  const handleReply = () => {
    if (submittingReply) return; // Prevent action while submitting
    setShowReplyInput(!showReplyInput);
  };

  const submitReply = async () => {
    if (!replyText.trim() || submittingReply) return;
    
    setSubmittingReply(true);
    try {
      console.log('📝 Submitting reply to comment:', comment.id);
      const result = await createComment(replyText, comment.id);
      
      if (result.success) {
        setReplyText('');
        setShowReplyInput(false);
        console.log('✅ Reply submitted successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit reply');
      }
    } catch (error) {
      console.error('❌ Error submitting reply:', error);
      Alert.alert('Error', 'Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get display name for user
  const getDisplayName = () => {
    return comment.display_name || comment.username || 'Anonymous';
  };

  return (
    <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
      {isReply && <View style={styles.replyLine} />}
      <View style={styles.commentContent}>
        <View style={styles.commentAvatar}>
          <Text style={styles.avatarText}>{getDisplayName().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{getDisplayName()}</Text>
            <Text style={styles.commentTimestamp}>{formatTimestamp(comment.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
          
          <View style={styles.commentActions}>
            {!isReply && (
              <TouchableOpacity 
                style={[styles.commentAction, submittingReply && styles.disabledAction]} 
                onPress={handleReply}
                disabled={submittingReply}
              >
                <Ionicons name="chatbox-ellipses-outline" size={16} color={submittingReply ? "#CCC" : "#666"} />
                <Text style={[styles.commentActionText, submittingReply && styles.disabledText]}>Reply</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.commentAction, likingComment && styles.disabledAction]} 
              onPress={handleLike}
              disabled={likingComment}
            >
              {likingComment ? (
                <ActivityIndicator size={16} color="#666" />
              ) : (
                <Ionicons 
                  name={comment.is_liked_by_user ? "heart" : "heart-outline"} 
                  size={16} 
                  color={comment.is_liked_by_user ? "#FF6B6B" : "#666"} 
                />
              )}
              <Text style={[styles.commentActionText, likingComment && styles.disabledText]}>
                {comment.like_count}
              </Text>
            </TouchableOpacity>
          </View>

          {showReplyInput && (
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${getDisplayName()}...`}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
                editable={!submittingReply}
              />
              <View style={styles.replyInputActions}>
                <TouchableOpacity 
                  onPress={() => setShowReplyInput(false)}
                  disabled={submittingReply}
                >
                  <Text style={[styles.cancelButton, submittingReply && styles.disabledText]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.replyButton, (!replyText.trim() || submittingReply) && styles.replyButtonDisabled]}
                  onPress={submitReply}
                  disabled={!replyText.trim() || submittingReply}
                >
                  {submittingReply ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.replyButtonText}>Reply</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const postId = Array.isArray(id) ? id[0] : id || '';

  // Validate UUID format to prevent invalid post ID issues
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // State
  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [postError, setPostError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [performingAction, setPerformingAction] = useState(false); // For like/favorite/bookmark actions

  // Early validation - prevent loading if invalid post ID
  useEffect(() => {
    if (!postId) {
      setPostError('No post ID provided');
      setLoadingPost(false);
      return;
    }
    
    if (!isValidUUID(postId)) {
      console.error('❌ Invalid post ID format:', postId);
      setPostError(`Invalid post ID format: "${postId}"`);
      setLoadingPost(false);
      return;
    }
    
    // Additional check for obviously invalid IDs
    if (postId === 'undefined' || postId === 'null' || postId.length < 10) {
      console.error('❌ Suspicious post ID detected:', postId);
      setPostError(`Invalid post ID: "${postId}"`);
      setLoadingPost(false);
      return;
    }
    
    // Clear any previous errors
    setPostError(null);
  }, [postId]);

  // Contexts - with error boundaries
  const { 
    comments, 
    loading: loadingComments, 
    error: commentsError,
    commentCount,
    createComment,
    loadComments 
  } = usePostComments(postId && !postError ? postId : '');  // Only initialize if valid postId
  
  const { 
    isLiked, 
    isFavorited, 
    toggleLike, 
    toggleFavorite 
  } = usePostInteractions();
  
  const { isBookmarked, toggleBookmark } = useBookmarks();

  // Load post data
  useEffect(() => {
    if (postId && !postError && isValidUUID(postId)) {
      loadPostData();
    }
  }, [postId, postError]);

  const loadPostData = async () => {
    try {
      setLoadingPost(true);
      setPostError(null); // Clear any previous errors
      console.log('📄 Loading post data for ID:', postId);
      
      // For now, use mock data (postsService can be added later)
      const postData = samplePosts.find(p => p.id === postId) || samplePosts[0];
      
      setPost(postData);
      console.log('✅ Post data loaded:', postData?.title || 'Untitled');
    } catch (error) {
      console.error('❌ Error loading post:', error);
      setPostError('Failed to load post. Please try again.');
    } finally {
      setLoadingPost(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    
    setSubmittingComment(true);
    try {
      console.log('💬 Submitting comment to post:', postId);
      const result = await createComment(newComment);
      
      if (result.success) {
        setNewComment('');
        console.log('✅ Comment submitted successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit comment');
      }
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikePress = async () => {
    if (!post || performingAction) return;
    
    try {
      setPerformingAction(true);
      console.log('❤️ Toggling like on post:', postId);
      await toggleLike(post);
    } catch (error) {
      console.error('❌ Error liking post:', error);
      Alert.alert('Error', 'Failed to like post. Please try again.');
    } finally {
      setPerformingAction(false);
    }
  };

  const handleFavoritePress = async () => {
    if (!post || performingAction) return;
    
    try {
      setPerformingAction(true);
      console.log('⭐ Toggling favorite on post:', postId);
      await toggleFavorite(post);
    } catch (error) {
      console.error('❌ Error favoriting post:', error);
      Alert.alert('Error', 'Failed to favorite post. Please try again.');
    } finally {
      setPerformingAction(false);
    }
  };

  const handleBookmarkPress = async () => {
    if (!post || performingAction) return;
    
    try {
      setPerformingAction(true);
      console.log('🔖 Toggling bookmark on post:', postId);
      await toggleBookmark(post);
    } catch (error) {
      console.error('❌ Error bookmarking post:', error);
      Alert.alert('Error', 'Failed to bookmark post. Please try again.');
    } finally {
      setPerformingAction(false);
    }
  };

  const handleMediaPress = () => {
    if (performingAction || loadingPost) return; // Prevent navigation during actions
    
    if (post?.media?.id) {
      router.push(`/media/${post.media.id}`);
    }
  };

  const handleCommentsPress = () => {
    if (performingAction) return;
    // Already on comments view, could scroll to comments section
    console.log('Comments pressed - already viewing comments');
  };

  const handleLikesPress = () => {
    if (performingAction) return;
    // Could open likes modal or navigate to likes page
    console.log('Likes pressed - could show likes modal');
  };

  // Loading state
  if (loadingPost) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader showBackButton={true} title="Loading..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004D00" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (postError || (!post && !loadingPost)) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader showBackButton={true} title="Error" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>
            {postError ? 'Invalid Post' : 'Post Not Found'}
          </Text>
          <Text style={styles.errorMessage}>
            {postError || 'The requested post could not be loaded.'}
          </Text>
          {postError && (
            <Text style={styles.errorDetails}>
              Tip: Post creation should use the proper post flow, not direct post URLs.
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <AppHeader showBackButton={true} title="Post" />
      
      <ScrollView style={styles.content}>
        {/* Enhanced Original Post using reusable components */}
        {post && (
        <View style={styles.originalPost}>
          <PostHeader
            user={post.user}
            media={post.media}
            date={post.date}
            onMediaPress={handleMediaPress}
            onOptionsPress={() => console.log('Options pressed')}
          />
          
          <PostContent
            title={post.title}
            contentType={post.contentType}
            content={post.content}
            textContent={post.textContent}
            expandable={false} // Always show full content on detail page
          />

          <PostStats
            commentCount={commentCount}
            likeCount={post.likeCount}
            onCommentsPress={handleCommentsPress}
            onLikesPress={handleLikesPress}
            showLabels={true}
            isCompact={false}
          />

          <PostActions
            postId={post.id}
            isBookmarked={isBookmarked(post.id)}
            isFavorited={isFavorited(post.id)}
            isLiked={isLiked(post.id)}
            onCommentsPress={handleCommentsPress}
            onLikesPress={handleLikesPress}
            onLikePress={handleLikePress}
            onFavoritePress={handleFavoritePress}
            onBookmarkPress={handleBookmarkPress}
          />
        </View>
        )}

        {/* Enhanced Comment Input */}
        {post && (
        <View style={styles.commentInputSection}>
          <View style={styles.commentAvatar}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={[styles.commentInput, submittingComment && styles.disabledInput]}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              editable={!submittingComment}
            />
            <TouchableOpacity 
              style={[
                styles.commentSubmitButton, 
                (!newComment.trim() || submittingComment) && styles.commentSubmitButtonDisabled
              ]}
              onPress={submitComment}
              disabled={!newComment.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.commentSubmitButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Enhanced Comments Thread with real data */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments {commentCount > 0 && `(${commentCount})`}
          </Text>
          
          {loadingComments ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color="#004D00" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : commentsError ? (
            <View style={styles.commentsError}>
              <Text style={styles.errorText}>{commentsError}</Text>
              <TouchableOpacity onPress={() => loadComments(true)}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts!</Text>
            </View>
          ) : (
            comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} postId={postId} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorDetails: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#004D00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  originalPost: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFDF6',
  },
  commentInputSection: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFDF6',
  },
  commentInputContainer: {
    flex: 1,
    marginLeft: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  commentSubmitButton: {
    backgroundColor: '#004D00',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'flex-end',
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  commentSubmitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  commentsSection: {
    padding: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  commentsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  commentsError: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 8,
  },
  retryText: {
    color: '#004D00',
    fontWeight: '600',
  },
  noComments: {
    padding: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  commentContainer: {
    marginBottom: 16,
  },
  replyContainer: {
    marginLeft: 20,
    marginTop: 8,
  },
  replyLine: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E8E8E8',
  },
  commentContent: {
    flexDirection: 'row',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#004D00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUsername: {
    fontWeight: '600',
    marginRight: 8,
    color: '#333',
  },
  commentTimestamp: {
    color: '#666',
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: '#333',
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    color: '#666',
    fontSize: 12,
  },
  replyInputContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    color: '#666',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  replyButton: {
    backgroundColor: '#004D00',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  replyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  replyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledAction: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#CCCCCC',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
}); 