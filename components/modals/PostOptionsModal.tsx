import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PostOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  onHidePost?: (postId: string) => void;
  onReportPost?: (postId: string, reason: string) => void;
}

export default function PostOptionsModal({ 
  visible, 
  onClose, 
  postId, 
  onHidePost, 
  onReportPost 
}: PostOptionsModalProps) {
  const [showReportOptions, setShowReportOptions] = useState(false);

  const handleHidePost = () => {
    Alert.alert(
      'Hide Post',
      'Are you sure you want to hide this post? You won\'t see it in your feed anymore.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: () => {
            onHidePost?.(postId);
            onClose();
          },
        },
      ]
    );
  };

  const handleReportPost = (reason: string) => {
    Alert.alert(
      'Report Post',
      `Are you sure you want to report this post for ${reason.toLowerCase()}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            onReportPost?.(postId, reason);
            onClose();
            Alert.alert('Thank you', 'Your report has been submitted and will be reviewed.');
          },
        },
      ]
    );
  };

  const reportReasons = [
    { id: 'spam', label: 'Spam', icon: 'warning-outline' },
    { id: 'harassment', label: 'Harassment', icon: 'person-remove-outline' },
    { id: 'inappropriate', label: 'Inappropriate Content', icon: 'eye-off-outline' },
    { id: 'misinformation', label: 'Misinformation', icon: 'information-circle-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {!showReportOptions ? (
            // Main options
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Post Options</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.option} onPress={handleHidePost}>
                  <Ionicons name="eye-off-outline" size={24} color="#666" />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Hide Post</Text>
                    <Text style={styles.optionDescription}>
                      You won't see this post in your feed anymore
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.option} 
                  onPress={() => setShowReportOptions(true)}
                >
                  <Ionicons name="flag-outline" size={24} color="#FF6B6B" />
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, styles.reportText]}>Report Post</Text>
                    <Text style={styles.optionDescription}>
                      Report this post for violating community guidelines
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Report options
            <>
              <View style={styles.header}>
                <TouchableOpacity 
                  onPress={() => setShowReportOptions(false)} 
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Report Post</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                <Text style={styles.reportSubtitle}>
                  Why are you reporting this post?
                </Text>
                
                {reportReasons.map(reason => (
                  <TouchableOpacity 
                    key={reason.id}
                    style={styles.reportOption} 
                    onPress={() => handleReportPost(reason.label)}
                  >
                    <Ionicons name={reason.icon as any} size={24} color="#666" />
                    <Text style={styles.reportOptionText}>{reason.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFDF6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },
  optionsContainer: {
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionContent: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  reportText: {
    color: '#FF6B6B',
  },
  reportSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    color: '#333',
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reportOptionText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
  },
}); 