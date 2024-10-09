import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { sendFriendRequest } from '../supabaseClient';
import { colors } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const AddFriend = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleAddFriend = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await sendFriendRequest(email.trim());
      Alert.alert('Success', 'Friend request sent!');
      setEmail('');
    } catch (error) {
      console.error('Detailed error:', error);
      if (error.message === 'User not found') {
        Alert.alert('Error', `No user found with email: ${email}`);
      } else if (error.message === 'You cannot send a friend request to yourself') {
        Alert.alert('Error', 'You cannot send a friend request to yourself');
      } else if (error.message === 'You cannot add yourself as a friend') {
        Alert.alert('Error', 'You cannot add yourself as a friend');
      } else if (error.message === 'You are already friends with this user') {
        Alert.alert('Info', 'You are already friends with this user.');
      } else if (error.message === 'A friend request is already pending with this user') {
        Alert.alert('Info', 'A friend request is already pending with this user.');
      } else {
        Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add Friend</Text>
            <View style={styles.headerUnderline} />
          </View>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <Icon name="email" size={24} color={colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter friend's email"
              placeholderTextColor={colors.text.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddFriend} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="person-add" size={24} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Send Friend Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Medium',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Bold',
  },
});

export default AddFriend;