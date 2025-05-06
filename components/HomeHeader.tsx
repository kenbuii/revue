import React from 'react';
import { StyleSheet, View, Image } from 'react-native';

export default function HomeHeader() {
  return (
    <View style={styles.header}>
      <Image 
        source={require('@/assets/images/logo.png')} 
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  logo: {
    resizeMode: 'contain',
    height: 24,
  },
});
