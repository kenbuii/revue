import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function OnboardingLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="step1_login" />
        <Stack.Screen name="login_form" />
        <Stack.Screen name="step2_username" />
        <Stack.Screen name="step3_displayname" />
        <Stack.Screen name="step4_contactsync" />
        <Stack.Screen name="step5_genreselect" />
        <Stack.Screen name="step6_final" />
        <Stack.Screen name="sync_contacts" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
