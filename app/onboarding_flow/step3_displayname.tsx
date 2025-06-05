import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';

export default function Step3DisplayNameScreen() {
  const { user, session, saveOnboardingData, getOnboardingData } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [useAutoUsername, setUseAutoUsername] = useState(true);
  const [isDisplayNameFocused, setIsDisplayNameFocused] = useState(false);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageConfirmation, setShowImageConfirmation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Debug auth state
  useEffect(() => {
    console.log('🔍 Step 3 - Auth state debug:');
    console.log('- user:', user);
    console.log('- session:', session);
    console.log('- session.user:', session?.user);
    
    // If we still don't have auth after a few seconds, there might be an issue
    if (!user && !session?.user) {
      console.log('⚠️ No auth state available in Step 3 - checking again in 2 seconds...');
      const timeoutId = setTimeout(() => {
        console.log('🔍 Step 3 - Auth state recheck:');
        console.log('- user:', user);
        console.log('- session:', session);
        console.log('- session.user:', session?.user);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, session]);

  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      const data = await getOnboardingData();
      if (data.displayName) setDisplayName(data.displayName);
      if (data.username) {
        setUsername(data.username);
        setUseAutoUsername(false); // If they have a saved username, they probably customized it
      }
      if (data.profileImageUrl) setProfileImageUrl(data.profileImageUrl);
    };
    loadData();
  }, [getOnboardingData]);

  // Auto-generate username from display name
  const generateUsername = (name: string): string => {
    if (!name.trim()) return '';
    
    let baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 15); // Leave room for unique suffix
    
    // Add unique suffix to prevent duplicates
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
    const randomSuffix = Math.random().toString(36).substring(2, 4); // 2 random chars
    
    return `${baseUsername}_${timestamp}${randomSuffix}`;
  };

  // Username validation
  const validateUsername = (value: string): { isValid: boolean; error?: string } => {
    if (value.length === 0) {
      return { isValid: false };
    }
    if (value.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    return { isValid: true };
  };

  // Handle display name change
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    
    // Auto-generate username if auto mode is enabled
    if (useAutoUsername) {
      const autoUsername = generateUsername(value);
      setUsername(autoUsername);
    }
  };

  // Handle username change
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const validation = validateUsername(value);
    setUsernameError(validation.error || '');
  };

  // Toggle auto username
  const handleToggleAutoUsername = () => {
    const newAutoMode = !useAutoUsername;
    setUseAutoUsername(newAutoMode);
    
    if (newAutoMode) {
      // Generate username from current display name
      const autoUsername = generateUsername(displayName);
      setUsername(autoUsername);
      setUsernameError('');
    }
  };

  const handleNext = async () => {
    // Validate required fields
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter a display name.');
      return;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      Alert.alert('Validation Error', usernameValidation.error || 'Please fix the username.');
      return;
    }

    // Save onboarding data
    await saveOnboardingData({
      displayName,
      username,
      profileImageUrl,
      step: 3
    });
    
    router.push('/onboarding_flow/step4_contactsync');
  };

  const handleBack = () => {
    router.back();
  };

  // Handle display name focus
  const handleDisplayNameFocus = () => {
    setIsDisplayNameFocused(true);
  };

  // Handle display name blur
  const handleDisplayNameBlur = () => {
    setIsDisplayNameFocused(false);
  };

  // Handle username focus
  const handleUsernameFocus = () => {
    setIsUsernameFocused(true);
  };

  // Handle username blur
  const handleUsernameBlur = () => {
    setIsUsernameFocused(false);
  };

  // Handle avatar/image picker
  const handleAvatarPress = async () => {
    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access photo library is required to set a profile picture.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setShowImageConfirmation(true);
    }
  };

  // Confirm selected image
  const handleConfirmImage = async () => {
    const currentUser = user || session?.user;
    
    // Temporary fallback for testing - use a mock user ID
    const fallbackUserId = 'temp-user-' + Date.now();
    const userId = currentUser?.id || fallbackUserId;
    
    if (!selectedImage) {
      console.log('❌ Missing selectedImage');
      return;
    }

    console.log('🔄 Profile upload attempt:');
    console.log('- selectedImage:', !!selectedImage);
    console.log('- user:', !!user);
    console.log('- sessionUser:', !!session?.user);
    console.log('- currentUser:', !!currentUser);
    console.log('- userId being used:', userId);
    console.log('- isFallback:', !currentUser);

    setIsUploading(true);
    setShowImageConfirmation(false);

    try {
      console.log('🔄 Starting profile image upload...');
      console.log('👤 User ID:', userId);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${userId}/profile-${timestamp}.jpg`;
      console.log('📁 File name:', fileName);

      // Convert image to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      console.log('📦 Blob created, size:', blob.size);

      // Upload to Supabase Storage using auth client
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw error;
      }

      console.log('✅ Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 Public URL generated:', publicUrl);
      console.log('📋 URL breakdown:');
      console.log('- Full URL:', publicUrl);
      console.log('- URL length:', publicUrl.length);
      console.log('- URL type:', typeof publicUrl);
      
      // Update the profile image URL state to display the new image
      setProfileImageUrl(publicUrl);
      console.log('🎨 Profile image URL updated in state');
      console.log('🔍 Current profileImageUrl state:', publicUrl);
      
      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      console.error('❌ Error uploading profile image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Upload Error', `Failed to upload profile picture: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
    }
  };

  // Cancel image selection
  const handleCancelImage = () => {
    setSelectedImage(null);
    setShowImageConfirmation(false);
  };

  // Choose different image
  const handleChooseDifferent = () => {
    setShowImageConfirmation(false);
    // Automatically trigger image picker again
    setTimeout(handleAvatarPress, 100);
  };

  // TODO: remove before deploying - test navigation button
  const handleTestNext = () => {
    router.push('/onboarding_flow/step4_contactsync');
  };

  const isFormValid = displayName.trim().length > 0 && username.trim().length > 0 && validateUsername(username).isValid;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      {/* TODO: remove before deploying - test navigation button */}
      {/* <TouchableOpacity style={styles.testButton} onPress={handleTestNext}>
        <Text style={styles.testButtonText}>TEST →</Text>
      </TouchableOpacity> */}
      
      <KeyboardDismissWrapper>
        <View style={styles.contentContainer}>
          <View style={styles.content}>
            {/* Header - hide when display name or username is focused */}
            <View style={[styles.header, (isDisplayNameFocused || isUsernameFocused) && styles.hidden]}>
              <Text style={styles.title}>revue</Text>
              {user && (
                <Text style={styles.userInfo}>Step 3 of 6</Text>
              )}
            </View>
            
            {/* Avatar - hide when display name or username is focused */}
            <View style={[styles.avatarContainer, (isDisplayNameFocused || isUsernameFocused) && styles.hidden]}>
              <TouchableOpacity style={styles.avatar} onPress={handleAvatarPress} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator size="large" color="#142D0A" />
                ) : profileImageUrl ? (
                  <>
                    <Image 
                      source={{ uri: profileImageUrl }} 
                      style={styles.avatarImage}
                      onLoad={() => console.log('✅ Image loaded successfully:', profileImageUrl)}
                      onError={(error) => console.log('❌ Image load error:', error.nativeEvent.error, 'URL:', profileImageUrl)}
                    />
                  </>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarHint}>Tap to add photo</Text>
              {/* Debug info */}
              {profileImageUrl && (
                <Text style={styles.debugText}>URL: {profileImageUrl}</Text>
              )}
            </View>
            
            {/* Display name field - always rendered, centered when focused */}
            <View style={[styles.inputGroup, isDisplayNameFocused && styles.centeredInputGroup]}>
              <Text style={styles.label}>Display name:</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={handleDisplayNameChange}
                onFocus={handleDisplayNameFocus}
                onBlur={handleDisplayNameBlur}
                placeholder="Katniss Everdeen"
                placeholderTextColor="#8B9A7D"
              />
              {isDisplayNameFocused && (
                <Text style={styles.hintText}>This is what others will see</Text>
              )}
            </View>
            
            {/* Auto-generation toggle - positioned between the two fields */}
            <View style={[styles.toggleContainer, (isDisplayNameFocused || isUsernameFocused) && styles.hidden]}>
              <TouchableOpacity style={styles.toggleButton} onPress={handleToggleAutoUsername}>
                <Text style={styles.toggleButtonText}>
                  {useAutoUsername ? '🎲 Auto-generate username' : '✏️ Use custom username'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Username field - always rendered, centered when focused */}
            <View style={[styles.inputGroup, isUsernameFocused && styles.centeredInputGroup]}>
              <Text style={styles.label}>Username:</Text>
              <TextInput
                style={[
                  styles.input,
                  useAutoUsername && styles.inputDisabled,
                  usernameError ? styles.inputError : username && validateUsername(username).isValid ? styles.inputValid : null
                ]}
                value={username}
                onChangeText={handleUsernameChange}
                onFocus={handleUsernameFocus}
                onBlur={handleUsernameBlur}
                placeholder="katniss_"
                placeholderTextColor="#8B9A7D"
                editable={!useAutoUsername}
              />
              {isUsernameFocused && !useAutoUsername && (
                <Text style={styles.hintText}>Letters, numbers, and underscores only</Text>
              )}
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : username && validateUsername(username).isValid ? (
                <Text style={styles.successText}>✓ Username looks good</Text>
              ) : null}
            </View>
          </View>
          
          {isFormValid && !isDisplayNameFocused && !isUsernameFocused && (
            <View style={styles.nextButtonContainer}>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardDismissWrapper>

      {/* Image Confirmation Modal */}
      <Modal
        visible={showImageConfirmation}
        transparent
        animationType="slide"
        onRequestClose={handleCancelImage}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Use this photo?</Text>
            
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleChooseDifferent}>
                <Text style={styles.secondaryButtonText}>Choose Different</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmImage}>
                <Text style={styles.primaryButtonText}>Use This Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  testButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 29,
    color: '#142D0A',
    fontWeight: '300',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    marginBottom: 5,
  },
  userInfo: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#A3A3A3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F0',
  },
  inputGroup: {
    gap: 8,
    marginBottom: 42,
  },
  label: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1.84,
    borderColor: '#142D0A',
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  nextButtonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
    position: 'absolute',
  },
  centeredInputGroup: {
    gap: 8,
    alignItems: 'stretch',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 300, // Account for keyboard space
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarHint: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    color: '#142D0A',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  secondaryButton: {
    backgroundColor: '#8B9A7D',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  primaryButton: {
    backgroundColor: '#142D0A',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F0',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputValid: {
    borderColor: '#142D0A',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  successText: {
    color: '#142D0A',
    fontSize: 12,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 42,
  },
  toggleButton: {
    backgroundColor: '#142D0A',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
});
