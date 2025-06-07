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
      
      // FIXED: Assume there are more posts unless we got fewer than the limit
      // This is more optimistic and lets the next load determine if we're at the end
      setHasMoreForYou(forYouData.length >= 20);
      setHasMoreFriends(friendsData.length >= 20);
      
      console.log(`✅ Loaded ${forYouData.length} For You posts and ${friendsData.length} Friends posts`);
      console.log(`🔍 DEBUG State: hasMoreForYou=${forYouData.length >= 20}, hasMoreFriends=${friendsData.length >= 20}`);
      
      // DEBUG: Check if content might be tall enough to scroll
      setTimeout(() => {
        console.log(`🔍 CONTENT HEIGHT CHECK: Posts loaded, screen height is ~${screenHeight}px. Each post is ~200-300px, so ${forYouData.length} posts should be ~${forYouData.length * 250}px tall.`);
        if (forYouData.length * 250 < screenHeight + 500) {
          console.log(`⚠️ WARNING: Content might not be tall enough to trigger scroll detection! Need more posts or taller content.`);
        }
      }, 2000);
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
      // FIXED: Don't assume no more posts just because refresh returned < 20
      // Keep hasMore as true to allow user to scroll and discover if there are more
      setHasMoreForYou(true);
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
      // FIXED: Same logic as above
      setHasMoreFriends(true);
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
      const currentPosts = activeTab === 'forYou' ? forYouPosts : friendsPosts;
      console.log(`🔄 Loading more ${activeTab} posts... (current: ${currentPosts.length}, offset: ${currentPosts.length})`);
      
      const morePosts = await feedService.loadMorePosts(activeTab, currentPosts.length);
      console.log(`📦 Received ${morePosts.length} more posts`);
      
      if (morePosts.length > 0) {
        if (activeTab === 'forYou') {
          const newPostsList = deduplicatePosts(forYouPosts, morePosts);
          setForYouPosts(newPostsList);
          // FIXED: Only set hasMore to false if we got FEWER than requested (< 20)
          // This indicates we've hit the end of available posts
          setHasMoreForYou(morePosts.length >= 20);
          console.log(`✅ For You posts: ${forYouPosts.length} → ${newPostsList.length} (hasMore: ${morePosts.length >= 20})`);
        } else {
          const newPostsList = deduplicatePosts(friendsPosts, morePosts);
          setFriendsPosts(newPostsList);
          setHasMoreFriends(morePosts.length >= 20);
          console.log(`✅ Friends posts: ${friendsPosts.length} → ${newPostsList.length} (hasMore: ${morePosts.length >= 20})`);
        }
      } else {
        // No more posts available - this is the definitive end
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
    const paddingToBottom = 500; // VERY AGGRESSIVE - trigger much earlier
    
    // AGGRESSIVE DEBUGGING - Log every scroll event
    const scrollY = Math.round(contentOffset.y);
    const contentHeight = Math.round(contentSize.height);
    const screenHeight = Math.round(layoutMeasurement.height);
    const distanceFromBottom = contentHeight - (scrollY + screenHeight);
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    // Log periodically for debugging (every ~300px of scroll)
    if (scrollY % 300 < 50) {
      console.log(`📜 SCROLL DEBUG: y=${scrollY}, contentH=${contentHeight}, screenH=${screenHeight}, distFromBottom=${distanceFromBottom}, closeToBottom=${isCloseToBottom}`);
    }
    
    if (isCloseToBottom) {
      console.log(`🎯 Near bottom detected! Triggering loadMorePosts... (${scrollY}/${contentHeight})`);
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

      {/* Feed Content - Fixed scroll throttling */}
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
        scrollEventThrottle={50} // REDUCED from 100 to 50 for more responsive detection
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
