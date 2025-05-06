import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock data
const profileData = {
  name: 'FIRST LASTNAME',
  username: '@username',
  bio: 'user post/content lorem ipsum Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy',
  reviewCount: 20,
  followers: 10,
  following: 10
};

// TODO: Replace with data from Supabase when implementing backend
// useEffect(() => {
//   const fetchProfileData = async () => {
//     // Get user profile data from Supabase
//     // const { data: userData, error: userError } = await supabase
//     //   .from('users')
//     //   .select('*')
//     //   .eq('id', userId)
//     //   .single();
//
//     // Get user stats from Supabase
//     // const { data: statsData, error: statsError } = await supabase
//     //   .rpc('get_user_stats', { user_id: userId });
//
//     // Get user's current reads
//     // const { data: onVueData, error: onVueError } = await supabase
//     //   .from('user_books')
//     //   .select('*, book:books(*)')
//     //   .eq('user_id', userId)
//     //   .eq('status', 'reading');
//
//     // Get user's favorite books
//     // const { data: favoritesData, error: favoritesError } = await supabase
//     //   .from('user_books')
//     //   .select('*, book:books(*), review:reviews(*)')
//     //   .eq('user_id', userId)
//     //   .eq('is_favorite', true);
//
//     // Get user's recent reviews
//     // const { data: reviewsData, error: reviewsError } = await supabase
//     //   .from('reviews')
//     //   .select('*, book:books(*)')
//     //   .eq('user_id', userId)
//     //   .order('created_at', { ascending: false })
//     //   .limit(5);
//   };
//   fetchProfileData();
// }, []);

const onVueItems = [
  { id: '1', title: 'Harry Potter', cover: 'https://m.media-amazon.com/images/I/51DF6ZR8G7L._AC_UF894,1000_QL80_.jpg', author: 'J.K. ROWLING' },
  { id: '2', title: 'Pride & Prejudice', cover: 'https://m.media-amazon.com/images/I/71Q1tPupKjL._AC_UF1000,1000_QL80_.jpg', author: 'PRIDE & PREJUDICE' },
  { id: '3', title: 'The Count of Monte Cristo', cover: 'https://m.media-amazon.com/images/I/51uLvJlKpNL.jpg', author: 'THE COUNT OF\nMONTECRISTO' },
];

const favoriteVues = [
  { id: '1', title: 'Fantastic Mr. Fox', cover: 'https://m.media-amazon.com/images/M/MV5BOGUwYTU4NGEtNDM4MS00NDRjLTkwNmQtOTkwMWMyMjhmMjdlXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_FMjpg_UX1000_.jpg', comment: 'wes anderson hater but this one is forever going to be one of my favori...' },
  { id: '2', title: 'The Count of Monte Cristo', cover: 'https://m.media-amazon.com/images/I/51uLvJlKpNL.jpg', comment: 'wes anderson hater but this one is forever going to be one of my favori...' },
  { id: '3', title: 'Never Let Me Go', cover: 'https://m.media-amazon.com/images/I/71kwkajubgL._AC_UF1000,1000_QL80_.jpg', comment: 'wes anderson hater but this one is forever going to be one of my favori...' },
];

const recentRevues = [
  { 
    id: '1', 
    title: 'NEVER LET ME GO, Chapter 4',
    time: '4 days ago',
    content: 'suzanne collins got tired of us forgetting what fascism is... i\'m so tired of lorem epsom the lazy fox jumps over the moon and eats pie. Lorem Ipsum has been the industry\'s standard dum...',
    cover: 'https://m.media-amazon.com/images/I/71kwkajubgL._AC_UF1000,1000_QL80_.jpg'
  },
  { 
    id: '2', 
    title: 'Sunrise on the Reaping, Chapter 6',
    time: '4 days ago',
    content: 'suzanne collins got tired of us forgetting what fascism is... i\'m so tired of lorem epsom the lazy fox jumps over the moon and eats pie. Lorem Ipsum has been the industry\'s standard dum...',
    cover: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Hunger_games.jpg'
  },
];

export default function ProfileScreen() {
  // TODO: Implement follow/unfollow functionality with Supabase
  // const handleFollow = async (userId) => {
  //   // Add follower relationship to Supabase
  //   // const { data, error } = await supabase
  //   //   .from('follows')
  //   //   .insert({ follower_id: currentUserId, following_id: userId });
  // };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header with Settings */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View />
          </View>
          <View style={styles.headerCenter}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity>
              <Feather name="settings" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileContainer}>
          <View style={styles.profileInfo}>
            <Image 
              style={styles.avatar} 
              source={{ uri: 'https://via.placeholder.com/100' }} 
            />
            <View style={styles.userInfo}>
              <Text style={styles.name}>{profileData.name} <Text style={styles.username}>{profileData.username}</Text></Text>
              <Text style={styles.bio}>{profileData.bio}</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profileData.reviewCount}</Text>
                  <Text style={styles.statLabel}>revues</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profileData.followers}</Text>
                  <Text style={styles.statLabel}>followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profileData.following}</Text>
                  <Text style={styles.statLabel}>following</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* On Vue Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ON VUE</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {onVueItems.map(item => (
              <TouchableOpacity key={item.id} style={styles.mediaCard}>
                <Image source={{ uri: item.cover }} style={styles.mediaCover} />
                <Text style={styles.mediaAuthor}>{item.author}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Favorite Vues Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>FAVORITE VUES</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {favoriteVues.map(item => (
              <TouchableOpacity key={item.id} style={styles.favoriteCard}>
                <Image source={{ uri: item.cover }} style={styles.favoriteCover} />
                <Text style={styles.favoriteComment}>{item.comment}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Revues */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>RECENT REVUES</Text>
          {recentRevues.map(revue => (
            <TouchableOpacity key={revue.id} style={styles.revueItem}>
              <Image source={{ uri: revue.cover }} style={styles.revueCover} />
              <View style={styles.revueContent}>
                <Text style={styles.revueTitle}>{revue.title}</Text>
                <Text style={styles.revueText}>{revue.content}</Text>
                <Text style={styles.revueTime}>{revue.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFDF6',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logo: {
    height: 30,
    width: 80,
  },
  profileContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    backgroundColor: '#E1E1E1',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    fontWeight: 'normal',
    color: '#666',
  },
  bio: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  statItem: {
    marginRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  horizontalScrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  mediaCard: {
    width: 130,
    marginRight: 10,
  },
  mediaCover: {
    width: 130,
    height: 180,
    borderRadius: 8,
    marginBottom: 5,
  },
  mediaAuthor: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  favoriteCard: {
    width: 130,
    marginRight: 10,
  },
  favoriteCover: {
    width: 130,
    height: 150,
    borderRadius: 8,
    marginBottom: 5,
  },
  favoriteComment: {
    fontSize: 11,
    color: '#666',
    lineHeight: 14,
  },
  revueItem: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  revueCover: {
    width: 45,
    height: 60,
    borderRadius: 4,
    marginRight: 15,
  },
  revueContent: {
    flex: 1,
  },
  revueTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  revueText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  revueTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  spacer: {
    height: 80,
  },
});
