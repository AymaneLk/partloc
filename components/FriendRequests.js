import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { getPendingFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../supabaseClient';
import { colors } from '../theme';

const FriendRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const requestsData = await getPendingFriendRequests();
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await acceptFriendRequest(friendshipId);
      loadRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      await rejectFriendRequest(friendshipId);
      loadRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const renderRequest = ({ item }) => {
    if (!item || !item.profiles) {
      return null; // Skip rendering if item or profiles is undefined
    }

    return (
      <View style={styles.requestItem}>
        <Image
          source={item.profiles.avatar_url ? { uri: item.profiles.avatar_url } : require('../assets/user.png')}
          style={styles.avatar}
        />
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.profiles.full_name || 'Unknown User'}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id)}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item.id)}>
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friend Requests</Text>
      {requests.length > 0 ? (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id.toString()}
        />
      ) : (
        <Text style={styles.noRequestsText}>You have no pending friend requests.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text.primary,
  },
  requestItem: {
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
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: colors.accent,
    padding: 5,
    borderRadius: 5,
    marginRight: 10,
  },
  rejectButton: {
    backgroundColor: colors.error,
    padding: 5,
    borderRadius: 5,
  },
  buttonText: {
    color: colors.text.primary,
  },
  noRequestsText: {
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default FriendRequests;