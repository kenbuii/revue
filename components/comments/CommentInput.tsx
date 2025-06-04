import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { commentsService } from '@/lib/commentsService';

interface CommentInputProps {
  postId: string;
  parentCommentId?: string;
  placeholder?: string;
  onCommentPosted?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
}

export default function CommentInput({
  postId,
  parentCommentId,
  placeholder = "Write a comment...",
  onCommentPosted,
  onCancel,
  showCancel = false,
  autoFocus = false,
  maxLength = 500
}: CommentInputProps) {
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    const trimmedComment = comment.trim();
    
    if (!trimmedComment) {
      Alert.alert('Empty Comment', 'Please write something before posting.');
      return;
    }

    if (trimmedComment.length > maxLength) {
      Alert.alert('Comment Too Long', `Please keep your comment under ${maxLength} characters.`);
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      console.log('📝 Posting comment to post:', postId);
      
      const result = await commentsService.createComment({
        post_id: postId,
        content: trimmedComment,
        parent_comment_id: parentCommentId
      });

      if (result.success) {
        console.log('✅ Comment posted successfully');
        setComment(''); // Clear input
        
        // Notify parent component that comment was posted
        if (onCommentPosted) {
          onCommentPosted();
        }
      } else {
        console.error('❌ Failed to post comment:', result.error);
        setError(result.error || 'Failed to post comment');
        Alert.alert('Error', result.error || 'Failed to post comment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error posting comment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Error', 'Failed to post comment. Please check your connection and try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleCancel = () => {
    setComment('');
    setError(null);
    if (onCancel) {
      onCancel();
    }
  };

  const isPostDisabled = !comment.trim() || isPosting;
  const remainingChars = maxLength - comment.length;

  return (
    <View style={styles.container}>
      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={comment}
          onChangeText={setComment}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={maxLength}
          autoFocus={autoFocus}
          editable={!isPosting}
          textAlignVertical="top"
        />
        
        {/* Character Counter */}
        {comment.length > maxLength * 0.8 && (
          <Text style={[
            styles.charCounter,
            remainingChars < 0 && styles.charCounterError
          ]}>
            {remainingChars}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {showCancel && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancel}
            disabled={isPosting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[
            styles.postButton,
            isPostDisabled && styles.postButtonDisabled
          ]} 
          onPress={handlePost}
          disabled={isPostDisabled}
          activeOpacity={0.7}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#FFFFFF" style={styles.postIcon} />
              <Text style={styles.postButtonText}>
                {parentCommentId ? 'Reply' : 'Post'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F8F9FA',
  },
  charCounter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
    color: '#666',
  },
  charCounterError: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  postButton: {
    backgroundColor: '#004D00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#999',
  },
  postIcon: {
    marginRight: 6,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 