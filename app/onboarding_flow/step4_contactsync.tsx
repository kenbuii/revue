import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert, FlatList, Image, ActivityIndicator } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as CryptoJS from 'crypto-js';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';

interface FoundFriend {
  id: string;
  displayName: string;
  email?: string;
  profileImageUrl?: string;
}

export default function Step4ContactSyncScreen() {
  const { user, saveOnboardingData } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartedSync, setHasStartedSync] = useState(false);
  const [foundFriends, setFoundFriends] = useState<FoundFriend[]>([]);
  const [totalContactsChecked, setTotalContactsChecked] = useState(0);

  // Get environment variables
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

  const hashEmail = (email: string): string => {
    return CryptoJS.SHA256(email.toLowerCase().trim()).toString();
  };

  const handleSyncContacts = async () => {
    try {
      setIsLoading(true);
      setHasStartedSync(true);

      // Request permission to access contacts
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Permission to access contacts is required to find friends already on revue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Contacts.requestPermissionsAsync() }
          ]
        );
        setIsLoading(false);
        return;
      }

      console.log('📱 Fetching contacts...');
      
      // Get contacts with email addresses
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      console.log(`📊 Found ${data.length} contacts`);

      // Extract and hash email addresses
      const hashedEmails: string[] = [];
      data.forEach(contact => {
        if (contact.emails && contact.emails.length > 0) {
          contact.emails.forEach(emailObj => {
            if (emailObj.email) {
              hashedEmails.push(hashEmail(emailObj.email));
            }
          });
        }
      });

      setTotalContactsChecked(hashedEmails.length);
      console.log(`🔐 Hashed ${hashedEmails.length} email addresses`);

      if (hashedEmails.length === 0) {
        Alert.alert('No Email Contacts', 'No contacts with email addresses were found.');
        setIsLoading(false);
        return;
      }

      // Find matching users on the platform (using safe HTTP pattern)
      const matches = await findExistingUsers(hashedEmails);
      
      setFoundFriends(matches);
      console.log(`🎉 Found ${matches.length} friends on revue!`);

      // Save sync data
      await saveOnboardingData({
        contactsSynced: true,
        friendsFound: matches.length,
        step: 4
      });

    } catch (error) {
      console.error('❌ Contact sync error:', error);
      Alert.alert('Sync Error', 'Failed to sync contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const findExistingUsers = async (hashedEmails: string[]): Promise<FoundFriend[]> => {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      console.log('🔍 Searching for existing users...');

      // Use direct HTTP request (same pattern as profile image upload)
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/find_users_by_email_hash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          email_hashes: hashedEmails.slice(0, 100) // Limit to 100 for performance
        }),
      });

      if (!response.ok) {
        // If the RPC doesn't exist yet, return empty array (graceful degradation)
        console.log('🔧 Contact matching endpoint not yet implemented');
        return [];
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error finding existing users:', error);
      // Graceful degradation - return empty array if backend not ready
      return [];
    }
  };

  const handleAddFriendsLater = async () => {
    // Save that user skipped contact sync
    await saveOnboardingData({
      contactsSynced: false,
      step: 4
    });
    
    router.push('/onboarding_flow/step5_genreselect');
  };

  const handleNext = async () => {
    // Save completed sync data
    await saveOnboardingData({
      contactsSynced: true,
      friendsFound: foundFriends.length,
      step: 4
    });
    
    router.push('/onboarding_flow/step5_genreselect');
  };

  const handleInviteFriends = async () => {
    try {
      const result = await Share.share({
        message: 'Hey! I just joined revue - a great app for sharing book and movie reviews. You should check it out!',
        title: 'Join me on revue',
      });

      if (result.action === Share.sharedAction) {
        console.log('📤 Invite shared successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while trying to share.');
      console.error('Share error:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleTestNext = () => {
    router.push('/onboarding_flow/step5_genreselect');
  };

  const renderFriendItem = ({ item }: { item: FoundFriend }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendAvatar}>
        {item.profileImageUrl ? (
          <Image source={{ uri: item.profileImageUrl }} style={styles.friendAvatarImage} />
        ) : (
          <View style={styles.friendAvatarPlaceholder}>
            <Text style={styles.friendAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.friendStatus}>On revue</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      {/* TODO: remove before deploying - test navigation button */}
      {/* <TouchableOpacity style={styles.testButton} onPress={handleTestNext}>
        <Text style={styles.testButtonText}>TEST →</Text>
      </TouchableOpacity> */}
      
      <View style={styles.contentContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.addText}>add</Text>
            <Text style={styles.friendsText}>friends</Text>
          </View>

          {!hasStartedSync ? (
            <>
              <Text style={styles.descriptionText}>
                Find friends who are already on revue by securely checking your contacts.
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.syncButton, isLoading && styles.disabledButton]} 
                  onPress={handleSyncContacts}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#142D0A" />
                  ) : (
                    <>
                      <Text style={styles.syncButtonText}>Sync Contacts</Text>
                      <View style={styles.syncIcon}>
                        <Text style={styles.syncIconText}>📱</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.privacyNote}>
                <Text style={styles.privacyText}>
                  🔒 Your contacts are hashed and never stored on our servers
                </Text>
              </View>
            </>
          ) : (
            <>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#142D0A" />
                  <Text style={styles.loadingText}>Checking {totalContactsChecked} contacts...</Text>
                </View>
              ) : (
                <View style={styles.resultsContainer}>
                  {foundFriends.length > 0 ? (
                    <>
                      <Text style={styles.resultsText}>
                        🎉 Found {foundFriends.length} friend{foundFriends.length !== 1 ? 's' : ''} on revue!
                      </Text>
                      <FlatList
                        data={foundFriends}
                        renderItem={renderFriendItem}
                        keyExtractor={(item) => item.id}
                        style={styles.friendsList}
                        showsVerticalScrollIndicator={false}
                      />
                    </>
                  ) : (
                    <Text style={styles.noFriendsText}>
                      No friends found on revue yet. Invite them to join!
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
          
          <View style={styles.inviteContainer}>
            <Text style={styles.inviteText}>Friends not on revue? </Text>
            <TouchableOpacity onPress={handleInviteFriends}>
              <Text style={styles.inviteLink}>Invite them!</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.bottomContainer}>
          {hasStartedSync && !isLoading ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : null}
          
          <TouchableOpacity style={styles.laterButton} onPress={handleAddFriendsLater}>
            <Text style={styles.laterButtonText}>
              {hasStartedSync ? 'Continue' : 'Add friends later'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  testButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 100,
  },
  addText: {
    fontSize: 24,
    color: '#142D0A',
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  friendsText: {
    fontSize: 48,
    color: '#142D0A',
    fontWeight: '300',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  buttonContainer: {
    marginBottom: 80,
  },
  syncButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  syncButtonText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  syncIcon: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  syncIconText: {
    fontSize: 16,
  },
  inviteContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  inviteText: {
    fontSize: 14,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  inviteLink: {
    fontSize: 14,
    color: '#142D0A',
    textDecorationLine: 'underline',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
    gap: 15,
  },
  nextButton: {
    backgroundColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  laterButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  laterButtonText: {
    color: '#142D0A',
    fontSize: 16,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  descriptionText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
    marginBottom: 20,
  },
  privacyNote: {
    alignItems: 'center',
    marginTop: 20,
  },
  privacyText: {
    fontSize: 14,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
    marginTop: 20,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 20,
  },
  friendsList: {
    flex: 1,
    marginBottom: 20,
  },
  noFriendsText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
    textAlign: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  friendAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  friendAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  friendInfo: {
    flexDirection: 'column',
  },
  friendName: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  friendStatus: {
    fontSize: 14,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
});
