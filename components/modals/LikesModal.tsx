import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { likesService, PostLike } from '@/lib/likesService';

interface LikesModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  initialLikeCount?: number;
}

function LikeItem({ like }: { like: PostLike }) {
  const formatTimeAgo = (timestamp: string) => {
    return likesService.formatLikeTime(timestamp);
  };

  return (
    <View style={styles.likeItem}>
      <Image source={{ uri: like.avatar_url }} style={styles.likeAvatar} />
      <View style={styles.likeContent}>
        <Text style={styles.likeDisplayName}>{like.display_name}</Text>
        <Text style={styles.likeUsername}>@{like.username}</Text>
      </View>
      <Text style={styles.likeTimestamp}>{formatTimeAgo(like.liked_at)}</Text>
    </View>
  );
}

export default function LikesModal({ 
  visible, 
  onClose, 
  postId, 
  initialLikeCount = 0 
}: LikesModalProps) {
  const [likes, setLikes] = useState<PostLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  // Load likes from the server
  const loadLikes = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('❤️ Loading likes for post:', postId);
      const fetchedLikes = await likesService.getPostLikes(postId);
      
      setLikes(fetchedLikes);
      setLikeCount(fetchedLikes.length);
      console.log(`✅ Loaded ${fetchedLikes.length} likes`);
      
    } catch (error) {
      console.error('❌ Error loading likes:', error);
      setError('Failed to load likes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load likes when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadLikes();
    }
  }, [visible, postId]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    loadLikes(true);
  };

  const handleClose = () => {
    onClose();
  };

  // Render individual like item
  const renderLike = ({ item }: { item: PostLike }) => (
    <LikeItem like={item} />
  );

  // Render separator between likes
  const renderSeparator = () => (
    <View style={styles.separator} />
  );

  // Loading state
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#004D00" />
      <Text style={styles.loadingText}>Loading likes...</Text>
    </View>
  );

  // Error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="heart-dislike-outline" size={48} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadLikes()}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={48} color="#666" />
      <Text style={styles.emptyTitle}>No likes yet</Text>
      <Text style={styles.emptyText}>Be the first to like this post!</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Likes</Text>
            {likeCount > 0 && (
              <Text style={styles.likeCount}>({likeCount})</Text>
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

        {/* Content */}
        <View style={styles.content}>
          {loading && !refreshing ? renderLoading() : 
           error ? renderError() :
           likes.length === 0 ? renderEmpty() : (
            <FlatList
              data={likes}
              renderItem={renderLike}
              keyExtractor={(item) => item.user_id}
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
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  likeCount: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  likeContent: {
    flex: 1,
  },
  likeDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  likeUsername: {
    fontSize: 14,
    color: '#666',
  },
  likeTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginLeft: 68, // Align with content
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#004D00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 