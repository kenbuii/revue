import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, RefreshControl, ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import PostCard from '@/components/PostCard';
import { feedService, FeedPost } from '@/lib/feedService';
import { testFeedServiceInApp } from '@/lib/feedServiceTest';
import { useHiddenPosts } from '@/contexts/HiddenPostsContext';

type TabType = 'forYou' | 'friends';

export interface FeedTabsRef {
  refreshCurrentFeed: () => Promise<void>;  
  refreshForYouFeed: () => Promise<void>;
  refreshFriendsFeed: () => Promise<void>;
}

const FeedTabs = forwardRef<FeedTabsRef, {}>((props, ref) => {
  const [activeTab, setActiveTab] = useState<TabType>('forYou');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [forYouPosts, setForYouPosts] = useState<FeedPost[]>([]);
  const [friendsPosts, setFriendsPosts] = useState<FeedPost[]>([]);
  const [hasMoreForYou, setHasMoreForYou] = useState(true);
  const [hasMoreFriends, setHasMoreFriends] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const { filterVisiblePosts } = useHiddenPosts();

  // Temporary diagnostic function
  const runDiagnostic = async () => {
    console.log('🔧 DIAGNOSTIC: Testing feed service...');
    const result = await testFeedServiceInApp();
    console.log('🔧 DIAGNOSTIC Result:', result);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading initial feed data...');
      
      const [forYouData, friendsData] = await Promise.all([
        feedService.getForYouFeed(),
        feedService.getFriendsFeed(),
      ]);
      
      const visibleForYouPosts = filterVisiblePosts(forYouData);
      const visibleFriendsPosts = filterVisiblePosts(friendsData);
      
      setForYouPosts(visibleForYouPosts);
      setFriendsPosts(visibleFriendsPosts);
      
      setHasMoreForYou(forYouData.length >= 20);
      setHasMoreFriends(friendsData.length >= 20);
      
      console.log(`✅ Loaded ${visibleForYouPosts.length} For You posts and ${visibleFriendsPosts.length} Friends posts`);
      
      if (visibleForYouPosts.length > 0) {
        const uniqueUsers = new Set(visibleForYouPosts.map(post => post.user.name));
        console.log(`📊 For You feed contains posts from ${uniqueUsers.size} different users:`, Array.from(uniqueUsers));
      }
      
    } catch (error) {
      console.error('❌ Error loading initial feed data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshForYouFeed = async () => {
    try {
      console.log('🔄 Refreshing For You feed...');
      const refreshedPosts = await feedService.refreshFeed('forYou');
      
      const visiblePosts = filterVisiblePosts(refreshedPosts);
      
      setForYouPosts(visiblePosts);
      setHasMoreForYou(refreshedPosts.length >= 20);
      
      console.log(`✅ For You feed refreshed with ${visiblePosts.length} visible posts (${refreshedPosts.length} total)`);
      
      if (visiblePosts.length > 0) {
        const uniqueUsers = new Set(visiblePosts.map(post => post.user.name));
        console.log(`📊 Refreshed feed contains posts from ${uniqueUsers.size} users`);
      }
    } catch (error) {
      console.error('❌ Error refreshing For You feed:', error);
      throw error;
    }
  };

  const refreshFriendsFeed = async () => {
    try {
      console.log('🔄 Refreshing Friends feed...');
      const refreshedPosts = await feedService.refreshFeed('friends');
      
      const visiblePosts = filterVisiblePosts(refreshedPosts);
      
      setFriendsPosts(visiblePosts);
      setHasMoreFriends(refreshedPosts.length >= 20);
      
      console.log(`✅ Friends feed refreshed with ${visiblePosts.length} visible posts (${refreshedPosts.length} total)`);
    } catch (error) {
      console.error('❌ Error refreshing Friends feed:', error);
      throw error;
    }
  };

  const refreshCurrentFeed = async () => {
    if (activeTab === 'forYou') {
      await refreshForYouFeed();
    } else {
      await refreshFriendsFeed();
    }
  };

  const deduplicatePosts = (existingPosts: FeedPost[], newPosts: FeedPost[]): FeedPost[] => {
    const existingIds = new Set(existingPosts.map(post => post.id));
    const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
    return [...existingPosts, ...uniqueNewPosts];
  };

  const loadMorePosts = async () => {
    const now = Date.now();
    if (loadingMore || (now - lastLoadTime) < 1000) {
      console.log('⏳ Throttling load more request');
      return;
    }

    const hasMore = activeTab === 'forYou' ? hasMoreForYou : hasMoreFriends;
    if (!hasMore) {
      console.log('📄 No more posts available for', activeTab);
      return;
    }
    
    try {
      setLoadingMore(true);
      setLastLoadTime(now);
      console.log(`🔄 Loading more ${activeTab} posts...`);
      
      const currentPosts = activeTab === 'forYou' ? forYouPosts : friendsPosts;
      const morePosts = await feedService.loadMorePosts(activeTab, currentPosts.length);
      
      if (morePosts.length > 0) {
        const visibleMorePosts = filterVisiblePosts(morePosts);
        
        if (activeTab === 'forYou') {
          setForYouPosts(prev => deduplicatePosts(prev, visibleMorePosts));
          setHasMoreForYou(morePosts.length >= 20);
        } else {
          setFriendsPosts(prev => deduplicatePosts(prev, visibleMorePosts));
          setHasMoreFriends(morePosts.length >= 20);
        }
        console.log(`✅ Loaded ${visibleMorePosts.length} more visible ${activeTab} posts (${morePosts.length} total fetched)`);
      } else {
        if (activeTab === 'forYou') {
          setHasMoreForYou(false);
        } else {
          setHasMoreFriends(false);
        }
        console.log('📄 End of feed reached for', activeTab);
      }
    } catch (error) {
      console.error('❌ Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isCloseToBottom) {
      loadMorePosts();
    }
  };

  useImperativeHandle(ref, () => ({
    refreshCurrentFeed,
    refreshForYouFeed,
    refreshFriendsFeed,
  }));

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      await refreshCurrentFeed();
      console.log('✅ Feed refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getCurrentPosts = (): FeedPost[] => {
    return activeTab === 'forYou' ? forYouPosts : friendsPosts;
  };

  const renderLoadingFooter = () => {
    const hasMore = activeTab === 'forYou' ? hasMoreForYou : hasMoreFriends;
    
    if (!hasMore && getCurrentPosts().length > 0) {
      return (
        <View style={styles.endOfFeedContainer}>
          <Text style={styles.endOfFeedText}>🎉 You've reached the end!</Text>
          <Text style={styles.endOfFeedSubtext}>Check back later for new posts</Text>
        </View>
      );
    }

    if (loadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#004D00" />
          <Text style={styles.loadingMoreText}>Loading more posts...</Text>
        </View>
      );
    }

    return null;
  };

  const renderEmptyState = (tabType: TabType) => {
    const isForYou = tabType === 'forYou';
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {isForYou ? 'No posts to show' : 'No posts from friends yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isForYou 
            ? 'Follow users and create posts to see content in your feed'
            : 'Follow users to see their posts here'
          }
        </Text>
      </View>
    );
  };

  const renderFeedContent = () => {
    const currentPosts = getCurrentPosts();
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004D00" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      );
    }

    if (currentPosts.length === 0) {
      return renderEmptyState(activeTab);
    }

    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#004D00"
            colors={['#004D00']}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {currentPosts.map((post, index) => (
          <PostCard 
            key={post.id} 
            post={post}
          />
        ))}
        {renderLoadingFooter()}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
          onPress={() => handleTabPress('forYou')}
        >
          <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>
            For You
          </Text>
          {__DEV__ && forYouPosts.length > 0 && (
            <Text style={styles.debugCount}>({forYouPosts.length})</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => handleTabPress('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends + Following
          </Text>
          {__DEV__ && friendsPosts.length > 0 && (
            <Text style={styles.debugCount}>({friendsPosts.length})</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Temporary diagnostic button */}
      {__DEV__ && (
        <TouchableOpacity style={styles.diagnosticButton} onPress={runDiagnostic}>
          <Text style={styles.diagnosticButtonText}>🧪 Test RPC</Text>
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {renderFeedContent()}
      </View>
    </View>
  );
});

FeedTabs.displayName = 'FeedTabs';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF6',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#004D00',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#004D00',
    fontWeight: '600',
  },
  debugCount: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  endOfFeedContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  endOfFeedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  endOfFeedSubtext: {
    fontSize: 14,
    color: '#666',
  },
  diagnosticButton: {
    padding: 16,
    backgroundColor: '#004D00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosticButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default FeedTabs;
