import React from 'react';
import { StyleSheet, Text, View, TextInput, Image, ScrollView, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
      text: 'user post/content lorem ipsum Lorem ipsum is simply dummy text of the printing and typesetting industry Lorem Ipsum has been the industry\'s standard dummy text'
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
      text: 'user post/content lorem ipsum Lorem ipsum is simply dummy text of the printing and typesetting industry Lorem Ipsum has been the industry\'s standard dummy text'
    },
    isRevuing: true
  },
];

// Components
const SearchBar = () => (
  <View style={styles.searchContainer}>
    <Image 
      source={require('@/assets/images/logo.png')} 
      style={styles.logoImage}
      resizeMode="contain"
    />
    <View style={styles.searchInputContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search"
        placeholderTextColor="#666"
      />
      <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
    </View>
  </View>
);

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
      <Text style={styles.postText}>{post.content.text}</Text>
    )}
  </View>
);

export default function SearchScreen() {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView style={styles.container}>
        <SearchBar />
        
        <Text style={styles.sectionTitle}>Trending Now</Text>
        
        <TrendingHeader 
          title="THE WHITE LOTUS" 
          postCount="184" 
        />
        
        <View style={styles.postsContainer}>
          {trendingPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </View>
        
        <TrendingHeader 
          title="THE WHITE LOTUS" 
          postCount="184" 
        />
        
        <View style={styles.postsContainer}>
          {trendingPosts.map(post => (
            <PostCard key={`second-${post.id}`} post={post} />
          ))}
        </View>
        
        {/* Placeholder for Supabase integration */}
        {/* TODO: Add Supabase query to fetch trending topics */}
        {/* TODO: Add Supabase query to fetch trending posts */}
        {/* TODO: Add function to handle user search and query Supabase */}
        
        {/* Add button in bottom right */}
        <TouchableOpacity style={styles.addButton}>
          <Feather name="plus" size={30} color="#FFF" />
        </TouchableOpacity>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 24,
    backgroundColor: '#FFFDF6',
  },
  logoImage: {
    height: 30,
    alignSelf: 'center',
    marginTop: 35,
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3E4',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  searchIcon: {
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  trendingHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#004D00',
  },
  postCount: {
    fontSize: 12,
    color: '#666',
  },
  trendingImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  postCard: {
    width: '33%',
    padding: 4,
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
    fontSize: 10,
    lineHeight: 12,
    color: '#333',
    height: 100,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#004D00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
