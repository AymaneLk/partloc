import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { supabase, updateWatchState } from '../supabaseClient';

const Settings = ({ session }) => {
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      // Set watch state to false before signing out
      await updateWatchState(session.user.id, false);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Navigation will be handled by the App component due to auth state change
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'ClashGrotesk-Bold',
    fontSize: 32,
    color: colors.primary,
    marginBottom: 30,
  },
  logoutButton: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutButtonText: {
    fontFamily: 'ClashGrotesk-Semibold',
    color: colors.background,
    fontSize: 18,
  },
});

export default Settings;
