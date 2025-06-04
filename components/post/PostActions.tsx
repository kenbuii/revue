import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PostActionsProps {
  postId: string;
  isBookmarked?: boolean;
  isFavorited?: boolean;
  isLiked?: boolean;
  onCommentsPress: () => void;
  onLikesPress: () => void;
  onBookmarkPress: () => void;
  onFavoritePress: () => void;
  onLikePress?: () => void; // New like action separate from favorite
}

export default function PostActions({
  postId,
  isBookmarked = false,
  isFavorited = false,
  isLiked = false,
  onCommentsPress,
  onLikesPress,
  onBookmarkPress,
  onFavoritePress,
  onLikePress
}: PostActionsProps) {

  const handleCommentsPress = (e: any) => {
    e.stopPropagation();
    onCommentsPress();
  };

  const handleLikesPress = (e: any) => {
    e.stopPropagation();
    onLikesPress();
  };

  const handleBookmarkPress = (e: any) => {
    e.stopPropagation();
    onBookmarkPress();
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    onFavoritePress();
  };

  const handleLikePress = (e: any) => {
    e.stopPropagation();
    if (onLikePress) {
      onLikePress();
    } else {
      // Fallback to favorite action for now
      onFavoritePress();
    }
  };

  return (
    <View style={styles.container}>
      {/* Comments Action */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleCommentsPress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="chatbox-ellipses-outline" 
          size={18} 
          color="#004D00" 
          style={styles.actionIcon} 
        />
      </TouchableOpacity>

      {/* Like/Heart Action - using real likes functionality */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleLikePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isLiked ? "heart" : "heart-outline"} 
          size={18} 
          color={isLiked ? "#FF6B6B" : "#004D00"} 
          style={styles.actionIcon} 
        />
      </TouchableOpacity>

      {/* Bookmark Action */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleBookmarkPress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isBookmarked ? "bookmark" : "bookmark-outline"} 
          size={18} 
          color={isBookmarked ? "#004D00" : "#004D00"} 
          style={styles.actionIcon} 
        />
      </TouchableOpacity>

      {/* Favorite/Star Action */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleFavoritePress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isFavorited ? "star" : "star-outline"} 
          size={18} 
          color={isFavorited ? "#FFD700" : "#666"} 
          style={styles.actionIcon} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 5,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    padding: 4,
    borderRadius: 4,
  },
  actionIcon: {
    width: 20,
    height: 20,
  },
}); 