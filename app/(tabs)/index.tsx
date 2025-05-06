import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
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

      {/* Post Button (FAB) */}
      <TouchableOpacity style={styles.fab}>
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
