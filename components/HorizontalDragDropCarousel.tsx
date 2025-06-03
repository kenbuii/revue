import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, FlatList } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';

interface HorizontalDragDropCarouselProps<T> {
  items: T[];
  onRemove: (itemId: string, title: string) => Promise<{ success: boolean; error?: string }>;
  onReorder: (orderedItems: T[]) => Promise<{ success: boolean; error?: string }>;
  renderItem: (item: T, isActive: boolean, onPress?: () => void) => React.ReactNode;
  getItemId: (item: T) => string;
  getItemTitle: (item: T) => string;
  emptyStateMessage?: string;
  emptyStateSubtext?: string;
  loading?: boolean;
  showInstructions?: boolean;
  removeConfirmTitle?: string;
  removeConfirmMessage?: string;
  removeSuccessMessage?: string;
}

export default function HorizontalDragDropCarousel<T>({
  items,
  onRemove,
  onReorder,
  renderItem,
  getItemId,
  getItemTitle,
  emptyStateMessage = "No items found",
  emptyStateSubtext = "Add some items to see them here",
  loading = false,
  showInstructions = true,
  removeConfirmTitle = "Remove Item",
  removeConfirmMessage = "Remove \"{title}\" from your list?",
  removeSuccessMessage = "\"{title}\" has been removed successfully.",
}: HorizontalDragDropCarouselProps<T>) {
  const [data, setData] = useState(items);
  const [isReordering, setIsReordering] = useState(false);

  // Update local data when props change
  useEffect(() => {
    setData(items);
  }, [items]);

  const handleRemove = async (item: T) => {
    const itemId = getItemId(item);
    const title = getItemTitle(item);
    
    Alert.alert(
      removeConfirmTitle,
      removeConfirmMessage.replace('{title}', title),
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Removing item:', itemId);
            const result = await onRemove(itemId, title);
            
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to remove item');
            }
            // Success is indicated by the item disappearing from the list
            // No need for additional success dialog
          },
        },
      ]
    );
  };

  const handleDragEnd = async ({ data: newData }: { data: T[] }) => {
    setData(newData);
    setIsReordering(true);
    
    console.log('🔄 Reordering items...');
    const result = await onReorder(newData);
    
    setIsReordering(false);
    
    if (!result.success) {
      // Revert to original order on error
      setData(items);
      Alert.alert('Error', result.error || 'Failed to reorder items');
    }
  };

  const renderCarouselItem = ({ item, drag, isActive }: RenderItemParams<T>) => {
    return (
      <ScaleDecorator>
        <View style={[styles.itemContainer, isActive && styles.activeItem]}>
          {/* Remove button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemove(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.removeButtonBackground}>
              <Ionicons name="close" size={14} color="white" />
            </View>
          </TouchableOpacity>
          
          {/* Drag handle */}
          <TouchableOpacity
            style={styles.dragHandle}
            onPressIn={drag}
            disabled={isActive}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.dragHandleBackground}>
              <Ionicons name="reorder-three-outline" size={14} color="rgba(255,255,255,0.9)" />
            </View>
          </TouchableOpacity>

          {/* Item content */}
          <View style={styles.itemContent}>
            {renderItem(item, isActive)}
          </View>

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
    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptySectionText}>{emptyStateMessage}</Text>
        <Text style={styles.emptySectionSubtext}>{emptyStateSubtext}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showInstructions && data.length > 0 && (
        <Text style={styles.instructionText}>
          Tap and hold ⋮⋮⋮ to reorder • Tap ✕ to remove
        </Text>
      )}
      
      <DraggableFlatList
        data={data}
        renderItem={renderCarouselItem}
        keyExtractor={(item) => getItemId(item)}
        onDragEnd={handleDragEnd}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!isReordering}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  instructionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  itemContainer: {
    position: 'relative',
    marginRight: 12,
  },
  activeItem: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  itemContent: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    padding: 4,
  },
  removeButtonBackground: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 2,
    padding: 4,
  },
  dragHandleBackground: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 3,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptySection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySectionSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
}); 