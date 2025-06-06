import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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

interface PostHeaderProps {
  user: User;
  media: Media;
  date: string;
  onOptionsPress: () => void;
  onMediaPress?: () => void;
}

export default function PostHeader({ 
  user, 
  media, 
  date, 
  onOptionsPress, 
  onMediaPress 
}: PostHeaderProps) {
  
  const handleMediaPress = () => {
    if (onMediaPress) {
      onMediaPress();
    } else {
      // Enhanced navigation - pass all available media data like Search does
      console.log('📱 Media pressed, navigating to media detail page for:', media.title);
      console.log('🎯 Passing media data:', {
        id: media.id,
        title: media.title,
        type: media.type,
        image: media.cover
      });
      
      router.push({
        pathname: '/media/[id]' as const,
        params: {
          id: media.id,
          title: media.title,
          type: media.type,
          year: '', // Not available in feed, but media detail can handle empty
          image: media.cover || '', // 🎯 Pass the cover image!
          description: '', // Not available in feed
          rating: '', // Not available in feed  
          author: '', // Not available in feed
          // Flag to indicate this came from feed
          source: 'feed'
        },
      });
    }
  };

  const handleOptionsPress = (e: any) => {
    e.stopPropagation();
    onOptionsPress();
  };

  return (
    <View style={styles.container}>
      {/* User Info Section */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <View style={styles.userTextContainer}>
            <Text style={styles.username}>{user.name}</Text>
            <Text style={styles.reviewingText}>is revuing</Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={handleOptionsPress} style={styles.optionsButton}>
          <Feather name="more-horizontal" size={24} color="black" />
        </TouchableOpacity>
      </View>
      
      {/* Enhanced Media Info Section - Now clearly clickable */}
      <TouchableOpacity 
        onPress={handleMediaPress}
        style={styles.mediaInfoContainer}
        activeOpacity={0.8}
      >
        <View style={styles.mediaInfo}>
          <View style={styles.mediaTextContainer}>
            <Text style={styles.mediaTitle}>{media.title}</Text>
            <Text style={styles.mediaDetails}>
              {date} • {media.type} {media.progress}
            </Text>
          </View>
          
          <View style={styles.mediaCoverContainer}>
          <Image source={{ uri: media.cover }} style={styles.mediaCover} />
            
            {/* Clickable indicator */}
            <View style={styles.clickIndicator}>
              <Ionicons name="chevron-forward" size={16} color="#004D00" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
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
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userTextContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  username: {
    fontWeight: '500',
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#000',
  },
  reviewingText: {
    color: '#666',
    fontSize: 14,
  },
  optionsButton: {
    padding: 4,
    marginLeft: 8,
  },
  mediaInfoContainer: {
    backgroundColor: '#F8F8F8', // Slightly lighter to show it's interactive
    borderRadius: 12, // More rounded for modern look
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E4D8',
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mediaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  mediaTitle: {
    color: '#004D00',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 4,
  },
  mediaDetails: {
    color: '#666',
    fontSize: 14,
  },
  mediaCoverContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  mediaCover: {
    width: 50,
    height: 70,
    borderRadius: 6,
  },
  clickIndicator: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#004D00',
    // Add shadow to make it pop
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
}); 