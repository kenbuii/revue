import { useEffect } from 'react';
import { router } from 'expo-router';

export default function IndexScreen() {
  useEffect(() => {
    // For now, always redirect to onboarding
    // Later this can be updated to check authentication status
    router.replace('/onboarding_flow/step1_login');
  }, []);

  return null;
} 