import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';

interface NotificationSettings {
  newFollowers: boolean;
  newComments: boolean;
  newLikes: boolean;
}

interface NotificationToggleProps {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newFollowers: true,
    newComments: true,
    newLikes: true,
  });

  const toggleAllNotifications = (value: boolean) => {
    setNotifications({
      newFollowers: value,
      newComments: value,
      newLikes: value,
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement logout logic with Supabase
            router.replace('/');
          },
        },
      ],
    );
  };

  const NotificationToggle: React.FC<NotificationToggleProps> = ({ title, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={value ? '#007AFF' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Settings" 
        showBackButton={true}
      />
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <NotificationToggle
            title="All Notifications"
            value={Object.values(notifications).every(v => v)}
            onValueChange={toggleAllNotifications}
          />
          <View style={styles.divider} />
          <NotificationToggle
            title="New Followers"
            value={notifications.newFollowers}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, newFollowers: value }))}
          />
          <NotificationToggle
            title="New Comments"
            value={notifications.newComments}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, newComments: value }))}
          />
          <NotificationToggle
            title="New Likes"
            value={notifications.newLikes}
            onValueChange={(value) => setNotifications(prev => ({ ...prev, newLikes: value }))}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  settingTitle: {
    fontSize: 16,
    color: '#000',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
}); 