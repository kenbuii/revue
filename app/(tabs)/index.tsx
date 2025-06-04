import React, { useState, useRef } from 'react';
import { StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import HomeHeader from '@/components/HomeHeader';
import FeedTabs, { FeedTabsRef } from '@/components/FeedTabs';
import { useFocusEffect } from '@react-navigation/native';

// Declare global variable for refresh flag
declare global {
  var shouldRefreshFeed: boolean | undefined;
}

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const feedTabsRef = useRef<FeedTabsRef>(null);

  // Refresh feed when screen comes into focus (e.g., after creating a post)
  useFocusEffect(
    React.useCallback(() => {
      // Check if user is returning from post creation
      const shouldRefresh = global.shouldRefreshFeed;
      if (shouldRefresh) {
        global.shouldRefreshFeed = false; // Reset flag
        // Trigger refresh after a short delay to ensure smooth navigation
        setTimeout(() => {
          feedTabsRef.current?.refreshCurrentFeed();
        }, 500);
      }
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Trigger feed refresh
    try {
      await feedTabsRef.current?.refreshCurrentFeed();
    } catch (error) {
      console.error('❌ Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
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
        <HomeHeader />
        <FeedTabs ref={feedTabsRef} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
