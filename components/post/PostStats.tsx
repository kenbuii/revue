import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PostStatsProps {
  commentCount: number;
  likeCount: number;
  onCommentsPress?: () => void;
  onLikesPress?: () => void;
  showLabels?: boolean;
  isCompact?: boolean;
}

export default function PostStats({
  commentCount,
  likeCount,
  onCommentsPress,
  onLikesPress,
  showLabels = true,
  isCompact = false
}: PostStatsProps) {

  const handleCommentsPress = (e: any) => {
    e.stopPropagation();
    if (onCommentsPress) {
      onCommentsPress();
    }
  };

  const handleLikesPress = (e: any) => {
    e.stopPropagation();
    if (onLikesPress) {
      onLikesPress();
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getCommentText = (count: number): string => {
    if (!showLabels) return formatCount(count);
    if (count === 1) return `${formatCount(count)} comment`;
    return `${formatCount(count)} comments`;
  };

  const getLikeText = (count: number): string => {
    if (!showLabels) return formatCount(count);
    if (count === 1) return `${formatCount(count)} like`;
    return `${formatCount(count)} likes`;
  };

  const StatItem = ({ 
    icon, 
    count, 
    text, 
    onPress, 
    color = "#004D00" 
  }: {
    icon: string;
    count: number;
    text: string;
    onPress?: () => void;
    color?: string;
  }) => {
    const Component = onPress ? TouchableOpacity : View;
    
    return (
      <Component 
        style={[
          styles.statItem, 
          isCompact && styles.statItemCompact,
          onPress && styles.statItemClickable
        ]} 
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <Ionicons 
          name={icon as any} 
          size={isCompact ? 16 : 18} 
          color={color} 
          style={[styles.statIcon, isCompact && styles.statIconCompact]} 
        />
        <Text style={[
          styles.statText, 
          isCompact && styles.statTextCompact,
          { color }
        ]}>
          {text}
        </Text>
      </Component>
    );
  };

  if (isCompact) {
    return (
      <View style={styles.compactContainer}>
        <StatItem
          icon="chatbox-ellipses-outline"
          count={commentCount}
          text={formatCount(commentCount)}
          onPress={onCommentsPress}
        />
        <StatItem
          icon="heart-outline"
          count={likeCount}
          text={formatCount(likeCount)}
          onPress={onLikesPress}
          color="#FF6B6B"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatItem
        icon="chatbox-ellipses-outline"
        count={commentCount}
        text={getCommentText(commentCount)}
        onPress={onCommentsPress}
      />
      
      <StatItem
        icon="heart-outline"
        count={likeCount}
        text={getLikeText(likeCount)}
        onPress={onLikesPress}
        color="#FF6B6B"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 5,
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 4,
  },
  statItemCompact: {
    marginRight: 12,
    paddingVertical: 2,
  },
  statItemClickable: {
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  statIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  statIconCompact: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'LibreBaskerville_700Bold',
    fontWeight: '600',
  },
  statTextCompact: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 