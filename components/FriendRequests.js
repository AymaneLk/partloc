import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, Platform, Alert } from 'react-native';
import { getPendingFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../supabaseClient';
import { colors } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const FriendRequests = ({ session }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

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
      Alert.alert('Error', 'Failed to load friend requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await acceptFriendRequest(friendshipId);
      await loadRequests();
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      await rejectFriendRequest(friendshipId);
      await loadRequests();
      Alert.alert('Success', 'Friend request rejected.');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject friend request. Please try again.');
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
          <Text style={styles.requestEmail}>{item.profiles.email || 'No email provided'}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id)}>
            <Icon name="check" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item.id)}>
            <Icon name="close" size={24} color={colors.white} />
          </TouchableOpacity>
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Friend Requests</Text>
            <View style={styles.headerUnderline} />
          </View>
          <View style={styles.placeholderButton} />
        </View>
        {requests.length > 0 ? (
          <FlatList
            data={requests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Icon name="people-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyStateText}>You have no pending friend requests.</Text>
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
    backgroundColor: colors.background,
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
  placeholderButton: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  requestEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'ClashGrotesk-Medium',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: colors.accent,
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: colors.error,
    padding: 8,
    borderRadius: 20,
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
    fontFamily: 'ClashGrotesk-Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default FriendRequests;