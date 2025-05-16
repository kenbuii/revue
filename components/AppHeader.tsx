import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

interface AppHeaderProps {
  showBackButton?: boolean;
  showLogo?: boolean;
  title?: string;
  showSearchBar?: boolean;
}

export default function AppHeader({ showBackButton = false, showLogo = true, title, showSearchBar = false }: AppHeaderProps) {
  const router = useRouter();

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBackButton && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#4CAF50" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.headerCenter}>
          {showLogo ? (
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          ) : title ? (
            <Text style={styles.title}>{title}</Text>
          ) : null}
        </View>
        
        <View style={styles.headerRight} />
      </View>
      {showSearchBar && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#666"
            />
            <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    backgroundColor: '#FFFDF6',
  },
  headerLeft: {
    width: 70,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 70,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    marginLeft: 2,
    color: '#4CAF50',
  },
  logo: {
    height: 30,
    width: 80,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFDF6',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3E4',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  searchIcon: {
    marginLeft: 10,
  },
}); 