import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CommentsModal from '@/components/modals/CommentsModal';
import LikesModal from '@/components/modals/LikesModal';
import PostOptionsModal from '@/components/modals/PostOptionsModal';
import { useBookmarks } from '@/contexts/BookmarksContext';

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
  isBookmarked?: boolean;
  isLiked?: boolean;
}

// Mock data for comments and likes
const mockComments = [
  {
    id: '1',
    user: { name: 'Alice', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
    content: 'This is such a great review! I totally agree with your thoughts.',
    timestamp: '2h ago',
    likeCount: 5,
    isLiked: false,
  },
  {
    id: '2',
    user: { name: 'Charlie', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
    content: 'Interesting perspective. I had a different take on this part.',
    timestamp: '3h ago',
    likeCount: 8,
    isLiked: true,
  }
];

const mockLikes = [
  {
    id: '1',
    name: 'Alice Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    username: 'alice_j'
  },
  {
    id: '2',
    name: 'Bob Smith',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    username: 'bobsmith'
  },
  {
    id: '3',
    name: 'Charlie Brown',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    username: 'charlie_b'
  }
];

export default function PostCard({ post }: { post: Post }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState<number | undefined>(4);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  
  // Use bookmarks context
  const { isBookmarked: isPostBookmarked, toggleBookmark } = useBookmarks();
  const isBookmarked = isPostBookmarked(post.id);
  
  // Modal states
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const handleMediaPress = () => {
    console.log('Media pressed, navigating to media detail page');
    router.push('/media/1');
  };

  const handlePostPress = () => {
    console.log('Post pressed, navigating to post detail');
    router.push(`/post/${post.id}`);
  };

  const handleCommentsPress = (e: any) => {
    e.stopPropagation();
    setShowCommentsModal(true);
  };

  const handleLikesPress = (e: any) => {
    e.stopPropagation();
    setShowLikesModal(true);
  };

  const handleBookmarkPress = (e: any) => {
    e.stopPropagation();
    const newBookmarkState = toggleBookmark(post);
    console.log('Bookmark toggled:', newBookmarkState);
  };

  const handleOptionsPress = (e: any) => {
    e.stopPropagation();
    setShowOptionsModal(true);
  };

  const handleHidePost = (postId: string) => {
    console.log('Hiding post:', postId);
    // TODO: Implement hide post functionality
  };

  const handleReportPost = (postId: string, reason: string) => {
    console.log('Reporting post:', postId, 'for:', reason);
    // TODO: Implement report post functionality
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
    <>
      <TouchableOpacity style={styles.container} onPress={handlePostPress} activeOpacity={0.95}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
            <View style={styles.userTextContainer}>
              <Text style={styles.username}>{post.user.name}</Text>
              <Text style={styles.reviewingText}>is revuing</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={handleOptionsPress}>
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
          <TouchableOpacity style={styles.actionButton} onPress={handleCommentsPress}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color="#004D00" style={styles.actionIcon} />
              <Text style={styles.actionText}>{post.commentCount} comments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleLikesPress}>
              <Ionicons name="heart-outline" size={18} color="#004D00" style={styles.actionIcon} />
              <Text style={styles.actionText}>{likeCount} likes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleBookmarkPress}>
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={18} 
                color={isBookmarked ? "#004D00" : "#004D00"} 
                style={styles.actionIcon} 
              />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Modals */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        comments={mockComments}
        postId={post.id}
      />

      <LikesModal
        visible={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        likes={mockLikes}
        postId={post.id}
      />

      <PostOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        postId={post.id}
        onHidePost={handleHidePost}
        onReportPost={handleReportPost}
      />
    </>
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
