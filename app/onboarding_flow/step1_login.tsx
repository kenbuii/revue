import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function Step1LoginScreen() {
  const { signIn, signUp, testConnection, loading } = useAuth();
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
      // Demo account for testing - this will fail if account doesn't exist
      const result = await signIn('demo@revue.app', 'demo123');
      
      if (result.success) {
        console.log('✅ Demo login successful');
        // Auth context will handle navigation
      } else {
        Alert.alert(
          'Login Failed', 
          `${result.error}\n\nTip: Try "Sign up" first to create a test account, or create demo@revue.app in your Supabase dashboard.`
        );
      }
    } catch (error) {
      Alert.alert('Login Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    // For testing, create a demo account with timestamp
    setIsSigningIn(true);
    
    try {
      const timestamp = Date.now();
      const email = `test${timestamp}@revue.app`;
      const username = `test_user_${timestamp}`;
      
      console.log(`Creating test account: ${email}`);
      
      const result = await signUp(email, 'demo123', username);
      
      if (result.success) {
        console.log('✅ Demo signup successful');
        Alert.alert(
          'Account Created!', 
          `Test account created: ${email}\nYou can now continue with onboarding.`
        );
        // Navigate to next step
        router.push('/onboarding_flow/step2_username');
      } else {
        Alert.alert('Signup Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Signup Error', 'An unexpected error occurred');
      console.error('Signup error:', error);
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
              <Text style={styles.usernameButtonText}>Test Login (demo@revue.app)</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Need a test account? </Text>
          <TouchableOpacity 
            onPress={handleSignUp}
            disabled={loading || isSigningIn}
          >
            <Text style={styles.signUpLink}>Create one here!</Text>
          </TouchableOpacity>
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
  signUpContainer: {
    flexDirection: 'row',
    marginTop: 40,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  signUpLink: {
    fontSize: 14,
    color: '#142D0A',
    textDecorationLine: 'underline',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
});
