import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { commentsService } from '@/lib/commentsService';

export interface CommentData {
  id: string;
  content: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  parent_comment_id?: string;
  like_count: number;
  is_liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

interface CommentItemProps {
  comment: CommentData;
  onLikePress?: (commentId: string, isLiked: boolean) => void;
  onReplyPress?: (commentId: string) => void;
  onDeletePress?: (commentId: string) => void;
  showReplyButton?: boolean;
  showDeleteButton?: boolean;
  isReply?: boolean;
}

export default function CommentItem({
  comment,
  onLikePress,
  onReplyPress,
  onDeletePress,
  showReplyButton = true,
  showDeleteButton = false,
  isReply = false
}: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(comment.is_liked_by_user);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [isLiking, setIsLiking] = useState(false);

  const handleLikePress = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      const result = await commentsService.likeComment(comment.id);
      
      if (result.success) {
        // Update with actual values from server
        setIsLiked(result.isLiked || false);
        setLikeCount(result.likeCount || 0);
        
        // Notify parent component
        if (onLikePress) {
          onLikePress(comment.id, result.isLiked || false);
        }
      } else {
        // Revert optimistic update on error
        setIsLiked(previousIsLiked);
        setLikeCount(previousLikeCount);
        console.error('Failed to like comment:', result.error);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
      console.error('Error liking comment:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReplyPress = () => {
    if (onReplyPress) {
      onReplyPress(comment.id);
    }
  };

  const handleDeletePress = () => {
    if (onDeletePress) {
      onDeletePress(comment.id);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    return commentsService.formatCommentTime(timestamp);
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      {/* User Avatar */}
      <Image source={{ uri: comment.avatar_url }} style={styles.avatar} />
      
      {/* Comment Content */}
      <View style={styles.contentContainer}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{comment.display_name}</Text>
          <Text style={styles.username}>@{comment.username}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(comment.created_at)}</Text>
        </View>
        
        {/* Comment Text */}
        <Text style={styles.commentText}>{comment.content}</Text>
        
        {/* Actions */}
        <View style={styles.actions}>
          {/* Like Action */}
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLikePress}
            disabled={isLiking}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={isLiked ? "#FF6B6B" : "#666"} 
              style={styles.actionIcon}
            />
            {likeCount > 0 && (
              <Text style={[styles.actionText, isLiked && styles.likedText]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Reply Action */}
          {showReplyButton && !isReply && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleReplyPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="arrow-undo-outline" 
                size={16} 
                color="#666" 
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}
          
          {/* Delete Action */}
          {showDeleteButton && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleDeletePress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="trash-outline" 
                size={16} 
                color="#FF6B6B" 
                style={styles.actionIcon}
              />
              <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  replyContainer: {
    paddingLeft: 48,
    backgroundColor: '#F8F9FA',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
    marginRight: 6,
  },
  username: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionIcon: {
    marginRight: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  likedText: {
    color: '#FF6B6B',
  },
}); 