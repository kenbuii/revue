import { Stack } from 'expo-router';

export default function MediaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animationTypeForReplace: 'push',
      }}
    >
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: false,
          gestureEnabled: true,
        }} 
      />
    </Stack>
  );
} 