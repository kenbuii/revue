import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step5GenreSelectScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const popularItems = [
    { id: '1', title: 'Harry Potter', type: 'book', color: '#8B4513' },
    { id: '2', title: 'Never Let Me Go', type: 'book', color: '#E6E6FA' },
    { id: '3', title: 'Pride & Prejudice', type: 'movie', color: '#DEB887' },
  ];

  const handleItemSelect = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else if (selectedItems.length < 10) {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleNext = () => {
    router.push('/onboarding_flow/step6_final');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.pickText}>pick your</Text>
            <Text style={styles.favoriteText}>favorite vues</Text>
            <Text style={styles.subtitle}>Add up to 10!</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              value={searchText}
              onChangeText={setSearchText}
            />
            <Text style={styles.searchIcon}>🔍</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular</Text>
            <View style={styles.grid}>
              {popularItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridItem,
                    { backgroundColor: item.color },
                    selectedItems.includes(item.id) && styles.selectedItem
                  ]}
                  onPress={() => handleItemSelect(item.id)}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <Text style={styles.bottomText}>
            This will be displayed on your profile page,{'\n'}
            but you can always change them later!
          </Text>
        </ScrollView>
        
        {selectedItems.length > 0 && (
          <View style={styles.nextButtonContainer}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
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
    color: '#333',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pickText: {
    fontSize: 24,
    color: '#333',
    marginBottom: 5,
  },
  favoriteText: {
    fontSize: 36,
    fontStyle: 'italic',
    color: '#333',
    fontWeight: '300',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  searchInput: {
    backgroundColor: '#E8E5D3',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingRight: 50,
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    right: 20,
    top: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '30%',
    aspectRatio: 0.7,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'flex-end',
  },
  selectedItem: {
    borderWidth: 3,
    borderColor: '#6B7280',
  },
  itemContent: {
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  nextButtonContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
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
});
