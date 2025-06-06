import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';
import { postService, CreatePostParams } from '@/lib/posts';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { PostDebugger } from '@/lib/postDebug';
import { router } from 'expo-router';

// Declare global variable for refresh flag (matching the feed)
declare global {
  var shouldRefreshFeed: boolean | undefined;
}

export default function Step3() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { profile } = useUserProfile();
  
  const [postTitle, setPostTitle] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [pageNumber, setPageNumber] = useState("");
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug logging for params - fix infinite re-renders
  useEffect(() => {
    if (__DEV__) {
      // Only log when params actually change, and stringify to avoid object reference issues
      const paramString = JSON.stringify(params);
      console.log('📋 Step3 received params:', JSON.parse(paramString));
    }
  }, [JSON.stringify(params)]); // Stable dependency to prevent infinite re-renders

  const handleDebugPostFlow = async () => {
    Alert.alert(
      'Debug Post Flow', 
      'Choose how to debug the post creation system:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete Post Flow Debug',
          onPress: async () => {
            console.log('🔧 Starting Complete Post Flow Debug...');
            
            const result = await PostDebugger.debugCompletePostFlow();
            
            Alert.alert(
              'Post Debug Complete',
              result.success 
                ? 'Complete post flow analysis finished. Check console for detailed breakdown of database tables, permissions, and test operations.' 
                : `Post debug failed: ${result.error}`,
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Test PostService',
          onPress: async () => {
            console.log('🧪 Testing PostService directly...');
            
            const result = await PostDebugger.testPostService();
            
            Alert.alert(
              'PostService Test Complete',
              result.success 
                ? 'PostService test passed! Check console for details.' 
                : `PostService test failed: ${result.error}`,
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Check Database Tables',
          onPress: async () => {
            console.log('📊 Checking database tables...');
            
            const result = await PostDebugger.testDatabaseTables();
            
            let message;
            if (result.error) {
              message = `Database check failed: ${result.error}`;
            } else {
              message = `Media Items: ${result.media_items?.accessible ? '✅ Accessible' : '❌ Not Accessible'}\nPosts: ${result.posts?.accessible ? '✅ Accessible' : '❌ Not Accessible'}`;
            }
            
            Alert.alert(
              'Database Tables Check',
              message,
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Test RLS Permissions',
          onPress: async () => {
            console.log('🔐 Testing Row Level Security...');
            
            const result = await PostDebugger.checkRowLevelSecurity();
            
            let message;
            if (result.error) {
              message = `RLS check failed: ${result.error}`;
            } else {
              message = `Auth Token: ${result.authToken?.accessible ? '✅ Accessible' : '❌ Not Accessible'}\nAnon Key: ${result.anonKey?.accessible ? '✅ Accessible' : '❌ Not Accessible'}`;
            }
            
            Alert.alert(
              'RLS Permissions Check',
              message,
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const getLocationPlaceholder = () => {
    const type = params.type as string;
    switch (type) {
      case "book":
        return "enter page";
      case "movie":
        return "enter timestamp";
      case "tv":
        return "enter season/episode";
      default:
        return "enter location";
    }
  };

  const formatLocation = () => {
    if (!pageNumber) return "location";
    const type = params.type as string;
    switch (type) {
      case "book":
        return `page ${pageNumber}`;
      case "movie":
        return `at ${pageNumber}`;
      case "tv":
        return pageNumber;
      default:
        return pageNumber;
    }
  };

  const validateForm = () => {
    if (!thoughts.trim()) {
      Alert.alert('Missing Content', 'Please share your thoughts about this media.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please sign in to create a revue.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('📝 Creating post with:', {
        mediaId: params.mediaId,
        mediaTitle: params.title,
        mediaType: params.type,
        mediaYear: params.year,
        mediaCreator: params.creator,
        mediaCover: params.image,
        mediaGenre: params.genre,
        title: postTitle,
        content: thoughts,
        rating: rating,
        tags: [],
        location: undefined,
      });

      const result = await postService.createPost({
        mediaId: params.mediaId as string,
        mediaTitle: params.title as string,
        mediaType: params.type as 'movie' | 'tv' | 'book',
        mediaYear: params.year as string,
        mediaCreator: params.creator as string,
        mediaCover: params.image as string,
        mediaGenre: params.genre as string,
        title: postTitle,
        content: thoughts,
        rating: rating,
        tags: [],
        location: undefined,
      });

      if (result.success) {
        console.log('✅ Post created successfully:', result.post?.id);
        
        // Set global flag to refresh feed when user returns
        global.shouldRefreshFeed = true;
        
        // Show success feedback
        Alert.alert(
          'Post Created!', 
          'Your review has been published successfully.',
          [
            {
              text: 'View in Feed',
              onPress: () => {
                // Navigate to feed (will auto-refresh due to global flag)
                router.push('/(tabs)');
              }
            }
          ]
        );
        
      } else {
        console.error('❌ Post creation failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!thoughts.trim() && !postTitle.trim()) {
      Alert.alert('Nothing to Save', 'Please write something before saving as draft.');
      return;
    }

    try {
      const draftParams: CreatePostParams = {
        mediaTitle: params.title as string,
        mediaType: params.type as 'movie' | 'tv' | 'book',
        mediaYear: params.year as string,
        mediaGenre: params.genre as string,
        mediaCreator: params.creator as string,
        title: postTitle.trim() || undefined,
        content: thoughts.trim(),
        rating: rating > 0 ? rating : undefined,
        location: pageNumber.trim() || undefined,
      };

      await postService.saveDraftPost(draftParams);
      
      Alert.alert(
        'Draft Saved',
        'Your draft has been saved locally.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft.');
    }
  };

  const StarRating = () => {
    const stars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>Rating (optional):</Text>
        <View style={styles.starsContainer}>
          {stars.map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={24}
                color={star <= rating ? '#FFD700' : '#CCC'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingText}>{rating}/10</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardDismissWrapper>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>write a new revue</Text>
          
          <View style={styles.stepTitleContainer}>
            <Text style={styles.stepTitle}>STEP 3</Text>
            {__DEV__ && (
              <TouchableOpacity
                style={styles.debugButton}
                onPress={handleDebugPostFlow}
              >
                <Ionicons name="bug-outline" size={20} color="#FF6B6B" />
                <Text style={styles.debugButtonText}>Debug</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.mediaInfo}>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person-circle" size={40} color="#2F4F4F" />
                )}
              </View>
              <Text style={styles.username}>{profile?.display_name || profile?.username || 'You'}</Text>
              <Text style={styles.revuingText}>is revuing</Text>
            </View>

            <View style={styles.titleSection}>
              <Text style={styles.mediaTitle}>{params.title}</Text>
              <Text style={styles.mediaCreator}>
                BY {params.creator?.toString().toUpperCase()}
              </Text>

              <View style={styles.mediaDetails}>
                <Text style={styles.mediaType}>{params.type}</Text>
                <Text style={styles.separator}>@</Text>
                {isEditingPage ? (
                  <TextInput
                    style={styles.pageNumberInput}
                    placeholder={getLocationPlaceholder()}
                    value={pageNumber}
                    onChangeText={setPageNumber}
                    onBlur={() => setIsEditingPage(false)}
                    autoFocus
                    placeholderTextColor="#666"
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.pageNumberButton}
                    onPress={() => setIsEditingPage(true)}
                  >
                    <Text style={styles.pageNumberText}>{formatLocation()}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.mediaCover}>
              {params.image ? (
                <Image source={{ uri: params.image as string }} style={styles.mediaCoverImage} />
              ) : (
                <Ionicons name="image-outline" size={48} color="#2F4F4F" />
              )}
            </View>
          </View>

          <View style={styles.postTitleContainer}>
            {isEditingTitle ? (
              <TextInput
                style={styles.postTitleInput}
                placeholder="Enter post title (optional)"
                value={postTitle}
                onChangeText={setPostTitle}
                onBlur={() => setIsEditingTitle(false)}
                autoFocus
                placeholderTextColor="#666"
              />
            ) : (
              <TouchableOpacity
                style={styles.postTitleButton}
                onPress={() => setIsEditingTitle(true)}
              >
                <Text
                  style={[
                    styles.postTitleText,
                    postTitle ? styles.filledPostTitle : null,
                  ]}
                >
                  {postTitle || "Optional Post Title"}
                </Text>
                <Ionicons name="pencil" size={20} color="#2F4F4F" />
              </TouchableOpacity>
            )}
          </View>

          <StarRating />

          <Text style={styles.label}>thoughts:</Text>
          <TextInput
            style={styles.thoughtsInput}
            placeholder="Share your thoughts about this media..."
            value={thoughts}
            onChangeText={setThoughts}
            multiline
            placeholderTextColor="#666"
            textAlignVertical="top"
          />

          <Text style={styles.label}>optional picture:</Text>
          <TouchableOpacity 
            style={styles.libraryButton}
            onPress={() => Alert.alert('Coming Soon', 'Image upload feature will be available in a future update.')}
          >
            <Text style={styles.libraryTitle}>Library</Text>
            <View style={styles.imageGrid}>
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <View key={index} style={styles.gridImage}>
                  <Ionicons name="image-outline" size={32} color="#2F4F4F" />
                </View>
              ))}
            </View>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.draftButton} 
              onPress={handleSaveDraft}
              disabled={isSubmitting}
            >
              <Ionicons name="bookmark-outline" size={16} color="#666" />
              <Text style={styles.draftButtonText}>Save Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.postButton, isSubmitting && styles.postButtonDisabled]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.postButtonText}>Publishing...</Text>
                </>
              ) : (
                <Text style={styles.postButtonText}>Publish Revue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardDismissWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  title: {
    fontSize: 24,
    fontStyle: "italic",
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    color: '#142D0A',
    textAlign: 'center',
    marginBottom: 30,
  },
  stepTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'LibreBaskerville_700Bold',
    color: '#142D0A',
    textAlign: "center",
  },
  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  debugButtonText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginLeft: 5,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  mediaInfo: {
    flexDirection: "row",
    marginBottom: 30,
    alignItems: "flex-start",
  },
  profileSection: {
    alignItems: "center",
    marginRight: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    marginBottom: 5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontSize: 14,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  revuingText: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  titleSection: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 5,
  },
  mediaCreator: {
    fontSize: 14,
    color: "#2F4F4F",
    marginBottom: 10,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  mediaDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  mediaType: {
    fontSize: 14,
    color: "#666",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  separator: {
    marginHorizontal: 8,
    color: "#666",
  },
  pageNumberButton: {
    backgroundColor: "#F2EFE6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  pageNumberText: {
    fontSize: 12,
    color: "#666",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  pageNumberInput: {
    backgroundColor: "#F2EFE6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 12,
    color: "#2F4F4F",
    minWidth: 100,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  mediaCover: {
    width: 60,
    height: 80,
    backgroundColor: "#F2EFE6",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginLeft: 15,
    overflow: "hidden",
  },
  mediaCoverImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
  },
  postTitleContainer: {
    marginBottom: 20,
  },
  postTitleInput: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    color: "#2F4F4F",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  postTitleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
  },
  postTitleText: {
    fontSize: 16,
    color: "#666",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  filledPostTitle: {
    color: "#2F4F4F",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 18,
    color: "#2F4F4F",
    marginBottom: 10,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  starsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    fontSize: 16,
    color: "#2F4F4F",
    marginTop: 10,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  label: {
    fontSize: 18,
    color: "#2F4F4F",
    marginBottom: 10,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  thoughtsInput: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    height: 150,
    textAlignVertical: "top",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  libraryButton: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  libraryTitle: {
    fontSize: 16,
    color: "#2F4F4F",
    marginBottom: 10,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  gridImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: "#E8E4D8",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 20,
  },
  draftButton: {
    flex: 1,
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8E4D8",
  },
  draftButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
    marginLeft: 5,
  },
  postButton: {
    flex: 2,
    backgroundColor: "#2F4F4F",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  postButtonDisabled: {
    opacity: 0.7,
  },
  postButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
  },
});
