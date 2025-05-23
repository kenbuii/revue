import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step4ContactSyncScreen() {
  const handleSyncContacts = () => {
    router.push('/onboarding_flow/step5_genreselect');
  };

  const handleAddFriendsLater = () => {
    router.push('/onboarding_flow/step5_genreselect');
  };

  const handleInviteFriends = () => {
    // Handle invite functionality
    console.log('Invite friends');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
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
          <TouchableOpacity style={styles.nextButton} onPress={handleAddFriendsLater}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.laterButton} onPress={handleAddFriendsLater}>
            <Text style={styles.laterButtonText}>Add friends later</Text>
          </TouchableOpacity>
          
          <View style={styles.inviteContainer}>
            <Text style={styles.inviteText}>Friends not on Revue? </Text>
            <TouchableOpacity onPress={handleInviteFriends}>
              <Text style={styles.inviteLink}>Invite them!</Text>
            </TouchableOpacity>
          </View>
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
    color: '#333',
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
    color: '#333',
    marginBottom: 5,
  },
  friendsText: {
    fontSize: 48,
    fontStyle: 'italic',
    color: '#333',
    fontWeight: '300',
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  syncButtonText: {
    fontSize: 16,
    color: '#333',
  },
  syncIcon: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIconText: {
    fontSize: 16,
  },
  bottomContainer: {
    marginTop: 'auto',
    gap: 15,
    marginBottom: 40,
  },
  nextButton: {
    backgroundColor: '#6B7280',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  laterButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#6B7280',
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
    color: '#666',
    fontStyle: 'italic',
  },
  inviteLink: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
});
