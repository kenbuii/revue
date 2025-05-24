import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
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
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      <View style={styles.content}>
        {/* Top left icon */}
        <View style={styles.topLeftIcon}>
          <Image source={require('../../assets/images/book.png')} style={styles.iconImage} />
        </View>
        
        {/* Top right icon */}
        <View style={styles.topRightIcon}>
          <Image source={require('../../assets/images/movies.png')} style={styles.iconImage} />
        </View>
        
        <View style={styles.centerContent}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>revue,</Text>
            <Text style={styles.username}>[USER]!</Text>
          </View>
          
          <TouchableOpacity style={styles.beginButton} onPress={handleBeginRevueing}>
            <Text style={styles.beginButtonText}>Begin revueing!</Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom left icon */}
        <View style={styles.bottomLeftIcon}>
          <Image source={require('../../assets/images/tv.png')} style={styles.iconImage} />
        </View>
        
        {/* Bottom right icon */}
        <View style={styles.bottomRightIcon}>
          <Image source={require('../../assets/images/book.png')} style={styles.iconImage} />
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
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
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
  iconImage: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
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
    color: '#142D0A',
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  title: {
    fontSize: 48,
    color: '#142D0A',
    fontWeight: '300',
    marginBottom: 10,
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  username: {
    fontSize: 20,
    color: '#142D0A',
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
  beginButton: {
    backgroundColor: '#142D0A',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 1.84,
    borderColor: '#142D0A',
  },
  beginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'LibreBaskerville_700Bold',
  },
});
