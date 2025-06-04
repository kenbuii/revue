import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, RefreshControl, ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import PostCard from '@/components/PostCard';
import { feedService, FeedPost } from '@/lib/feedService';

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

  // Load initial feed data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading initial feed data...');
      
      // Load both feeds initially
      const [forYouData, friendsData] = await Promise.all([
        feedService.getForYouFeed(),
        feedService.getFriendsFeed(),
      ]);
      
      setForYouPosts(forYouData);
      setFriendsPosts(friendsData);
      
      // Reset pagination states
      setHasMoreForYou(forYouData.length >= 20); // Assume more if we got a full page
      setHasMoreFriends(friendsData.length >= 20);
      
      console.log(`✅ Loaded ${forYouData.length} For You posts and ${friendsData.length} Friends posts`);
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
      setForYouPosts(refreshedPosts);
      setHasMoreForYou(refreshedPosts.length >= 20);
      console.log(`✅ For You feed refreshed with ${refreshedPosts.length} posts`);
    } catch (error) {
      console.error('❌ Error refreshing For You feed:', error);
      throw error;
    }
  };

  const refreshFriendsFeed = async () => {
    try {
      console.log('🔄 Refreshing Friends feed...');
      const refreshedPosts = await feedService.refreshFeed('friends');
      setFriendsPosts(refreshedPosts);
      setHasMoreFriends(refreshedPosts.length >= 20);
      console.log(`✅ Friends feed refreshed with ${refreshedPosts.length} posts`);
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

  // Deduplicate posts by ID
  const deduplicatePosts = (existingPosts: FeedPost[], newPosts: FeedPost[]): FeedPost[] => {
    const existingIds = new Set(existingPosts.map(post => post.id));
    const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
    return [...existingPosts, ...uniqueNewPosts];
  };

  const loadMorePosts = async () => {
    // Throttle calls - prevent multiple simultaneous loads
    const now = Date.now();
    if (loadingMore || (now - lastLoadTime) < 1000) {
      console.log('⏳ Throttling load more request');
      return;
    }

    // Check if we have more posts to load
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
        if (activeTab === 'forYou') {
          setForYouPosts(prev => deduplicatePosts(prev, morePosts));
          setHasMoreForYou(morePosts.length >= 20); // If we got less than a full page, no more
        } else {
          setFriendsPosts(prev => deduplicatePosts(prev, morePosts));
          setHasMoreFriends(morePosts.length >= 20);
        }
        console.log(`✅ Loaded ${morePosts.length} more ${activeTab} posts`);
      } else {
        // No more posts available
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

  // Handle scroll for infinite loading
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    // Check if user is near bottom (within 20px)
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isCloseToBottom) {
      loadMorePosts();
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refreshCurrentFeed,
    refreshForYouFeed,
    refreshFriendsFeed,
  }));

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    // Scroll to top when switching tabs
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
    
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#004D00" />
        <Text style={styles.loadingFooterText}>Loading more posts...</Text>
      </View>
    );
  };

  const renderEmptyState = (tabType: TabType) => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {tabType === 'forYou' ? 'Welcome to Revue!' : 'No posts from friends yet'}
        </Text>
        <Text style={styles.emptySubtext}>
          {tabType === 'forYou' 
            ? 'Start following people and creating posts to see content here.'
            : 'Follow friends to see their posts in this feed.'
          }
        </Text>
      </View>
    );
  };

  const renderFeedContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004D00" />
          <Text style={styles.loadingText}>Loading your feed...</Text>
        </View>
      );
    }

    const currentPosts = getCurrentPosts();

    if (currentPosts.length === 0) {
      return renderEmptyState(activeTab);
    }

    return (
      <>
        {currentPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {renderLoadingFooter()}
        {/* Dynamic spacing based on post count */}
        <View style={[styles.bottomSpacer, { height: Math.max(50, currentPosts.length * 2) }]} />
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'forYou' && styles.activeTab]} 
          onPress={() => handleTabPress('forYou')}
        >
          <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>
            For You
          </Text>
          {activeTab === 'forYou' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => handleTabPress('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends + Following
          </Text>
          {activeTab === 'friends' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Feed Content - Simple ScrollView like profile.tsx */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.feedContainer}
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
        showsVerticalScrollIndicator={false}
      >
        {renderFeedContent()}
      </ScrollView>
    </View>
  );
});

FeedTabs.displayName = 'FeedTabs';

export default FeedTabs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFDF6',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  activeTabText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '80%',
    backgroundColor: '#004D00',
    borderRadius: 2,
  },
  feedContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'center',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  loadingFooterText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  endOfFeedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 30,
  },
  endOfFeedText: {
    fontSize: 16,
    color: '#004D00',
    fontFamily: 'LibreBaskerville_700Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  endOfFeedSubtext: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 50,
  },
});
