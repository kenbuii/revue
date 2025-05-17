import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type MediaType = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export default function Step1() {
  const router = useRouter();
  const mediaTypes: MediaType[] = [
    { id: 'book', icon: 'book-outline', label: 'book' },
    { id: 'movie', icon: 'film-outline', label: 'movie' },
    { id: 'tv', icon: 'tv-outline', label: 'TV show' },
  ];

  const handleMediaSelect = (type: string) => {
    router.push({
      pathname: '/(post_flow)/step2',
      params: { type }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>write a new revue</Text>
        <Text style={styles.stepTitle}>STEP 1</Text>
        <Text style={styles.subtitle}>type of media to revue</Text>

        <View style={styles.mediaGrid}>
          {mediaTypes.map((type) => (
            <TouchableOpacity 
              key={type.id}
              style={styles.mediaItem}
              onPress={() => handleMediaSelect(type.id)}
            >
              <Ionicons name={type.icon} size={48} color="#2F4F4F" />
              <Text style={styles.mediaLabel}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2F4F4F',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#2F4F4F',
    textAlign: 'center',
    marginBottom: 60,
  },
  mediaGrid: {
    alignItems: 'center',
    gap: 40,
  },
  mediaItem: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
  },
  mediaLabel: {
    marginTop: 10,
    fontSize: 16,
    color: '#2F4F4F',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
  },
  backText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
}); 