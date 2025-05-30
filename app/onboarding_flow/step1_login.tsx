import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function Step1LoginScreen() {
  const { signIn, signUp, testConnection, loading, hasCompletedOnboarding } = useAuth();
  const [connectionTested, setConnectionTested] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Test connection when component mounts
  useEffect(() => {
    const testSupabaseConnection = async () => {
      console.log('🔄 Testing Supabase connection from Step1...');
      const result = await testConnection();
      
      if (result.success) {
        console.log('✅ Connection test successful!');
      } else {
        console.error('❌ Connection test failed:', result.error);
        Alert.alert('Connection Error', result.error || 'Failed to connect to backend');
      }
      
      setConnectionTested(true);
    };

    testSupabaseConnection();
  }, [testConnection]);

  const handleContinueWithGoogle = () => {
    // TODO: Implement Google OAuth in Phase 4
    Alert.alert('Coming Soon', 'Google login will be implemented in Phase 4');
  };

  const handleLoginWithUsername = async () => {
    // For testing, use demo accounts
    setIsSigningIn(true);
    
    try {
      console.log('🔄 Attempting login with demo@example.com...');
      
      // Demo account for testing - this will fail if account doesn't exist
      const result = await signIn('demo@example.com', 'myfirst123');
      
      if (result.success) {
        console.log('✅ Demo login successful');
        
        // Check if user has completed onboarding
        const onboardingCompleted = await hasCompletedOnboarding();
        
        if (onboardingCompleted) {
          // User has completed onboarding, go to main app
          console.log('📍 Routing to main app (onboarding completed)');
          router.replace('/(tabs)');
        } else {
          // User needs to complete onboarding
          console.log('📍 Routing to onboarding step 2 (onboarding incomplete)');
          router.replace('/onboarding_flow/step2_username');
        }
      } else {
        console.error('❌ Login failed:', result.error);
        Alert.alert(
          'Login Failed', 
          `${result.error}\n\n🔧 Debug tip: Try the "Create Test Account" button first - this creates a proper authenticated user.`
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'An unexpected error occurred');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    // For testing, create a demo account with timestamp
    setIsSigningIn(true);
    
    try {
      const timestamp = Date.now();
      // Use a standard domain that Supabase will accept
      const email = `test${timestamp}@example.com`;
      const username = `test_user_${timestamp}`;
      
      console.log(`🔄 Creating test account: ${email}`);
      
      const result = await signUp(email, 'demo123', username);
      
      if (result.success) {
        console.log('✅ Demo signup successful');
        Alert.alert(
          'Account Created!', 
          `✅ Test account created: ${email}\n\nThis account should work for login. You can now continue with onboarding.`
        );
        // Navigate to next step
        router.push('/onboarding_flow/step2_username');
      } else {
        console.error('❌ Signup failed:', result.error);
        Alert.alert('Signup Failed', `${result.error}\n\nCheck your Supabase configuration.`);
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Signup Error', 'An unexpected error occurred');
    } finally {
      setIsSigningIn(false);
    }
  };

  // TODO: remove before deploying - test navigation button
  const handleTestNext = () => {
    router.push('/onboarding_flow/step2_username');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Connection status indicator */}
      {!connectionTested && (
        <View style={styles.connectionStatus}>
          <ActivityIndicator size="small" color="#142D0A" />
          <Text style={styles.connectionText}>Testing connection...</Text>
        </View>
      )}
      
      {/* TODO: remove before deploying - test navigation button */}
      <TouchableOpacity style={styles.testButton} onPress={handleTestNext}>
        <Text style={styles.testButtonText}>TEST →</Text>
      </TouchableOpacity>
      
      <View style={styles.content}>
        <Text style={styles.title}>revue</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.disabledButton]} 
            onPress={handleSignUp}
            disabled={loading || isSigningIn}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.signupButtonText}>Create Test Account</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.googleButton, loading && styles.disabledButton]} 
            onPress={handleContinueWithGoogle}
            disabled={loading}
          >
            <Text style={styles.googleButtonText}>Continue with</Text>
            <Text style={styles.googleText}>Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.usernameButton, loading && styles.disabledButton]} 
            onPress={handleLoginWithUsername}
            disabled={loading || isSigningIn}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color="#142D0A" />
            ) : (
              <Text style={styles.usernameButtonText}>Test Login (demo@example.com)</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            🔧 For testing: Use "Create Test Account" (recommended) or try demo@example.com if manually created
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  connectionStatus: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 45, 10, 0.1)',
    padding: 8,
    borderRadius: 8,
    zIndex: 1,
  },
  connectionText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  // TODO: remove before deploying - test navigation button styles
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    color: '#142D0A',
    marginBottom: 80,
    fontWeight: '300',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  signupButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  signupButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  googleButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  googleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  usernameButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  usernameButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  disabledButton: {
    opacity: 0.6,
  },
  infoContainer: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    textAlign: 'center',
    lineHeight: 16,
  },
});
