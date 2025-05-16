import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import HomeHeader from '@/components/HomeHeader';
import FeedTabs from '@/components/FeedTabs';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader />
      <FeedTabs />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
});
