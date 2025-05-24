import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function IndexScreen() {
  const { isAuthenticated, loading, user, hasCompletedOnboarding } = useAuth();

  useEffect(() => {
    const handleRouting = async () => {
      // Wait for auth to initialize
      if (loading) return;

      console.log('🧭 Index routing - Auth state:', { isAuthenticated, user: !!user });

      // If not authenticated, go to login
      if (!isAuthenticated) {
        console.log('📍 Routing to login (not authenticated)');
        router.replace('/onboarding_flow/step1_login');
        return;
      }

      // If authenticated, check onboarding completion
      const onboardingCompleted = await hasCompletedOnboarding();
      console.log('📍 Onboarding completed:', onboardingCompleted);

      if (!onboardingCompleted) {
        console.log('📍 Routing to step 2 (authenticated but onboarding incomplete)');
        router.replace('/onboarding_flow/step2_username');
      } else {
        console.log('📍 Routing to main app (authenticated and onboarding complete)');
        router.replace('/(tabs)');
      }
    };

    handleRouting();
  }, [isAuthenticated, loading, user, hasCompletedOnboarding]);

  // Show loading screen while determining route
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#142D0A" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F0',
  },
}); 