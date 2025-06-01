import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function Step1LoginScreen() {
  const { signIn, signUp, testConnection, loading, hasCompletedOnboarding } = useAuth();
  const [connectionTested, setConnectionTested] = useState(false);

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


  const handleLoginWithUsername = () => {
    // Navigate to login form for existing users
    router.push('/onboarding_flow/login_form');
  };

  const handleSignUp = () => {
    // Navigate to onboarding flow for new users
    router.push('/onboarding_flow/step2_username');
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
      {/* <TouchableOpacity style={styles.testButton} onPress={handleTestNext}>
        <Text style={styles.testButtonText}>TEST →</Text>
      </TouchableOpacity> */}
      
      <View style={styles.content}>
        <Text style={styles.title}>revue</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.signupButton} 
            onPress={handleSignUp}
          >
            <Text style={styles.signupButtonText}>create account</Text>
          </TouchableOpacity>
          
          {/* <TouchableOpacity 
            style={[styles.googleButton, loading && styles.disabledButton]} 
            onPress={handleContinueWithGoogle}
            disabled={loading}
          >
            <Text style={styles.googleButtonText}>Continue with</Text>
            <Text style={styles.googleText}>Google</Text>
          </TouchableOpacity> */}
          
          <TouchableOpacity 
            style={[styles.usernameButton, loading && styles.disabledButton]} 
            onPress={handleLoginWithUsername}
            disabled={loading}
          >
            <Text style={styles.usernameButtonText}>log in</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            revue (noun) a multi-act theatrical entertainment
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
