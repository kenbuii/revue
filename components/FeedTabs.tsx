import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent, RefreshControl } from 'react-native';
import PostCard from '@/components/PostCard';
import { samplePosts } from '@/constants/mockData';

type TabType = 'forYou' | 'friends';

export default function FeedTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('forYou');
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth } = Dimensions.get('window');

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newTab: TabType = offsetX >= screenWidth / 2 ? 'friends' : 'forYou';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({
      x: tab === 'friends' ? screenWidth : 0,
      animated: true,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Simulate loading time for refresh
    // In a real app, this would trigger post data refetch
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'forYou' && styles.activeTab]} 
          onPress={() => handleTabPress('forYou')}
        >
          <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>for you</Text>
          {activeTab === 'forYou' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => handleTabPress('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>friends + following</Text>
          {activeTab === 'friends' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* For You Tab */}
        <ScrollView 
          style={[styles.tabContent, { width: screenWidth }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#004D00"
              colors={['#004D00']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {samplePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ScrollView>

        {/* Friends + Following Tab */}
        <ScrollView 
          style={[styles.tabContent, { width: screenWidth }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#004D00"
              colors={['#004D00']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {samplePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

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
    color: '#888',
    fontSize: 16,
  },
  activeTabText: {
    color: '#000',
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '80%',
    backgroundColor: '#004D00',
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabContent: {
    flex: 1,
  },
});
