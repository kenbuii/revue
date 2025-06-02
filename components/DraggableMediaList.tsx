import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, FlatList } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MediaPreference } from '@/lib/userProfile';

interface DraggableMediaListProps {
  mediaPreferences: MediaPreference[];
  onRemove: (mediaId: string) => Promise<{ success: boolean; error?: string }>;
  onReorder: (orderedPreferences: MediaPreference[]) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export default function DraggableMediaList({ 
  mediaPreferences, 
  onRemove, 
  onReorder, 
  loading = false 
}: DraggableMediaListProps) {
  const [data, setData] = useState(mediaPreferences);
  const [isReordering, setIsReordering] = useState(false);

  // Debug logging
  if (__DEV__) {
    console.log('🎬 DraggableMediaList received props:', {
      mediaPreferencesLength: mediaPreferences.length,
      mediaPreferences: mediaPreferences,
      loading,
      dataLength: data.length
    });
  }

  // Update local data when props change
  React.useEffect(() => {
    console.log('🔄 DraggableMediaList updating data:', {
      oldLength: data.length,
      newLength: mediaPreferences.length,
      newData: mediaPreferences,
      oldData: data
    });
    setData(mediaPreferences);
    console.log('✅ DraggableMediaList data state updated');
  }, [mediaPreferences]);

  const handleRemove = async (mediaId: string, title: string) => {
    Alert.alert(
      'Remove from On Vue',
      `Remove "${title}" from your On Vue list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Removing media preference:', mediaId);
            const result = await onRemove(mediaId);
            
            if (result.success) {
              // Show success feedback
              Alert.alert('Removed', `"${title}" has been removed from your On Vue list.`);
            } else {
              Alert.alert('Error', result.error || 'Failed to remove media preference');
            }
          },
        },
      ]
    );
  };

  const handleDragEnd = async ({ data: newData }: { data: MediaPreference[] }) => {
    setData(newData);
    setIsReordering(true);
    
    console.log('🔄 Reordering media preferences...');
    const result = await onReorder(newData);
    
    setIsReordering(false);
    
    if (!result.success) {
      // Revert to original order on error
      setData(mediaPreferences);
      Alert.alert('Error', result.error || 'Failed to reorder media preferences');
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<MediaPreference>) => {
    console.log('🎨 DraggableMediaList renderItem called for:', {
      media_id: item.media_id,
      title: item.title,
      image_url: item.image_url,
      isActive
    });

    return (
      <ScaleDecorator>
        <View style={[styles.mediaCard, isActive && styles.activeCard]}>
          {/* Remove button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemove(item.media_id, item.title)}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
          
          {/* Drag handle */}
          <TouchableOpacity
            style={styles.dragHandle}
            onPressIn={drag}
            disabled={isActive}
          >
            <Ionicons name="reorder-three-outline" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* Media content */}
          <TouchableOpacity 
            style={styles.mediaContent}
            onPress={() => router.push({
              pathname: '/media/[id]',
              params: {
                id: item.media_id,
                title: item.title,
                type: item.media_type,
                year: item.year || '',
                image: item.image_url || '',
                description: item.description || '',
              }
            })}
            disabled={isActive}
          >
            <Image 
              source={{ uri: item.image_url || 'https://via.placeholder.com/130x180' }} 
              style={styles.mediaCover} 
            />
            <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
          </TouchableOpacity>

          {/* Loading overlay */}
          {isReordering && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Saving...</Text>
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  if (data.length === 0) {
    console.log('🔴 DraggableMediaList showing empty state - data length is 0');
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptySectionText}>No media preferences found</Text>
        <Text style={styles.emptySectionSubtext}>
          Add some favorites during onboarding or in your settings
        </Text>
      </View>
    );
  }

  console.log('🟢 DraggableMediaList should render list - data length:', data.length);
  console.log('🟢 DraggableMediaList data items:', data.map(item => ({ id: item.media_id, title: item.title })));

  return (
    <View style={styles.container}>
      {data.length > 0 && (
        <Text style={styles.instructionText}>
          Tap and hold ⋮⋮⋮ to reorder • Tap ✕ to remove
        </Text>
      )}
      
      {/* DEBUG: Test with regular FlatList */}
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <View style={styles.mediaCard}>
            <Image 
              source={{ uri: item.image_url || 'https://via.placeholder.com/130x180' }} 
              style={styles.mediaCover} 
            />
            <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
          </View>
        )}
        keyExtractor={(item) => `test_${item.media_id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      
      <DraggableFlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.media_id}
        onDragEnd={handleDragEnd}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200, // Fixed height for horizontal scrolling
  },
  listContent: {
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  mediaCard: {
    width: 130,
    marginRight: 12,
    position: 'relative',
  },
  activeCard: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  dragHandle: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  mediaContent: {
    flex: 1,
  },
  mediaCover: {
    width: 130,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  mediaTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptySection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  emptySectionSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
}); 