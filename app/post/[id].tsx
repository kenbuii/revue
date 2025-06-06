import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { postService, Post } from '@/lib/posts';
import { commentsService, Comment } from '@/lib/commentsService';

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
}

function CommentItem({ comment, isReply = false, onReply }: { 
  comment: CommentWithReplies; 
  isReply?: boolean;
  onReply: (parentId: string) => void;
}) {
  const [isLiked, setIsLiked] = useState(comment.is_liked_by_user || false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleLike = async () => {
    try {
      const result = await commentsService.likeComment(comment.id);
      if (result.success && typeof result.isLiked === 'boolean') {
        setIsLiked(result.isLiked);
        setLikeCount(result.likeCount || 0);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReply = () => {
    setShowReplyInput(!showReplyInput);
  };

  const submitReply = async () => {
    if (replyText.trim()) {
      setReplyText('');
      setShowReplyInput(false);
      onReply(comment.id);
    }
  };

  return (
    <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
      {isReply && <View style={styles.replyLine} />}
      <View style={styles.commentContent}>
        <Image source={{ uri: comment.avatar_url }} style={styles.commentAvatar} />
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{comment.display_name || comment.username}</Text>
            <Text style={styles.commentTimestamp}>{commentsService.formatCommentTime(comment.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
          
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentAction} onPress={handleReply}>
              <Ionicons name="chatbox-ellipses-outline" size={16} color="#666" />
              <Text style={styles.commentActionText}>Reply</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.commentAction} onPress={handleLike}>
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={16} 
                color={isLiked ? "#FF6B6B" : "#666"} 
              />
              <Text style={styles.commentActionText}>{likeCount}</Text>
            </TouchableOpacity>
          </View>

          {showReplyInput && (
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${comment.display_name || comment.username}...`}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
              />
              <View style={styles.replyInputActions}>
                <TouchableOpacity onPress={() => setShowReplyInput(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.replyButton, !replyText.trim() && styles.replyButtonDisabled]}
                  onPress={submitReply}
                  disabled={!replyText.trim()}
                >
                  <Text style={styles.replyButtonText}>Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Render replies */}
      {comment.replies && comment.replies.map(reply => (
        <CommentItem key={reply.id} comment={reply} isReply={true} onReply={onReply} />
      ))}
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadPostData(id);
    }
  }, [id]);

  const loadPostData = async (postId: string) => {
    try {
      setLoading(true);
      setError(null);

      // FIXED: Use new getPostById method to fetch any public post
      const foundPost = await postService.getPostById(postId);
      
      if (!foundPost) {
        setError('Post not found');
        return;
      }

      setPost(foundPost);

      // Load comments
      const postComments = await commentsService.getPostComments(postId);
      
      // For now, treat all comments as top-level (nested comments would need more complex logic)
      setComments(postComments as CommentWithReplies[]);
      
    } catch (error) {
      console.error('Error loading post data:', error);
      setError('Failed to load post data');
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (newComment.trim() && post) {
      try {
        const result = await commentsService.createComment({
          post_id: post.id,
          content: newComment.trim(),
        });

        if (result.success && result.comment) {
          setComments(prev => [result.comment as CommentWithReplies, ...prev]);
          setNewComment('');
        } else {
          console.error('Failed to create comment:', result.error);
        }
      } catch (error) {
        console.error('Error submitting comment:', error);
      }
    }
  };

  const handleReply = async (parentCommentId: string) => {
    // For now, just refresh comments to show new reply
    if (post) {
      const updatedComments = await commentsService.getPostComments(post.id);
      setComments(updatedComments as CommentWithReplies[]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004D00" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader showBackButton={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Post not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <AppHeader showBackButton={true} />
      
      <ScrollView style={styles.content}>
        {/* Original Post */}
        <View style={styles.originalPost}>
          <View style={styles.postHeader}>
            <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{post.user.name}</Text>
              <Text style={styles.reviewingText}>is revuing</Text>
            </View>
          </View>

          <View style={styles.mediaInfo}>
            <Text style={styles.mediaTitle}>{post.media.title}</Text>
            <Text style={styles.mediaDetails}>{post.date} • {post.media.type} {post.media.progress}</Text>
          </View>

          {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
          
          <Text style={styles.postContent}>{post.content}</Text>

          {post.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons
                    key={star}
                    name={star <= post.rating! ? "star" : "star-outline"}
                    size={16}
                    color="#FFD700"
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.postStats}>
            <Text style={styles.statText}>{comments.length} comments</Text>
            <Text style={styles.statText}>{post.likeCount} likes</Text>
          </View>
        </View>

        {/* Comment Input */}
        <View style={styles.commentInputSection}>
          <Image source={{ uri: 'https://via.placeholder.com/40' }} style={styles.commentAvatar} />
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity 
              style={[styles.commentSubmitButton, !newComment.trim() && styles.commentSubmitButtonDisabled]}
              onPress={submitComment}
              disabled={!newComment.trim()}
            >
              <Text style={styles.commentSubmitButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Thread */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
          ))}
          {comments.length === 0 && (
            <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
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
  originalPost: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFDF6',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
  },
  reviewingText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  mediaInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  mediaTitle: {
    color: '#004D00',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  mediaDetails: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'LibreBaskerville_400Regular',
    lineHeight: 24,
    marginBottom: 16,
  },
  postStats: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  statText: {
    color: '#666',
    fontSize: 14,
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
    marginRight: 12,
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
  },
  commentTimestamp: {
    color: '#666',
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
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
  },
  replyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  replyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#004D00',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    color: '#666',
    fontSize: 14,
    marginRight: 8,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  noCommentsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
}); 