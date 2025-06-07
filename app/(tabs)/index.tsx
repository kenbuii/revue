import React, { useState, useRef } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import HomeHeader from '@/components/HomeHeader';
import FeedTabs, { FeedTabsRef } from '@/components/FeedTabs';
import { useFocusEffect } from '@react-navigation/native';

// Declare global variable for refresh flag
declare global {
  var shouldRefreshFeed: boolean | undefined;
}

export default function HomeScreen() {
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

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader />
      <FeedTabs ref={feedTabsRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
});
