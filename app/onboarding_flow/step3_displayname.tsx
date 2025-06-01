import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';

export default function Step3DisplayNameScreen() {
  const { user, saveOnboardingData, getOnboardingData } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isDisplayNameFocused, setIsDisplayNameFocused] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageConfirmation, setShowImageConfirmation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      const data = await getOnboardingData();
      if (data.displayName) setDisplayName(data.displayName);
      if (data.profileImageUrl) setProfileImageUrl(data.profileImageUrl);
    };
    loadData();
  }, [getOnboardingData]);

  const handleNext = async () => {
    // Save onboarding data
    await saveOnboardingData({
      displayName,
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
    if (!selectedImage || !user) return;

    setIsUploading(true);
    setShowImageConfirmation(false);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${user.id}/profile-${timestamp}.jpg`;

      // Convert image to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      
      // Update profile table (if exists) or save to onboarding data
      setProfileImageUrl(publicUrl);
      
      console.log('✅ Profile image uploaded successfully:', publicUrl);
      Alert.alert('Success', 'Profile picture updated!');

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload profile picture. Please try again.');
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

  const isFormValid = displayName.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      {/* TODO: remove before deploying - test navigation button */}
      <TouchableOpacity style={styles.testButton} onPress={handleTestNext}>
        <Text style={styles.testButtonText}>TEST →</Text>
      </TouchableOpacity>
      
      <KeyboardDismissWrapper>
        <View style={styles.contentContainer}>
          <View style={styles.content}>
            {/* Header - hide when display name is focused */}
            <View style={[styles.header, isDisplayNameFocused && styles.hidden]}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.title}>revue</Text>
              {user && (
                <Text style={styles.userInfo}>Step 3 of 6</Text>
              )}
            </View>
            
            {/* Avatar - hide when display name is focused */}
            <View style={[styles.avatarContainer, isDisplayNameFocused && styles.hidden]}>
              <TouchableOpacity style={styles.avatar} onPress={handleAvatarPress} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator size="large" color="#142D0A" />
                ) : profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarHint}>Tap to add photo</Text>
            </View>
            
            {/* Display name field - always rendered, centered when focused */}
            <View style={[styles.inputGroup, isDisplayNameFocused && styles.centeredInputGroup]}>
              <Text style={styles.label}>Display name:</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                onFocus={handleDisplayNameFocus}
                onBlur={handleDisplayNameBlur}
                placeholder="Enter display name"
                placeholderTextColor="#8B9A7D"
              />
            </View>
          </View>
          
          {isFormValid && !isDisplayNameFocused && (
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
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  welcomeText: {
    fontSize: 18,
    color: '#142D0A',
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  title: {
    fontSize: 48,
    color: '#142D0A',
    fontWeight: '300',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    marginBottom: 10,
  },
  userInfo: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 60,
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
    marginBottom: 60,
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
});
