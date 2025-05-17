import { Stack } from 'expo-router';

export default function PostFlowLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="step1"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="step2"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="step3"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 