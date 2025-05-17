import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const router = useRouter();

  const handleNewPost = () => {
    router.push('/(post_flow)/step1');
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFDF6',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color, size }) => (
                <Ionicons 
                    name={focused ? 'home' : 'home-outline'} 
                    size={size ?? 24} 
                    color={color ?? '#004D00'} 
                />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ focused, color, size }) => (
                <Ionicons 
                    name={focused ? 'search-sharp' : 'search-outline'} 
                    size={size ?? 24} 
                    color={color ?? '#004D00'} 
                />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ focused, color, size }) => (
                <Ionicons 
                    name={focused ? 'notifications' : 'notifications-outline'} 
                    size={size ?? 24} 
                    color={color ?? '#004D00'} 
                />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <Image
                source={require('@/assets/tab_bar/avatar.png')}
                style={{ width: 24, height: 24, borderRadius: 12 }}
              />
            ),
          }}
        />
      </Tabs>

      {/* Persistent Add Post Button */}
      <TouchableOpacity style={styles.fab} onPress={handleNewPost}>
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 100, // above tab bar
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#004D00', // green theme
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
