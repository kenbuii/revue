import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardDismissWrapper from '@/components/KeyboardDismissWrapper';
import { mediaSearchService, MediaItem } from '@/lib/mediaService';

type MediaFields = {
  [key: string]: {
    creatorLabel: string;
    uploadLabel: string;
    genreOptions: string[];
  };
};

const mediaFields: MediaFields = {
  book: {
    creatorLabel: "author:",
    uploadLabel: "Upload book cover",
    genreOptions: [
      "fantasy",
      "romance",
      "mystery",
      "sci-fi",
      "non-fiction",
      "biography",
      "thriller",
      "literary fiction",
      "other",
    ],
  },
  movie: {
    creatorLabel: "director:",
    uploadLabel: "Upload movie poster",
    genreOptions: [
      "action",
      "comedy",
      "drama",
      "horror",
      "sci-fi",
      "thriller",
      "romance",
      "documentary",
      "animation",
      "other",
    ],
  },
  tv: {
    creatorLabel: "creator:",
    uploadLabel: "Upload show poster",
    genreOptions: [
      "drama",
      "comedy",
      "thriller",
      "sci-fi",
      "reality",
      "documentary",
      "anime",
      "crime",
      "fantasy",
      "other",
    ],
  },
};

// Generate years from 1900 to current year
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1899 }, (_, i) => String(currentYear - i));

type DropdownProps = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
};

