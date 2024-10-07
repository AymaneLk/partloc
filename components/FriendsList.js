import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { getFriends } from '../supabaseClient';
import { colors } from '../theme';

const FriendsList = ({ session }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const friendsData = await getFriends(session);
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFriend = ({ item }) => (
    <View style={styles.friendItem}>
      <Image
        source={item.avatar_url ? { uri: item.avatar_url } : require('../assets/user.png')}
        style={styles.avatar}
      />
      <Text style={styles.friendName}>{item.full_name}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Friends</Text>
        {friends.length > 0 ? (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <Text style={styles.noFriendsText}>You have no friends yet.</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100, // This will push the content 100px from the top
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text.primary,
  },
  listContent: {
    paddingBottom: 20, // Add some padding at the bottom of the list
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  friendName: {
    fontSize: 18,
    color: colors.text.primary,
  },
  noFriendsText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default FriendsList;