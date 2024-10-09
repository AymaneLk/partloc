import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, SafeAreaView, Platform } from 'react-native';
import { sendFriendRequest } from '../supabaseClient';
import { colors } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const AddFriend = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Friend</Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.content}>
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
    paddingTop: Platform.OS === 'ios' ? 8 : 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  placeholderButton: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  input: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
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