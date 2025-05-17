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
          headerShown: true,
          headerTitle: "",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: '#FAF9F6',
          },
        }}
      />
      <Stack.Screen
        name="step2"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 