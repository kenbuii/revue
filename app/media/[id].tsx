import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '@/components/PostCard';
import { samplePosts } from '@/constants/mockData';
import AppHeader from '@/components/AppHeader';

export default function MediaDetailScreen() {
  const BookmarkButton = () => (
    <TouchableOpacity style={styles.bookmarkButton}>
      <Feather name="bookmark" size={24} color="#000" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <AppHeader 
        showBackButton={true} 
        rightComponent={<BookmarkButton />}
      />
      
      <ScrollView style={styles.content}>
        {/* Media Cover */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/en/6/6b/Harry_Potter_and_the_Philosopher%27s_Stone_Book_Cover.jpg' }}
            style={styles.coverImage}
          />
        </View>

        {/* Media Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>HARRY POTTER AND THE SORCERER'S STONE</Text>
          <Text style={styles.description}>2001 fantasy film directed by Chris Columbus</Text>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>REVUES</Text>
          {samplePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  content: {
    flex: 1,
  },
  bookmarkButton: {
    padding: 8,
  },
  coverContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  coverImage: {
    width: 200,
    height: 300,
    borderRadius: 8,
  },
  infoContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  reviewsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
});