function Dropdown({ label, value, options, onSelect }: DropdownProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.pickerButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.pickerText}>{value}</Text>
        <Ionicons name="chevron-down" size={20} color="#2F4F4F" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsVisible(false)}
              >
                <Ionicons name="close" size={24} color="#2F4F4F" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item === value && styles.selectedOption,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    setIsVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.optionText,
                      item === value && styles.selectedOptionText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function Step2() {
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [genre, setGenre] = useState(
    mediaFields[type as keyof MediaFields]?.genreOptions[0] || ""
  );

  // Search functionality state
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [popularItems, setPopularItems] = useState<MediaItem[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);

  const fields = mediaFields[type as keyof MediaFields];

  // Load popular items for the selected media type
  useEffect(() => {
    loadPopularItems();
  }, [type]);

  // Search function with debouncing
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await mediaSearchService.searchMedia(searchText);
        // Filter results by selected media type
        const filteredResults = results.filter(item => item.type === type);
        setSearchResults(filteredResults);
        setHasSearched(true);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('Search Error', 'Failed to search media. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchText, type]);

  const loadPopularItems = async () => {
    try {
      setIsLoadingPopular(true);
      const allPopular = await mediaSearchService.getPopularItems();
      // Filter by selected media type
      const filteredPopular = allPopular.filter(item => item.type === type);
      setPopularItems(filteredPopular);
    } catch (error) {
      console.error('Error loading popular items:', error);
    } finally {
      setIsLoadingPopular(false);
    }
  };

  const handleMediaSelect = (media: MediaItem) => {
    // Autofill form with selected media data
    setTitle(media.title);
    setCreator(media.author || media.director || 'Unknown');
    setYear(media.year || String(currentYear));
    
    // Try to match genre from the media data to available options
    const availableGenres = fields.genreOptions;
    // This is a simple approach - you could enhance this with better genre mapping
    setGenre(availableGenres[0]); // Default to first genre for now
    
    // Clear search and show manual entry for final review/editing
    setSearchText("");
    setShowManualEntry(true);
    setHasSearched(false);
  };

  const getMediaTypeEmoji = (mediaType: string) => {
    switch (mediaType) {
      case 'movie': return '🎬';
      case 'tv': return '📺';
      case 'book': return '📚';
      default: return '🎭';
    }
  };

  const renderSearchResultItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => handleMediaSelect(item)}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.resultImage} />
      ) : (
        <View style={styles.resultImagePlaceholder}>
          <Text style={styles.resultEmoji}>{getMediaTypeEmoji(item.type)}</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.resultMeta}>
          {item.author || item.director || 'Unknown'} {item.year && `• ${item.year}`}
        </Text>
        {item.description && (
          <Text style={styles.resultDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <TouchableOpacity 
        style={styles.selectButton}
        onPress={() => handleMediaSelect(item)}
      >
        <Text style={styles.selectButtonText}>Select</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPopularItem = (item: MediaItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.popularItem}
      onPress={() => handleMediaSelect(item)}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.popularImage} />
      ) : (
        <View style={styles.popularImagePlaceholder}>
          <Text style={styles.popularEmoji}>{getMediaTypeEmoji(item.type)}</Text>
        </View>
      )}
      <Text style={styles.popularTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.popularMeta}>
        {item.year && `${item.year}`}
      </Text>
    </TouchableOpacity>
  );

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Missing Information', `Please enter the ${type} title.`);
      return false;
    }
    if (!creator.trim()) {
      Alert.alert('Missing Information', `Please enter the ${fields.creatorLabel.replace(':', '')}.`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateForm()) {
      return;
    }

    router.push({
      pathname: "/(post_flow)/step3",
      params: { 
        type, 
        title: title.trim(), 
        creator: creator.trim(), 
        year, 
        genre 
      },
    });
  };

  const handleImageUpload = () => {
    // TODO: Implement image picker functionality
    Alert.alert(
      'Image Upload',
      'Image upload functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardDismissWrapper>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>write a new revue</Text>
          <Text style={styles.stepTitle}>STEP 2</Text>
          <Text style={styles.stepSubtitle}>
            Find or tell us about the {type} you're revuing
          </Text>

          {/* Search Section - Only show if not in manual entry mode */}
          {!showManualEntry && (
            <>
              {/* Search Input */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search for ${type}s...`}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor="#666"
                />
                {isSearching ? (
                  <ActivityIndicator size="small" color="#2F4F4F" style={styles.searchIcon} />
                ) : (
                  <Ionicons name="search" size={20} color="#2F4F4F" style={styles.searchIcon} />
                )}
              </View>

              {/* Popular Items - Show when not searching */}
              {!hasSearched && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Popular {type}s</Text>
                  {isLoadingPopular ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#2F4F4F" />
                      <Text style={styles.loadingText}>Loading popular {type}s...</Text>
                    </View>
                  ) : (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.popularScroll}
                    >
                      {popularItems.map(item => renderPopularItem(item))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Search Results */}
              {hasSearched && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                  </Text>
                  {searchResults.length > 0 ? (
                    <FlatList
                      data={searchResults}
                      renderItem={renderSearchResultItem}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  ) : !isSearching ? (
                    <Text style={styles.noResultsText}>
                      No {type}s found for "{searchText}"
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Manual Entry Option */}
              <TouchableOpacity 
                style={styles.manualEntryButton}
                onPress={() => setShowManualEntry(true)}
              >
                <Ionicons name="create-outline" size={20} color="#2F4F4F" />
                <Text style={styles.manualEntryText}>Enter details manually</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Manual Entry Form - Show when in manual entry mode or autofilled */}
          {showManualEntry && (
            <>
              <View style={styles.manualEntryHeader}>
                <Text style={styles.manualEntryTitle}>Enter {type} details</Text>
                <TouchableOpacity 
                  style={styles.backToSearchButton}
                  onPress={() => {
                    setShowManualEntry(false);
                    // Clear form if going back to search
                    setTitle("");
                    setCreator("");
                    setYear(String(currentYear));
                    setGenre(fields.genreOptions[0]);
                  }}
                >
                  <Text style={styles.backToSearchText}>Back to search</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>title of {type}: *</Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter ${type} title`}
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#666"
                autoCapitalize="words"
              />

              <Text style={styles.label}>{fields.creatorLabel} *</Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter ${fields.creatorLabel.replace(':', '')}`}
                value={creator}
                onChangeText={setCreator}
                placeholderTextColor="#666"
                autoCapitalize="words"
              />

              <Text style={styles.label}>optional:</Text>
              <TouchableOpacity style={styles.placeholderImage} onPress={handleImageUpload}>
                <Ionicons name="image-outline" size={32} color="#2F4F4F" />
                <Text style={styles.placeholderText}>{fields.uploadLabel}</Text>
                <Text style={styles.placeholderSubtext}>Tap to select from library</Text>
              </TouchableOpacity>

              <Dropdown
                label="year created:"
                value={year}
                options={years}
                onSelect={setYear}
              />

              <Dropdown
                label="genre:"
                value={genre}
                options={fields.genreOptions}
                onSelect={setGenre}
              />

              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardDismissWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    marginLeft: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  headerTitle: {
    fontSize: 24,
    fontStyle: "italic",
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    textAlign: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'LibreBaskerville_700Bold',
    color: "#2F4F4F",
    textAlign: "center",
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  // Search styles
  searchContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  searchInput: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    paddingRight: 50,
    borderWidth: 1,
    borderColor: "#E8E4D8",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  searchIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    color: "#2F4F4F",
    marginBottom: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#2F4F4F",
    marginLeft: 10,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  popularScroll: {
    paddingVertical: 10,
  },
  popularItem: {
    width: 100,
    marginRight: 15,
    alignItems: 'center',
  },
  popularImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  popularImagePlaceholder: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E8E4D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  popularEmoji: {
    fontSize: 24,
  },
  popularTitle: {
    fontSize: 12,
    fontFamily: 'LibreBaskerville_700Bold',
    color: "#2F4F4F",
    textAlign: 'center',
    marginBottom: 4,
  },
  popularMeta: {
    fontSize: 10,
    color: "#666",
    textAlign: 'center',
    fontFamily: 'LibreBaskerville_400Regular',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: "#E8E4D8",
    borderRadius: 8,
  },
  resultImage: {
    width: 50,
    height: 75,
    borderRadius: 5,
  },
  resultImagePlaceholder: {
    width: 50,
    height: 75,
    borderRadius: 5,
    backgroundColor: '#E8E4D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 16,
  },
  resultInfo: {
    flex: 1,
    marginHorizontal: 15,
  },
  resultTitle: {
    fontSize: 14,
    fontFamily: 'LibreBaskerville_700Bold',
    color: "#2F4F4F",
    marginBottom: 5,
  },
  resultMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  resultDescription: {
    fontSize: 11,
    color: "#666",
    lineHeight: 16,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  selectButton: {
    backgroundColor: "#2F4F4F",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  noResultsText: {
    fontSize: 14,
    color: "#666",
    textAlign: 'center',
    padding: 20,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: "#2F4F4F",
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  manualEntryText: {
    fontSize: 16,
    color: "#2F4F4F",
    marginLeft: 8,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  manualEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  manualEntryTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    color: "#2F4F4F",
  },
  backToSearchButton: {
    padding: 8,
  },
  backToSearchText: {
    fontSize: 14,
    color: "#666",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  // Existing manual entry styles
  label: {
    fontSize: 18,
    color: "#2F4F4F",
    marginBottom: 10,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  input: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E4D8",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  placeholderImage: {
    backgroundColor: "#F2EFE6",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E4D8",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 16,
    color: "#2F4F4F",
    marginTop: 10,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  placeholderSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontFamily: 'LibreBaskerville_400Regular',
  },
  pickerButton: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E4D8",
  },
  pickerText: {
    fontSize: 16,
    color: "#2F4F4F",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  nextButton: {
    backgroundColor: "#2F4F4F",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: 'LibreBaskerville_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FAF9F6",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'LibreBaskerville_700Bold',
    color: "#2F4F4F",
  },
  closeButton: {
    padding: 5,
  },
  optionItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  selectedOption: {
    backgroundColor: "#F2EFE6",
  },
  optionText: {
    fontSize: 16,
    color: "#2F4F4F",
    fontFamily: 'LibreBaskerville_400Regular',
  },
  selectedOptionText: {
    fontFamily: 'LibreBaskerville_700Bold',
  },
});
