import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { BookmarksProvider } from '@/contexts/BookmarksContext';
import { PostInteractionsProvider } from '@/contexts/PostInteractionsContext';
import { CommentsProvider } from '@/contexts/CommentsContext';
import { HiddenPostsProvider } from '@/contexts/HiddenPostsContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    LibreBaskerville_400Regular: require('../assets/fonts/LibreBaskerville-Regular.ttf'),
    LibreBaskerville_400Regular_Italic: require('../assets/fonts/LibreBaskerville-Italic.ttf'),
    LibreBaskerville_700Bold: require('../assets/fonts/LibreBaskerville-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationsProvider>
        <UserProfileProvider>
          <BookmarksProvider>
            <PostInteractionsProvider>
              <CommentsProvider>
                <HiddenPostsProvider>
                  <FavoritesProvider>
                    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                      <Stack>
                        <Stack.Screen name="onboarding_flow" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="(post_flow)" options={{ headerShown: false }} />
                        <Stack.Screen name="post" options={{ headerShown: false }} />
                        <Stack.Screen 
                          name="media" 
                          options={{ 
                            headerShown: false,
                            presentation: 'modal'
                          }} 
                        />
                        <Stack.Screen name="settings" options={{ headerShown: false }} />
                        <Stack.Screen name="bookmarks" options={{ headerShown: false }} />
                        <Stack.Screen name="+not-found" />
                      </Stack>
                      <StatusBar style="auto" />
                    </ThemeProvider>
                  </FavoritesProvider>
                </HiddenPostsProvider>
              </CommentsProvider>
            </PostInteractionsProvider>
          </BookmarksProvider>
        </UserProfileProvider>
        </NotificationsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
