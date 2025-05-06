import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, View } from 'react-native';
import HomeHeader from '@/components/HomeHeader';
import FeedTabs from '@/components/FeedTabs';
import PostCard from '@/components/PostCard';
import { samplePosts } from '@/constants/mockData';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader />
      <FeedTabs />
      <ScrollView style={styles.scrollView}>
        {samplePosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  scrollView: {
    flex: 1,
  },
});
