import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Media {
  id: string;
  title: string;
  type: string;
  progress?: string;
  cover: string;
}

interface User {
  name: string;
  avatar: string;
}

interface Post {
  id: string;
  user: User;
  media: Media;
  date: string;
  title?: string;
  contentType: 'image' | 'text' | 'mixed';
  content: string;
  textContent?: string;
  commentCount: number;
  likeCount: number;
}

export default function PostCard({ post }: { post: Post }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState<number | undefined>(4);

  const handleMediaPress = () => {
    console.log('Media pressed, navigating to media detail page');
    router.push('/media/1');
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setNumberOfLines(isExpanded ? 4 : undefined);
  };

  const renderContent = () => {
    if (post.contentType === 'image') {
      return (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: post.content }} 
            style={styles.contentImage} 
            resizeMode="contain"
          />
        </View>
      );
    } else if (post.contentType === 'text') {
      return (
        <View>
          <Text 
            style={styles.contentText} 
            numberOfLines={numberOfLines}
            onTextLayout={({ nativeEvent: { lines } }) => {
              if (lines.length > 4 && !isExpanded) {
                setNumberOfLines(4);
              }
            }}
          >
            {post.content}
          </Text>
          {post.content.length > 0 && (
            <TouchableOpacity onPress={toggleExpand} style={styles.readMoreButton}>
              <Text style={styles.readMoreText}>
                {isExpanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    } else if (post.contentType === 'mixed') {
      return (
        <View>
          <Text 
            style={styles.contentText} 
            numberOfLines={numberOfLines}
            onTextLayout={({ nativeEvent: { lines } }) => {
              if (lines.length > 4 && !isExpanded) {
                setNumberOfLines(4);
              }
            }}
          >
            {post.textContent}
          </Text>
          {post.textContent && post.textContent.length > 0 && (
            <TouchableOpacity onPress={toggleExpand} style={styles.readMoreButton}>
              <Text style={styles.readMoreText}>
                {isExpanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: post.content }} 
              style={styles.contentImage} 
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
          <View style={styles.userTextContainer}>
            <Text style={styles.username}>{post.user.name}</Text>
            <Text style={styles.reviewingText}>is revuing</Text>
          </View>
        </View>
        
        <TouchableOpacity>
          <Feather name="more-horizontal" size={24} color="black" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        onPress={handleMediaPress}
        style={styles.mediaInfoContainer}
        activeOpacity={0.7}
      >
        <View style={styles.mediaInfo}>
          <View>
            <Text style={styles.mediaTitle}>{post.media.title}</Text>
            <Text style={styles.mediaDetails}>{post.date} • {post.media.type} {post.media.progress}</Text>
          </View>
          <Image source={{ uri: post.media.cover }} style={styles.mediaCover} />
        </View>
      </TouchableOpacity>
      
      {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
      
      {renderContent()}
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color="#004D00" style={styles.actionIcon} />
            <Text style={styles.actionText}>{post.commentCount} comments</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={18} color="#004D00" style={styles.actionIcon} />
            <Text style={styles.actionText}>{post.likeCount} likes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={18} color="#004D00" style={styles.actionIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFDF6',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userTextContainer: {
    justifyContent: 'center',
  },
  username: {
    fontWeight: '500',
    fontSize: 16,
  },
  reviewingText: {
    color: '#666',
    fontSize: 14,
  },
  mediaInfoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  mediaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mediaTitle: {
    color: '#004D00',
    fontWeight: 'bold',
    fontSize: 16,
    maxWidth: 250,
  },
  mediaDetails: {
    color: '#666',
    fontSize: 14,
  },
  mediaCover: {
    width: 50,
    height: 70,
    borderRadius: 5,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 8,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  contentImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
    marginTop: 5,
  },
  actionText: {
    color: '#666',
    fontSize: 14,
  },
  readMoreButton: {
    marginTop: 4,
  },
  readMoreText: {
    color: '#004D00',
    fontSize: 14,
    fontWeight: '500',
  },
});
