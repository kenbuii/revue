import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';

export default function LoginFormScreen() {
  const { signIn, hasCompletedOnboarding, getOnboardingData, completeOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      console.log('🔄 Attempting login with:', email);
      
      const result = await signIn(email.trim(), password);
      
      if (result.success) {
        console.log('✅ Login successful');
        
        // Check if user has completed onboarding and route accordingly
        console.log('🔍 Checking onboarding completion status...');
        const onboardingCompleted = await hasCompletedOnboarding();
        console.log('📊 Onboarding completed:', onboardingCompleted);
        
        if (onboardingCompleted) {
          // User has completed onboarding, go to home screen
          console.log('📍 Routing to home screen (onboarding completed)');
          router.replace('/(tabs)');
        } else {
          // Check for any saved onboarding progress
          const onboardingData = await getOnboardingData();
          console.log('📊 Saved onboarding data:', onboardingData);
          
          // If user has no local onboarding data, assume they're an existing user
          // who should go to home (they successfully logged in with valid credentials)
          const hasLocalData = !!(
            onboardingData.email || 
            onboardingData.username || 
            onboardingData.displayName || 
            onboardingData.step > 1
          );
          
          if (!hasLocalData) {
            console.log('🏠 No local onboarding data found - assuming existing user, routing to home');
            // Mark as completed and go to home
            await completeOnboarding();
            router.replace('/(tabs)');
          } else {
            // User has partial onboarding data, resume where they left off
            console.log('🔄 Resuming onboarding from saved progress...');
            
            if (onboardingData.step >= 5) {
              router.push('/onboarding_flow/step6_final');
            } else if (onboardingData.step >= 4) {
              router.push('/onboarding_flow/step5_genreselect');
            } else if (onboardingData.step >= 3) {
              router.push('/onboarding_flow/step4_contactsync');
            } else if (onboardingData.step >= 2) {
              router.push('/onboarding_flow/step3_displayname');
            } else {
              router.push('/onboarding_flow/step2_username');
            }
          }
        }
      } else {
        console.error('❌ Login failed:', result.error);
        Alert.alert(
          'Login Failed', 
          result.error || 'Invalid email or password. Please try again.'
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      <KeyboardDismissWrapper>
        <View style={styles.contentContainer}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.welcomeText}>Welcome back to</Text>
              <Text style={styles.title}>revue</Text>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email:</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholderTextColor="#8B9A7D"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password:</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoComplete="password"
                  placeholderTextColor="#8B9A7D"
                />
              </View>
            </View>
          </View>
          
          {isFormValid && (
            <View style={styles.loginButtonContainer}>
              <TouchableOpacity 
                style={[styles.loginButton, isLoggingIn && styles.disabledButton]} 
                onPress={handleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardDismissWrapper>
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
  },
  formContainer: {
    gap: 30,
    marginBottom: 60,
  },
  inputGroup: {
    gap: 8,
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
  loginButtonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  loginButton: {
    backgroundColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 