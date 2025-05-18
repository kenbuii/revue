import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

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
      "documentary",
      "other",
    ],
  },
  tv: {
    creatorLabel: "creator:",
    uploadLabel: "Upload show poster",
    genreOptions: [
      "drama",
      "comedy",
      "reality",
      "documentary",
      "anime",
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

  const handleNext = () => {
    router.push({
      pathname: "/(post_flow)/step3",
      params: { type, title, creator, year, genre },
    });
  };

  const fields = mediaFields[type as keyof MediaFields];

  return (
    <View style={styles.container}>
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

        <Text style={styles.label}>title of {type}:</Text>
        <TextInput
          style={styles.input}
          placeholder="Type something"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>{fields.creatorLabel}</Text>
        <TextInput
          style={styles.input}
          placeholder="Type something"
          value={creator}
          onChangeText={setCreator}
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>optional:</Text>
        <View style={styles.placeholderImage}>
          <Ionicons name="image-outline" size={32} color="#2F4F4F" />
          <Text style={styles.placeholderText}>{fields.uploadLabel}</Text>
        </View>

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
      </ScrollView>
    </View>
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
    paddingTop: 60,
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
  },
  headerTitle: {
    fontSize: 24,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2F4F4F",
    textAlign: "center",
    marginBottom: 40,
  },
  label: {
    fontSize: 18,
    color: "#2F4F4F",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  placeholderImage: {
    backgroundColor: "#F2EFE6",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#2F4F4F",
    marginTop: 10,
  },
  pickerButton: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  pickerText: {
    fontSize: 16,
    color: "#2F4F4F",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
  },
  selectedOptionText: {
    fontWeight: "600",
  },
});
