import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function Step3() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [postTitle, setPostTitle] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [pageNumber, setPageNumber] = useState("");
  const [isEditingPage, setIsEditingPage] = useState(false);

  const getLocationPlaceholder = () => {
    const type = params.type as string;
    switch (type) {
      case "book":
        return "enter page";
      case "movie":
        return "enter timestamp";
      case "tv":
        return "enter season/episode";
      default:
        return "enter location";
    }
  };

  const formatLocation = () => {
    if (!pageNumber) return "location";
    const type = params.type as string;
    switch (type) {
      case "book":
        return `page ${pageNumber}`;
      case "movie":
        return `at ${pageNumber}`;
      case "tv":
        return pageNumber;
      default:
        return pageNumber;
    }
  };

  const handlePost = () => {
    // Handle post creation here
    console.log("Creating post with:", {
      params,
      postTitle,
      thoughts,
      pageNumber,
    });
  };

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
        <Text style={styles.stepTitle}>STEP 3</Text>

        <View style={styles.mediaInfo}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Ionicons name="person-circle" size={40} color="#2F4F4F" />
            </View>
            <Text style={styles.username}>kristine</Text>
            <Text style={styles.revuingText}>is revuing</Text>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.mediaTitle}>{params.title}</Text>
            <Text style={styles.mediaCreator}>
              BY {params.creator?.toString().toUpperCase()}
            </Text>

            <View style={styles.mediaDetails}>
              <Text style={styles.mediaType}>{params.type}</Text>
              <Text style={styles.separator}>@</Text>
              {isEditingPage ? (
                <TextInput
                  style={styles.pageNumberInput}
                  placeholder={getLocationPlaceholder()}
                  value={pageNumber}
                  onChangeText={setPageNumber}
                  onBlur={() => setIsEditingPage(false)}
                  autoFocus
                  placeholderTextColor="#666"
                />
              ) : (
                <TouchableOpacity
                  style={styles.pageNumberButton}
                  onPress={() => setIsEditingPage(true)}
                >
                  <Text style={styles.pageNumberText}>{formatLocation()}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.mediaCover}>
            <Ionicons name="image-outline" size={48} color="#2F4F4F" />
          </View>
        </View>

        <View style={styles.postTitleContainer}>
          {isEditingTitle ? (
            <TextInput
              style={styles.postTitleInput}
              placeholder="Enter post title (optional)"
              value={postTitle}
              onChangeText={setPostTitle}
              onBlur={() => setIsEditingTitle(false)}
              autoFocus
              placeholderTextColor="#666"
            />
          ) : (
            <TouchableOpacity
              style={styles.postTitleButton}
              onPress={() => setIsEditingTitle(true)}
            >
              <Text
                style={[
                  styles.postTitleText,
                  postTitle ? styles.filledPostTitle : null,
                ]}
              >
                {postTitle || "Optional Post Title"}
              </Text>
              <Ionicons name="pencil" size={20} color="#2F4F4F" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>thoughts:</Text>
        <TextInput
          style={styles.thoughtsInput}
          placeholder="Type something"
          value={thoughts}
          onChangeText={setThoughts}
          multiline
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>optional picture:</Text>
        <View style={styles.libraryButton}>
          <Text style={styles.libraryTitle}>Library</Text>
          <View style={styles.imageGrid}>
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <View key={index} style={styles.gridImage}>
                <Ionicons name="image-outline" size={32} color="#2F4F4F" />
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.postButton} onPress={handlePost}>
          <Text style={styles.postButtonText}>Post</Text>
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
  mediaInfo: {
    flexDirection: "row",
    marginBottom: 30,
    alignItems: "flex-start",
  },
  profileSection: {
    alignItems: "center",
    marginRight: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    marginBottom: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    fontSize: 14,
    fontWeight: "500",
  },
  revuingText: {
    fontSize: 12,
    color: "#666",
  },
  titleSection: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  mediaCreator: {
    fontSize: 14,
    color: "#2F4F4F",
    marginBottom: 10,
  },
  mediaDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  mediaType: {
    fontSize: 14,
    color: "#666",
  },
  separator: {
    marginHorizontal: 8,
    color: "#666",
  },
  pageNumberButton: {
    backgroundColor: "#F2EFE6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  pageNumberText: {
    fontSize: 12,
    color: "#666",
  },
  pageNumberInput: {
    backgroundColor: "#F2EFE6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 12,
    color: "#2F4F4F",
    minWidth: 100,
  },
  mediaCover: {
    width: 60,
    height: 80,
    backgroundColor: "#F2EFE6",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginLeft: 15,
  },
  postTitleContainer: {
    marginBottom: 20,
  },
  postTitleInput: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    color: "#2F4F4F",
  },
  postTitleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
  },
  postTitleText: {
    fontSize: 16,
    color: "#666",
  },
  filledPostTitle: {
    color: "#2F4F4F",
  },
  label: {
    fontSize: 18,
    color: "#2F4F4F",
    marginBottom: 10,
  },
  thoughtsInput: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    height: 150,
    textAlignVertical: "top",
  },
  libraryButton: {
    backgroundColor: "#F2EFE6",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  libraryTitle: {
    fontSize: 16,
    color: "#2F4F4F",
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  gridImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: "#E8E4D8",
    justifyContent: "center",
    alignItems: "center",
  },
  postButton: {
    backgroundColor: "#2F4F4F",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  postButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
