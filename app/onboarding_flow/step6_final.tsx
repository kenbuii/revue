import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step6FinalScreen() {
  const handleBeginRevueing = () => {
    // Navigate to main app (tabs)
    router.replace('/(tabs)');
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
        {/* Top left icon */}
        <View style={styles.topLeftIcon}>
          <Text style={styles.iconText}>📚</Text>
        </View>
        
        {/* Top right icon */}
        <View style={styles.topRightIcon}>
          <Text style={styles.iconText}>🎬</Text>
        </View>
        
        <View style={styles.centerContent}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>revue,</Text>
            <Text style={styles.username}>Kristine meow meow meow!</Text>
          </View>
          
          <TouchableOpacity style={styles.beginButton} onPress={handleBeginRevueing}>
            <Text style={styles.beginButtonText}>Begin revueing!</Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom left icon */}
        <View style={styles.bottomLeftIcon}>
          <Text style={styles.iconText}>🎬</Text>
        </View>
        
        {/* Bottom right icon */}
        <View style={styles.bottomRightIcon}>
          <Text style={styles.iconText}>📚</Text>
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
    zIndex: 2,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  topLeftIcon: {
    position: 'absolute',
    top: 60,
    left: 40,
    zIndex: 1,
  },
  topRightIcon: {
    position: 'absolute',
    top: 120,
    right: 40,
    zIndex: 1,
  },
  bottomLeftIcon: {
    position: 'absolute',
    bottom: 150,
    left: 40,
    zIndex: 1,
  },
  bottomRightIcon: {
    position: 'absolute',
    bottom: 80,
    right: 40,
    zIndex: 1,
  },
  iconText: {
    fontSize: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 80,
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 5,
  },
  title: {
    fontSize: 48,
    fontStyle: 'italic',
    color: '#333',
    fontWeight: '300',
    marginBottom: 10,
  },
  username: {
    fontSize: 20,
    color: '#333',
    fontWeight: '500',
  },
  beginButton: {
    backgroundColor: '#6B7280',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  beginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
