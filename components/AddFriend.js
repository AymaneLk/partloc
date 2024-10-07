import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { sendFriendRequest } from '../supabaseClient';
import { colors } from '../theme';

const AddFriend = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddFriend = async () => {
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
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter friend's email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleAddFriend} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Friend Request'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 50,
    padding: 20,
    backgroundColor: colors.background,
  },
  input: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
});

export default AddFriend;