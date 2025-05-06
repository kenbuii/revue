import React from 'react';
import { Image } from 'react-native';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
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
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('@/assets/tab_bar/home_active.png') : require('@/assets/tab_bar/home.png')}
              style={{ width: 24, height: 24 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('@/assets/tab_bar/search_active.png') : require('@/assets/tab_bar/search.png')}
              style={{ width: 24, height: 24 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? require('@/assets/tab_bar/notification_active.png') : require('@/assets/tab_bar/notification.png')}
              style={{ width: 24, height: 24 }}
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
  );
}
