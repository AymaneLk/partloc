import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, SafeAreaView, ActivityIndicator, RefreshControl, Platform, TouchableOpacity, Alert } from 'react-native';
import { getFriends, deleteFriendship } from '../supabaseClient';
import { colors } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const FriendsList = ({ session }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  const loadFriends = useCallback(async () => {
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
  }, [session]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleDeleteFriend = useCallback(async (friendId, friendName) => {
    Alert.alert(
      "Delete Friend",
      `Are you sure you want to remove ${friendName} from your friends list?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFriendship(session, friendId);
              Alert.alert("Success", "Friend removed successfully");
              loadFriends();
            } catch (error) {
              console.error('Error deleting friend:', error);
              Alert.alert("Error", "Failed to remove friend. Please try again.");
            }
          }
        }
      ]
    );
  }, [session, loadFriends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  }, [loadFriends]);

  const renderFriend = ({ item }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <Image
          source={item.avatar_url ? { uri: item.avatar_url } : require('../assets/user.png')}
          style={styles.avatar}
        />
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.full_name}</Text>
          <Text style={styles.friendEmail}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteFriend(item.user_id, item.full_name)}
      >
        <Icon name="delete-outline" size={24} color={colors.error} />
      </TouchableOpacity>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Friends</Text>
            <View style={styles.headerUnderline} />
          </View>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AddFriend')}>
            <Icon name="person-add" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        {friends.length > 0 ? (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.user_id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Icon name="people-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyStateText}>You have no friends yet.</Text>
            <TouchableOpacity 
              style={styles.addFriendButton}
              onPress={() => navigation.navigate('AddFriend')}
            >
              <Text style={styles.addFriendButtonText}>Add a Friend</Text>
            </TouchableOpacity>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Bold',
  },
  headerUnderline: {
    width: 30,
    height: 3,
    backgroundColor: colors.error,
    marginTop: 4,
    borderRadius: 1.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  friendEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'ClashGrotesk-Medium',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: 'ClashGrotesk-Medium',
  },
  addFriendButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addFriendButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'ClashGrotesk-Bold',
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
    paddingHorizontal: 32,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'ClashGrotesk-Medium',
  },
});

export default FriendsList;