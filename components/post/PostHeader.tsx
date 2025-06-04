import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
      // Default behavior - navigate to media detail
      console.log('Media pressed, navigating to media detail page');
      router.push(`/media/${media.id}`);
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
      
      {/* Media Info Section */}
      <TouchableOpacity 
        onPress={handleMediaPress}
        style={styles.mediaInfoContainer}
        activeOpacity={0.7}
      >
        <View style={styles.mediaInfo}>
          <View style={styles.mediaTextContainer}>
            <Text style={styles.mediaTitle}>{media.title}</Text>
            <Text style={styles.mediaDetails}>
              {date} • {media.type} {media.progress}
            </Text>
          </View>
          <Image source={{ uri: media.cover }} style={styles.mediaCover} />
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
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  mediaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  mediaTitle: {
    color: '#004D00',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 2,
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
}); 