import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step1LoginScreen() {
  const handleContinueWithGoogle = () => {
    // For now, just navigate to step 2
    router.push('/onboarding_flow/step2_username');
  };

  const handleLoginWithUsername = () => {
    // For now, just navigate to step 2
    router.push('/onboarding_flow/step2_username');
  };

  const handleSignUp = () => {
    // For now, just navigate to step 2
    router.push('/onboarding_flow/step2_username');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>revue</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.googleButton} onPress={handleContinueWithGoogle}>
            <Text style={styles.googleButtonText}>Continue with</Text>
            <Text style={styles.googleText}>G</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.usernameButton} onPress={handleLoginWithUsername}>
            <Text style={styles.usernameButtonText}>Log in with username</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpLink}>Sign up here!</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    fontStyle: 'italic',
    color: '#333',
    marginBottom: 80,
    fontWeight: '300',
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#333',
  },
  googleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  usernameButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  usernameButtonText: {
    fontSize: 16,
    color: '#333',
  },
  signUpContainer: {
    flexDirection: 'row',
    marginTop: 40,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  signUpLink: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
});
