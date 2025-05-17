import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';

// Types
interface User {
  name: string;
  avatar: string;
  handle: string;
}

interface PostContent {
  type: 'image' | 'text';
  source?: string;
  text?: string;
}

interface Post {
  id: string;
  user: User;
  content: PostContent;
  isRevuing: boolean;
}

// Mock data for trending posts
const trendingPosts: Post[] = [
  {
    id: '1',
    user: {
      name: 'kristine',
      avatar: 'https://randomuser.me/api/portraits/women/43.jpg',
      handle: '@S3EB'
    },
    content: {
      type: 'image',
      source: 'https://images.unsplash.com/photo-1600603405959-6d623e92445c?q=80&w=2070&auto=format&fit=crop'
    },
    isRevuing: true
  },
  {
    id: '2',
    user: {
      name: 'kristine',
      avatar: 'https://randomuser.me/api/portraits/women/43.jpg',
      handle: '@S3EB'
    },
    content: {
      type: 'text',
      text: 'really short dummy text'
    },
    isRevuing: true
  },
  {
    id: '3',
    user: {
      name: 'kristine',
      avatar: 'https://randomuser.me/api/portraits/women/43.jpg',
      handle: '@S3EB'
    },
    content: {
      type: 'text',
      text: 'long dummy text user post/content lorem ipsum Lorem ipsum is simply dummy text of the printing and typesetting industry Lorem Ipsum has been the industry\'s standard dummy text'
    },
    isRevuing: true
  },
];

// Components
interface TrendingHeaderProps {
  title: string;
  postCount: string;
}

const TrendingHeader = ({ title, postCount }: TrendingHeaderProps) => (
  <View style={styles.trendingHeaderContainer}>
    <View>
      <Text style={styles.trendingTitle}>{title}</Text>
      <Text style={styles.postCount}>{postCount} posts in past day</Text>
    </View>
    <Image 
      source={{ uri: 'https://images.unsplash.com/photo-1517463700628-5103184eac47?q=80&w=2574&auto=format&fit=crop' }} 
      style={styles.trendingImage} 
    />
  </View>
);

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => (
  <View style={styles.postCard}>
    <View style={styles.postHeader}>
      <View style={styles.userInfo}>
        <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
        <View>
          <Text style={styles.username}>{post.user.name}</Text>
          {post.isRevuing && <Text style={styles.revuingText}>is revuing</Text>}
          <Text style={styles.userHandle}>{post.user.handle}</Text>
        </View>
      </View>
    </View>
    
    {post.content.type === 'image' ? (
      <Image source={{ uri: post.content.source }} style={styles.postImage} />
    ) : (
    post.content.type === 'text' && post.content.text ? (
        <Text style={styles.postText}>
            {post.content.text.length > 100
            ? `${post.content.text.slice(0, 100)}… `
            : post.content.text}
            {post.content.text.length > 100 && (
            <Text style={styles.readMore}>Read more</Text>
            )}
        </Text>
        ) : post.content.type === 'text' ? (
        <Text style={styles.postText}>[No content provided]</Text>
        ) : null
    )}
  </View>
);

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.container}>
          <AppHeader showLogo={true} showSearchBar={true} />
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <View style={styles.trendingSection}>
            <TrendingHeader title="THE WHITE LOTUS" postCount="184" />

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.horizontalPostList}
            >
                {trendingPosts.map(post => (
                <PostCard key={post.id} post={post} />
                ))}
            </ScrollView>
        </View>
          
        <View style={styles.trendingSection}>
            <TrendingHeader title="THE WHITE LOTUS" postCount="184" />

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.horizontalPostList}
            >
                {trendingPosts.map(post => (
                <PostCard key={post.id} post={post} />
                ))}
            </ScrollView>
        </View>
          
          {/* Placeholder for Supabase integration */}
          {/* TODO: Add Supabase query to fetch trending topics */}
          {/* TODO: Add Supabase query to fetch trending posts */}
          {/* TODO: Add function to handle user search and query Supabase */}
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 16,
    // color: '#004D00',
  },
  trendingHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
     backgroundColor: '#F8F6ED',
    borderRadius: 12,
    marginBottom: 12,
  },
  trendingSection: {
    backgroundColor: '#F8F6ED',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
},
horizontalPostList: {
  flexDirection: 'row',
  gap: 12,
  paddingTop: 8,
  paddingBottom: 4,
},
postCard: {
  width: 180,
  backgroundColor: '#FFF',
  borderRadius: 12,
  padding: 10,
  marginRight: 4,
  shadowColor: '#000',
  shadowOpacity: 0.03,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
},
  trendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004D00',
    marginBottom: 2,
  },
  postCount: {
    fontSize: 13,
    color: '#666',
  },
  trendingImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 5,
  },
  username: {
    fontSize: 10,
    fontWeight: '500',
  },
  revuingText: {
    fontSize: 8,
    color: '#666',
  },
  userHandle: {
    fontSize: 8,
    color: '#666',
  },
  postImage: {
    width: '100%',
    height: 100,
    borderRadius: 4,
  },
  postText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#333',
    marginTop: 6,
  },
  readMore: {
    color: '#004D00',
    fontWeight: '600',
 },
});
