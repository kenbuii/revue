import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function Step3DisplayNameScreen() {
  const { user, saveOnboardingData, getOnboardingData } = useAuth();
  const [displayName, setDisplayName] = useState('');

  // Load existing data
  useEffect(() => {
    const loadData = async () => {
      const data = await getOnboardingData();
      if (data.displayName) setDisplayName(data.displayName);
    };
    loadData();
  }, [getOnboardingData]);

  const handleNext = async () => {
    // Save onboarding data
    await saveOnboardingData({
      displayName,
      step: 3
    });
    
    router.push('/onboarding_flow/step4_contactsync');
  };

  const handleBack = () => {
    router.back();
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
      
      <View style={styles.contentContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>revue</Text>
            {user && (
              <Text style={styles.userInfo}>Step 3 of 6</Text>
            )}
          </View>
          
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <View style={styles.avatarPlaceholder} />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display name:</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter display name"
              placeholderTextColor="#8B9A7D"
            />
          </View>
        </View>
        
        {isFormValid && (
          <View style={styles.nextButtonContainer}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
});
