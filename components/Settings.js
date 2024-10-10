import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Switch, Platform, Modal, TextInput, Alert } from 'react-native';
import { colors } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { updateWatchState } from '../supabaseClient';  // Make sure this import is at the top of your file

const Settings = ({ session }) => {
  const navigation = useNavigation();
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [isAudioSharing, setIsAudioSharing] = useState(false);

  const handleLogout = async () => {
    try {
      // Attempt to update watch state to false before logging out
      try {
        await updateWatchState(session.user.id, false);
      } catch (watchStateError) {
        console.log('Error updating watch state during logout:', watchStateError);
        // Continue with logout even if updating watch state fails
      }

      // Proceed with logout
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.log('Error during logout:', error.message);
      // Optionally, you can show an alert to the user
      // Alert.alert('Logout Error', 'An error occurred while logging out. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // First, verify the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (signInError) throw new Error('Current password is incorrect');

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      Alert.alert('Success', 'Password updated successfully');
      setChangePasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const toggleLocationSharing = async (value) => {
    setIsLocationSharing(value);
    // Implement the logic to update location sharing preference in the backend
  };

  const toggleAudioSharing = async (value) => {
    setIsAudioSharing(value);
    // Implement the logic to update audio sharing preference in the backend
  };

  const SettingItem = ({ title, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <View style={styles.switchContainer}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.error }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.border}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={styles.headerUnderline} />
          </View>
          <View style={styles.placeholderButton} />
        </View>
        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <TouchableOpacity style={styles.settingButton} onPress={() => setChangePasswordModalVisible(true)}>
              <Icon name="lock" size={24} color={colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingButtonText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton}>
              <Icon name="email" size={24} color={colors.text.primary} style={styles.settingIcon} />
              <Text style={styles.settingButtonText}>Update Email</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <SettingItem 
              title="Push Notifications" 
              value={true} 
              onValueChange={() => {}}
            />
            <SettingItem 
              title="Email Notifications" 
              value={false} 
              onValueChange={() => {}}
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <SettingItem 
              title="Location Sharing" 
              value={isLocationSharing} 
              onValueChange={toggleLocationSharing}
            />
            <SettingItem 
              title="Audio Sharing" 
              value={isAudioSharing} 
              onValueChange={toggleAudioSharing}
            />
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color={colors.white} style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isChangePasswordModalVisible}
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setChangePasswordModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholderTextColor={colors.text.secondary}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor={colors.text.secondary}
              />
              <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword}>
                <Text style={styles.changePasswordButtonText}>Change Password</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setChangePasswordModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 8,
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
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    fontFamily: 'ClashGrotesk-Bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Medium',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingButtonText: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Medium',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.error,
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'ClashGrotesk-Bold',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalContent: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Bold',
  },
  input: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Medium',
  },
  modalButton: {
    backgroundColor: colors.error,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  modalCancelButton: {
    backgroundColor: colors.border,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  modalButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Bold',
  },
  switchContainer: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }], // Makes the switch slightly larger
  },
});

export default Settings;