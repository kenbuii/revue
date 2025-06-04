import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

interface AppHeaderProps {
  showBackButton?: boolean;
  showLogo?: boolean;
  title?: string;
  showSearchBar?: boolean;
  rightComponent?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onSearchSubmit?: (text: string) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  searchPlaceholder?: string;
}

export default function AppHeader({ 
  showBackButton = false, 
  showLogo = true, 
  title, 
  showSearchBar = false,
  rightComponent,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onSearchBlur,
  searchPlaceholder = 'Search movies, TV shows, books...'
}: AppHeaderProps) {
  const router = useRouter();

  const handleSearchSubmit = () => {
    if (onSearchSubmit && searchValue.trim()) {
      onSearchSubmit(searchValue.trim());
    }
  };

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
        
        <View style={styles.headerRight}>
          {rightComponent}
        </View>
      </View>
      {showSearchBar && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#666"
              value={searchValue}
              onChangeText={onSearchChange}
              onSubmitEditing={handleSearchSubmit}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchButton}>
              <Feather name="search" size={20} color="#666" />
            </TouchableOpacity>
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
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    backgroundColor: '#FFFDF6',
  },
  headerLeft: {
    width: 70,
    height: '100%',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  headerRight: {
    width: 70,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    marginLeft: 2,
    color: '#4CAF50',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  logo: {
    height: 30,
    width: 80,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'LibreBaskerville_700Bold',
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
  searchButton: {
    padding: 4,
    marginLeft: 8,
  },
  logoText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular_Italic',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'LibreBaskerville_700Bold',
    marginBottom: 2,
  },
  actionText: {
    fontSize: 16,
    color: '#142D0A',
    fontFamily: 'LibreBaskerville_400Regular',
  },
}); 