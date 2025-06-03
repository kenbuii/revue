import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/components/AppHeader';
import { communityRevuesService, CommunityUser } from '@/lib/communityRevuesService';

interface UserListItemProps {
  user: CommunityUser;
  onUserPress: (userId: string) => void;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, onUserPress }) => {
  const data = user.additionalData;
  
  return (
    <TouchableOpacity style={styles.userItem} onPress={() => onUserPress(user.userId)}>
      <Image source={{ uri: user.userAvatar }} style={styles.userAvatar} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.userName}</Text>
        <Text style={styles.userUsername}>@{user.userUsername}</Text>
        
        <View style={styles.additionalInfo}>
          <Text style={styles.statusText}>
            {data?.source === 'bookmark' ? 'Bookmarked' : 'Wants to read'}
          </Text>
          {data?.addedAt && (
            <Text style={styles.dateText}>
              Added {new Date(data.addedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function WantToReadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const mediaId = params.id as string;
  const mediaTitle = params.title as string;

  const loadUsers = async (page: number = 0, isRefresh: boolean = false) => {
    try {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      const newUsers = await communityRevuesService.getMediaWantToReaders(mediaId, page);

      if (isRefresh || page === 0) {
        setUsers(newUsers);
        setCurrentPage(0);
      } else {
        setUsers(prev => [...prev, ...newUsers]);
      }

      setHasMore(newUsers.length >= 20);
      setCurrentPage(page);

    } catch (error) {
      console.error('Error loading want-to-readers:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers(0);
  }, [mediaId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers(0, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadUsers(currentPage + 1);
    }
  };

  const handleUserPress = (userId: string) => {
    console.log('Navigate to profile:', userId);
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#004D00" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="bookmark-outline" size={48} color="#E0E0E0" />
        <Text style={styles.emptyStateTitle}>No one wants to read this yet</Text>
        <Text style={styles.emptyStateSubtitle}>
          Be the first to bookmark "{mediaTitle}"!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        showBackButton={true}
        title="Who Wants to Read This"
      />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.mediaTitle} numberOfLines={2}>{mediaTitle}</Text>
          <Text style={styles.userCount}>
            {loading ? 'Loading...' : `${users.length} ${users.length === 1 ? 'person' : 'people'}`}
          </Text>
        </View>

        <FlatList
          data={users}
          renderItem={({ item }) => (
            <UserListItem
              user={item}
              onUserPress={handleUserPress}
            />
          )}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#004D00"
              colors={['#004D00']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      </View>
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
  headerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    backgroundColor: 'white',
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userCount: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  additionalInfo: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#004D00',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#004D00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 