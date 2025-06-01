import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { samplePosts } from '@/constants/mockData';

// Mock comment data
const mockComments = [
  {
    id: '1',
    user: { name: 'Alice', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
    content: 'This is such a great review! I totally agree with your thoughts.',
    timestamp: '2h ago',
    likeCount: 5,
    isLiked: false,
    replies: [
      {
        id: '1-1',
        user: { name: 'Bob', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
        content: 'Same here! Really well written.',
        timestamp: '1h ago',
        likeCount: 2,
        isLiked: false,
        replyTo: 'Alice'
      }
    ]
  },
  {
    id: '2',
    user: { name: 'Charlie', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
    content: 'Interesting perspective. I had a different take on this part of the story.',
    timestamp: '3h ago',
    likeCount: 8,
    isLiked: true,
    replies: []
  }
];

interface Comment {
  id: string;
  user: { name: string; avatar: string };
  content: string;
  timestamp: string;
  likeCount: number;
  isLiked: boolean;
  replyTo?: string;
  replies?: Comment[];
}

function CommentItem({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
  const [isLiked, setIsLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleReply = () => {
    setShowReplyInput(!showReplyInput);
  };

  const submitReply = () => {
    if (replyText.trim()) {
      console.log('Submitting reply:', replyText);
      setReplyText('');
      setShowReplyInput(false);
      // TODO: Add reply to comments
    }
  };

  return (
    <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
      {isReply && <View style={styles.replyLine} />}
      <View style={styles.commentContent}>
        <Image source={{ uri: comment.user.avatar }} style={styles.commentAvatar} />
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{comment.user.name}</Text>
            {comment.replyTo && (
              <Text style={styles.replyToText}>replying to @{comment.replyTo}</Text>
            )}
            <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
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
                placeholder={`Reply to ${comment.user.name}...`}
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
        <CommentItem key={reply.id} comment={reply} isReply={true} />
      ))}
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [newComment, setNewComment] = useState('');
  
  // Find the post by ID (in real app, this would be an API call)
  const post = samplePosts.find(p => p.id === id) || samplePosts[0];

  const submitComment = () => {
    if (newComment.trim()) {
      console.log('Submitting comment:', newComment);
      setNewComment('');
      // TODO: Add comment to post
    }
  };

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

          <View style={styles.postStats}>
            <Text style={styles.statText}>{post.commentCount} comments</Text>
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
          <Text style={styles.commentsTitle}>Comments</Text>
          {mockComments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
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
  },
  reviewingText: {
    color: '#666',
    fontSize: 14,
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
  },
  mediaDetails: {
    color: '#666',
    fontSize: 14,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
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
  replyToText: {
    color: '#666',
    fontSize: 12,
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
}); 