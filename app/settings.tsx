import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import ProfileEditForm from '@/components/ProfileEditForm';
import { AuthDebugger } from '@/lib/authDebug';

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
  const { signOut } = useAuth();
  const { refreshAll } = useUserProfile();
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newFollowers: true,
    newComments: true,
    newLikes: true,
  });
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');

  // Debug: Log to ensure component is rendering
  console.log('🔍 Settings screen is rendering');

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
          onPress: async () => {
            try {
              const result = await signOut();
              
              if (result.success) {
                // Redirect to login screen after successful logout
                router.replace('/onboarding_flow/step1_login');
              } else {
                Alert.alert('Logout Failed', result.error || 'Failed to logout. Please try again.');
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Logout Error', 'An unexpected error occurred during logout.');
            }
          },
        },
      ],
    );
  };

  const handleDebugAuth = async () => {
    Alert.alert(
      'Debug Authentication', 
      'This will run authentication tests. Check the console for detailed results.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Run Tests',
          onPress: async () => {
            console.log('🔧 Starting Auth Debug Tests...');
            
            // Test environment variables
            await AuthDebugger.testEnvironmentVariables();
            
            // Test direct HTTP request
            await AuthDebugger.testDirectHttpRequest();
            
            // Test full auth flow
            const result = await AuthDebugger.testConnection();
            
            Alert.alert(
              'Debug Complete',
              result.success 
                ? 'Tests completed. Check console for details.' 
                : `Tests failed: ${result.error}`,
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleDebugProfile = async () => {
    Alert.alert(
      'Debug Profile', 
      'Choose how to debug your profile data:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete Data Flow Debug',
          onPress: async () => {
            console.log('🔧 Starting Complete Data Flow Debug...');
            
            const result = await AuthDebugger.debugCompleteDataFlow();
            
            Alert.alert(
              'Complete Debug Complete',
              result.success 
                ? 'Complete analysis finished. Check console for detailed breakdown of the entire data flow from onboarding to database.' 
                : `Complete debug failed: ${result.error}`,
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Check Profile',
          onPress: async () => {
            console.log('🔧 Starting Profile Debug...');
            
            // Check current profile
            const result = await AuthDebugger.testCurrentUserProfile();
            
            Alert.alert(
              'Profile Debug Complete',
              result.success 
                ? 'Profile checked. See console for details.' 
                : `Profile check failed: ${result.error}`,
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Fix Username Issue',
          onPress: async () => {
            console.log('🔧 Attempting to fix username from onboarding...');
            
            try {
              // Try to fix username from onboarding data
              const result = await AuthDebugger.fixUsernameFromOnboarding();
              
              if (result.success) {
                // Refresh the UserProfile context to update the UI
                console.log('🔄 Refreshing profile context...');
                await refreshAll();
                
                Alert.alert(
                  'Username Fixed!',
                  result.message || 'Username and display name have been restored from your onboarding data!',
                  [{ 
                    text: 'OK',
                    onPress: () => {
                      router.back();
                    }
                  }]
                );
              } else {
                Alert.alert(
                  'Username Fix Failed',
                  `Unable to fix username: ${result.error}`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error during username fix:', error);
              Alert.alert(
                'Username Fix Error',
                'An unexpected error occurred while fixing your username.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
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
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setShowProfileEdit(true)}
          >
            <Text style={styles.settingTitle}>Edit Profile</Text>
            <Feather name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Debug Section - Development only */}
        {__DEV__ && (
          <View style={[styles.section, { backgroundColor: '#FFE6E6', padding: 15, borderRadius: 10 }]}>
            <Text style={[styles.sectionTitle, { color: '#CC0000' }]}>🚨 DEBUG SECTION (Development Only)</Text>
            <TouchableOpacity 
              style={[styles.settingItem, { backgroundColor: '#FFF' }]} 
              onPress={handleDebugAuth}
            >
              <Text style={styles.settingTitle}>Test Authentication</Text>
              <Feather name="tool" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.settingItem, { backgroundColor: '#FFF' }]} 
              onPress={handleDebugProfile}
            >
              <Text style={styles.settingTitle}>Debug Profile Data</Text>
              <Feather name="user" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications Section */}
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

        {/* QUICK FIXES SECTION - Development only */}
        {__DEV__ && (
          <View style={[styles.section, { backgroundColor: '#E6F3FF', padding: 15, borderRadius: 10 }]}>
            <Text style={[styles.sectionTitle, { color: '#0066CC', fontSize: 18 }]}>🔧 Quick Fixes (Development Only)</Text>
            
            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10, backgroundColor: '#E6FFE6', borderColor: '#00AA00' }]} 
              onPress={() => {
                setIsLoading(true);
                AuthDebugger.fixOnboardingCompletion().then(async result => {
                  setDebugMessage(result.message || 'Onboarding fix completed');
                  if (result.success) {
                    Alert.alert('Success!', 'Onboarding completion fixed! The app should now route to the main screen. Please restart the app or navigate back to verify.', [
                      {
                        text: 'Go to Main App',
                        onPress: () => {
                          router.replace('/(tabs)');
                        }
                      }
                    ]);
                  } else {
                    Alert.alert('Error', result.error || 'Fix failed');
                  }
                  setIsLoading(false);
                });
              }}
            >
              <Text style={[styles.debugButtonText, { color: '#00AA00' }]}>🏁 Fix Onboarding Routing Issue</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10 }]} 
              onPress={() => {
                setIsLoading(true);
                AuthDebugger.debugCompleteDataFlow().then(result => {
                  setDebugMessage(result.message || 'Debug completed');
                  setIsLoading(false);
                });
              }}
            >
              <Text style={styles.debugButtonText}>🔧 Debug Complete Data Flow</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10 }]} 
              onPress={() => {
                setIsLoading(true);
                AuthDebugger.fixUserDataFromProfile().then(async result => {
                  setDebugMessage(result.message || 'Fix completed');
                  if (result.success) {
                    // Refresh the profile context to update UI
                    console.log('🔄 Refreshing profile context after fix...');
                    await refreshAll();
                    Alert.alert('Success', 'User data has been fixed! Username and display name have been properly set.');
                  } else {
                    Alert.alert('Error', result.error || 'Fix failed');
                  }
                  setIsLoading(false);
                });
              }}
            >
              <Text style={styles.debugButtonText}>🔧 Fix User Data (Clear Stale Data)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10 }]} 
              onPress={() => {
                setIsLoading(true);
                AuthDebugger.addSampleMediaPreferences().then(async result => {
                  setDebugMessage(result.message || 'Sample media added');
                  if (result.success) {
                    // Refresh the profile context to update UI
                    console.log('🔄 Refreshing profile context after adding media...');
                    await refreshAll();
                    Alert.alert('Success', `Added ${result.mediaCount || 3} sample media preferences!`);
                  } else {
                    Alert.alert('Error', result.error || 'Failed to add sample media');
                  }
                  setIsLoading(false);
                });
              }}
            >
              <Text style={styles.debugButtonText}>🎬 Add Sample Media Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10, backgroundColor: '#FFE6CC', borderColor: '#FF8800' }]} 
              onPress={() => {
                setIsLoading(true);
                AuthDebugger.fixUserDataFromProfile().then(async result => {
                  setDebugMessage('Username fix with enhanced logging completed');
                  if (result.success) {
                    // Refresh the profile context to update UI
                    console.log('🔄 Refreshing profile context after username fix...');
                    await refreshAll();
                    Alert.alert('Username Fix', `Username should now be: ${result.suggestions?.username || 'unknown'}`);
                  } else {
                    Alert.alert('Error', result.error || 'Username fix failed');
                  }
                  setIsLoading(false);
                });
              }}
            >
              <Text style={[styles.debugButtonText, { color: '#FF8800' }]}>🔧 Fix Username Only (Enhanced Logging)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10, backgroundColor: '#FFE6E6', borderColor: '#FF6B6B' }]} 
              onPress={() => {
                setIsLoading(true);
                AuthDebugger.testLogoutFlow().then(async result => {
                  setDebugMessage(result.message || 'Logout test completed');
                  await refreshAll();
                  Alert.alert('Logout Test', result.message || 'Test completed - check console for details');
                  setIsLoading(false);
                });
              }}
            >
              <Text style={[styles.debugButtonText, { color: '#FF6B6B' }]}>🚪 Test Logout Flow</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10, backgroundColor: '#E6E6FF', borderColor: '#6666FF' }]} 
              onPress={() => {
                setIsLoading(true);
                console.log('🔄 Force refreshing all profile data...');
                refreshAll().then(() => {
                  setDebugMessage('Profile data force refreshed from database');
                  Alert.alert('Success', 'Profile data has been force refreshed from the database!');
                  setIsLoading(false);
                }).catch(error => {
                  console.error('❌ Error force refreshing:', error);
                  setDebugMessage('Error during force refresh');
                  Alert.alert('Error', 'Failed to refresh profile data');
                  setIsLoading(false);
                });
              }}
            >
              <Text style={styles.debugButtonText}>🔄 Force Refresh Profile Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { marginBottom: 10, backgroundColor: '#E6FFE6', borderColor: '#00CC00' }]} 
              onPress={() => {
                Alert.alert(
                  'Media Management Info',
                  'Head to your profile page to test the new features:\n\n' +
                  '• Tap the ✕ button on any media item to remove it\n' +
                  '• Tap and hold the ⋮⋮⋮ button to drag and reorder\n' +
                  '• Changes are saved automatically to Supabase\n\n' +
                  'You can add sample media using the button above to test with.',
                  [{ text: 'Got it!' }]
                );
              }}
            >
              <Text style={[styles.debugButtonText, { color: '#00CC00' }]}>📱 Test Media Remove & Reorder</Text>
            </TouchableOpacity>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}

            {debugMessage && (
              <View style={styles.debugMessage}>
                <Text style={styles.debugMessageText}>{debugMessage}</Text>
              </View>
            )}
          </View>
        )}

        {/* Add some bottom padding for better scrolling */}
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileEdit}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ProfileEditForm 
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => {
            // Profile updated successfully, modal will close automatically
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'LibreBaskerville_400Regular',
    marginBottom: 8,
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
    marginTop: 30,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  debugButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  debugMessage: {
    padding: 10,
  },
  debugMessageText: {
    color: '#000',
    fontSize: 16,
  },
}); 