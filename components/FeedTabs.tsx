import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FeedTabs() {
  const [activeTab, setActiveTab] = useState('forYou');

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'forYou' && styles.activeTab]} 
        onPress={() => setActiveTab('forYou')}
      >
        <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>for you</Text>
        {activeTab === 'forYou' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
        onPress={() => setActiveTab('friends')}
      >
        <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>friends + following</Text>
        {activeTab === 'friends' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    color: '#888',
    fontSize: 16,
  },
  activeTabText: {
    color: '#000',
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '80%',
    backgroundColor: '#004D00',
    borderRadius: 2,
  },
});
