import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import HomeHeader from '@/components/HomeHeader';
import FeedTabs from '@/components/FeedTabs';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Simulate loading time for refresh
    // In a real app, this would trigger data refetch for posts, etc.
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
        <FeedTabs />
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
    flex: 1,
  },
});
