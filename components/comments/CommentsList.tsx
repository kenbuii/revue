import React, { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import CommentItem, { CommentData } from './CommentItem';
import { commentsService } from '@/lib/commentsService';

interface CommentsListProps {
  postId: string;
  refreshTrigger?: number; // Increment this to trigger refresh
  onCommentLike?: (commentId: string, isLiked: boolean) => void;
  onCommentReply?: (commentId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  showReplyButtons?: boolean;
  showDeleteButtons?: boolean;
  emptyStateMessage?: string;
}

export default function CommentsList({
  postId,
  refreshTrigger = 0,
  onCommentLike,
  onCommentReply,
  onCommentDelete,
  showReplyButtons = true,
  showDeleteButtons = false,
  emptyStateMessage = "No comments yet. Be the first to share your thoughts!"
}: CommentsListProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comments from the server
  const loadComments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('📝 Loading comments for post:', postId);
      const fetchedComments = await commentsService.getPostComments(postId);
      
      setComments(fetchedComments);
      console.log(`✅ Loaded ${fetchedComments.length} comments`);
      
    } catch (error) {
      console.error('❌ Error loading comments:', error);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load comments on mount and when refreshTrigger changes
  useEffect(() => {
    loadComments();
  }, [postId, refreshTrigger]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    loadComments(true);
  };

  // Handle comment like with optimistic update
  const handleCommentLike = (commentId: string, isLiked: boolean) => {
    // Update local state immediately for smooth UX
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              is_liked_by_user: isLiked,
              like_count: isLiked ? comment.like_count + 1 : comment.like_count - 1
            }
          : comment
      )
    );

    // Notify parent component
    if (onCommentLike) {
      onCommentLike(commentId, isLiked);
    }
  };

  // Handle comment deletion
  const handleCommentDelete = async (commentId: string) => {
    try {
      // Optimistically remove from UI
      setComments(prevComments => 
        prevComments.filter(comment => comment.id !== commentId)
      );

      // TODO: Implement actual deletion when commentsService.deleteComment is ready
      console.log('🗑️ Comment deletion requested:', commentId);
      
      if (onCommentDelete) {
        onCommentDelete(commentId);
      }
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      // Reload comments on error to restore state
      loadComments();
    }
  };

  // Render individual comment item
  const renderComment = ({ item }: { item: CommentData }) => (
    <CommentItem
      comment={item}
      onLikePress={handleCommentLike}
      onReplyPress={onCommentReply}
      onDeletePress={handleCommentDelete}
      showReplyButton={showReplyButtons}
      showDeleteButton={showDeleteButtons}
    />
  );

  // Render separator between comments
  const renderSeparator = () => (
    <View style={styles.separator} />
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#004D00" />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (comments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyStateMessage}</Text>
      </View>
    );
  }

  // Comments list
  return (
    <FlatList
      data={comments}
      renderItem={renderComment}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={renderSeparator}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#004D00']}
          tintColor="#004D00"
        />
      }
      showsVerticalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginLeft: 60, // Align with comment content
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 