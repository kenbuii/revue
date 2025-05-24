import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step4ContactSyncScreen() {
  const [hasClickedSync, setHasClickedSync] = useState(false);

  const handleSyncContacts = () => {
    setHasClickedSync(true);
    router.push('/onboarding_flow/sync_contacts');
  };

  const handleAddFriendsLater = () => {
    router.push('/onboarding_flow/step5_genreselect');
  };

  const handleInviteFriends = async () => {
    try {
      const result = await Share.share({
        message: 'Hey! I just joined Revue - a great app for sharing book and movie reviews. You should check it out!',
        title: 'Join me on Revue',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
          console.log('Shared with activity type:', result.activityType);
        } else {
          // Shared
          console.log('Content shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while trying to share.');
      console.error('Share error:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.addText}>add</Text>
            <Text style={styles.friendsText}>friends</Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.syncButton} onPress={handleSyncContacts}>
              <Text style={styles.syncButtonText}>Sync Contacts</Text>
              <View style={styles.syncIcon}>
                <Text style={styles.syncIconText}>📱</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.laterButton} onPress={handleAddFriendsLater}>
                <Text style={styles.laterButtonText}>Add friends later</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inviteContainer}>
            <Text style={styles.inviteText}>Friends not on Revue? </Text>
            <TouchableOpacity onPress={handleInviteFriends}>
              <Text style={styles.inviteLink}>Invite them!</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {hasClickedSync && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.nextButton} onPress={handleAddFriendsLater}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
            
            {/* <TouchableOpacity style={styles.laterButton} onPress={handleAddFriendsLater}>
              <Text style={styles.laterButtonText}>Add friends later</Text>
            </TouchableOpacity> */}
          </View>
        )}
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
});
