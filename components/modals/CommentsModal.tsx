import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommentsList from '@/components/comments/CommentsList';
import CommentInput from '@/components/comments/CommentInput';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  initialCommentCount?: number;
}

export default function CommentsModal({
  visible,
  onClose,
  postId,
  initialCommentCount = 0
}: CommentsModalProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  // Handle when a new comment is posted
  const handleCommentPosted = () => {
    console.log('✅ New comment posted, refreshing list...');
    
    // Trigger refresh of comments list
    setRefreshTrigger(prev => prev + 1);
    
    // Update comment count optimistically
    setCommentCount(prev => prev + 1);
  };

  // Handle comment like updates
  const handleCommentLike = (commentId: string, isLiked: boolean) => {
    console.log(`💖 Comment ${commentId} ${isLiked ? 'liked' : 'unliked'}`);
    // Comment like state is handled by CommentItem and CommentsList
  };

  // Handle comment replies (for future implementation)
  const handleCommentReply = (commentId: string) => {
    console.log('💬 Reply to comment:', commentId);
    // TODO: Implement reply functionality in future phase
  };

  // Handle comment deletion (for future implementation)
  const handleCommentDelete = (commentId: string) => {
    console.log('🗑️ Delete comment:', commentId);
    // Update comment count
    setCommentCount(prev => Math.max(0, prev - 1));
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Comments</Text>
              {commentCount > 0 && (
                <Text style={styles.commentCount}>({commentCount})</Text>
              )}
            </View>
            
            <TouchableOpacity 
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <View style={styles.commentsContainer}>
            <CommentsList
              postId={postId}
              refreshTrigger={refreshTrigger}
              onCommentLike={handleCommentLike}
              onCommentReply={handleCommentReply}
              onCommentDelete={handleCommentDelete}
              showReplyButtons={false} // Disable replies for now
              showDeleteButtons={false} // Disable deletion for now
              emptyStateMessage="No comments yet. Be the first to share your thoughts!"
            />
          </View>

          {/* Comment Input */}
          <CommentInput
            postId={postId}
            onCommentPosted={handleCommentPosted}
            placeholder="Write a comment..."
            autoFocus={false}
            maxLength={500}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  commentCount: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  commentsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
}); 