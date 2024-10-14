import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, SafeAreaView, Linking, Platform, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabaseClient';
import { colors } from '../theme';
import { decode } from 'base64-arraybuffer';
import { updateUserLocation } from '../supabaseClient';
import * as Location from 'expo-location';

const Profile = ({ session }) => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isAudioSharing, setIsAudioSharing] = useState(false);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (session && session.user) {
      fetchUserProfile();
      fetchEmergencyContacts();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setUser(data);
      setShowEmergencyContacts(data.show_emergency_contact);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setEmergencyContacts(data);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      Alert.alert('Error', 'Failed to load emergency contacts');
    }
  };

  const toggleEmergencyContactsVisibility = async () => {
    try {
      const newValue = !showEmergencyContacts;
      const { data, error } = await supabase
        .from('profiles')
        .update({ show_emergency_contact: newValue })
        .eq('user_id', session.user.id);

      if (error) throw error;
      setShowEmergencyContacts(newValue);
      Alert.alert('Success', `Emergency contacts visibility ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating emergency contacts visibility:', error);
      Alert.alert('Error', 'Failed to update emergency contacts visibility');
    }
  };

  const openContactModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setContactName(contact.name);
      setContactPhone(contact.phone);
    } else {
      setEditingContact(null);
      setContactName('');
      setContactPhone('');
    }
    setIsContactModalVisible(true);
  };

  const closeContactModal = () => {
    setIsContactModalVisible(false);
    setEditingContact(null);
    setContactName('');
    setContactPhone('');
  };

  const saveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Error', 'Name and phone number cannot be empty');
      return;
    }

    try {
      if (editingContact) {
        // Update existing contact
        const { data, error } = await supabase
          .from('emergency_contacts')
          .update({ name: contactName.trim(), phone: contactPhone.trim() })
          .eq('id', editingContact.id);

        if (error) throw error;
      } else {
        // Add new contact
        const { data, error } = await supabase
          .from('emergency_contacts')
          .insert({ user_id: session.user.id, name: contactName.trim(), phone: contactPhone.trim() });

        if (error) throw error;
      }

      fetchEmergencyContacts(); // Refresh the contacts list
      closeContactModal();
      Alert.alert('Success', editingContact ? 'Contact updated successfully' : 'Contact added successfully');
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const deleteContact = async (contactId) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      fetchEmergencyContacts(); // Refresh the contacts list
      Alert.alert('Success', 'Contact deleted successfully');
    } catch (error) {
      console.error('Error deleting contact:', error);
      Alert.alert('Error', 'Failed to delete contact');
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Selected image URI:', result.assets[0].uri);
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const uploadImage = async (uri) => {
    try {
      // Convert image to base64
      const base64Image = await fileToBase64(uri);
      
      const fileName = `${user.user_id}/${Date.now()}.png`;

      // Remove the data:image/xxx;base64, part from the base64 string
      const base64Data = base64Image.split(',')[1];

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64Data), {
          contentType: 'image/png',
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.user_id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: avatarUrl });
      console.log('Avatar URL updated:', avatarUrl);
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image: ' + error.message);
    }
  };

  const fileToBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
  };

  const toggleLocationSharing = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      setIsSharing(!isSharing);

      if (!isSharing) {
        let location = await Location.getCurrentPositionAsync({});
        await updateUserLocation(session, location.coords.latitude, location.coords.longitude);
      } else {
        await updateUserLocation(session, null, null);
      }
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      Alert.alert('Error', 'Failed to toggle location sharing');
    }
  };

  const toggleAudioSharing = async () => {
    try {
      setIsAudioSharing(!isAudioSharing);
      if (!isAudioSharing) {
        // Update user's profile to indicate they're willing to share audio
        await supabase
          .from('profiles')
          .update({ audio_sharing_enabled: true })
          .eq('user_id', session.user.id);
        Alert.alert('Audio Sharing Enabled', 'Your friends can now request to listen to your surroundings.');
      } else {
        // Update user's profile to indicate they're not willing to share audio
        await supabase
          .from('profiles')
          .update({ audio_sharing_enabled: false })
          .eq('user_id', session.user.id);
        Alert.alert('Audio Sharing Disabled', 'Your friends can no longer listen to your surroundings.');
      }
    } catch (error) {
      console.error('Error toggling audio sharing:', error);
      Alert.alert('Error', 'Failed to toggle audio sharing');
    }
  };

  const deleteProfilePicture = async () => {
    Alert.alert(
      "Delete Profile Picture",
      "Are you sure you want to delete your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('user_id', user.user_id);

              if (error) throw error;

              setUser({ ...user, avatar_url: null });
              Alert.alert('Success', 'Profile picture deleted successfully');
            } catch (error) {
              console.error('Error deleting profile picture:', error);
              Alert.alert('Error', 'Failed to delete profile picture');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerUnderline} />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
          <Icon name="settings" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={user?.avatar_url ? { uri: user.avatar_url } : require('../assets/user.png')}
                style={styles.profileImage}
                onError={(e) => {
                  console.error('Image load error:', e.nativeEvent.error);
                  setUser(prevUser => ({...prevUser, avatar_url: null}));
                }}
                onLoad={() => console.log('Image loaded successfully')}
              />
              <View style={styles.cameraIconContainer}>
                <Icon name="camera-alt" size={20} color={colors.white} />
              </View>
            </TouchableOpacity>
            {user?.avatar_url && (
              <TouchableOpacity style={styles.deleteIconContainer} onPress={deleteProfilePicture}>
                <Icon name="delete" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.name}>{user?.full_name || 'User Name'}</Text>
          <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
          <Text style={styles.phone}>{user?.phone || 'Phone number not set'}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('FriendsList')}>
            <Icon name="people" size={28} color={colors.white} />
            <Text style={styles.actionButtonText}>Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AddFriend')}>
            <Icon name="person-add" size={28} color={colors.white} />
            <Text style={styles.actionButtonText}>Add Friend</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('FriendRequests')}>
            <Icon name="notifications" size={28} color={colors.white} />
            <Text style={styles.actionButtonText}>Requests</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <View style={styles.switchContainer}>
              <Switch
                value={showEmergencyContacts}
                onValueChange={toggleEmergencyContactsVisibility}
                trackColor={{ false: colors.border, true: colors.error }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>
          {emergencyContacts.map((contact) => (
            <View key={contact.id} style={styles.contactItem}>
              <Icon name="person" size={24} color={colors.white} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => openContactModal(contact)} style={styles.editButton}>
                <Icon name="edit" size={20} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteContact(contact.id)} style={styles.deleteButton}>
                <Icon name="delete" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={() => openContactModal()}>
            <Icon name="add-circle" size={24} color={colors.white} />
            <Text style={styles.addButtonText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isContactModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeContactModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={contactName}
              onChangeText={setContactName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={closeContactModal}>
                <Text style={[styles.modalButtonText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveContact}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: Platform.OS === 'android' ? 20 : 0,
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  profileCard: {
    alignItems: 'center',
    padding: 20,
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
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.error,
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.error,
    borderRadius: 15,
    padding: 5,
  },
  deleteIconContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.error,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    fontFamily: 'ClashGrotesk-Bold',
  },
  email: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 4,
    fontFamily: 'ClashGrotesk-Medium',
  },
  phone: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'ClashGrotesk-Medium',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Bold',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  contactIcon: {
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  contactPhone: {
    fontSize: 14,
    color: colors.white,
    fontFamily: 'ClashGrotesk-Medium',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 12,
  },
  addButtonText: {
    fontSize: 16,
    color: colors.white,
    marginLeft: 8,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginHorizontal: 16,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 20,
    padding: 16,
    width: '30%',
    aspectRatio: 1,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.white,
    fontFamily: 'ClashGrotesk-Semibold',
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Medium',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'ClashGrotesk-Bold',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Medium',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.error,
    marginLeft: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'ClashGrotesk-Semibold',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'ClashGrotesk-Semibold',
  },
  switchContainer: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }], // Makes the switch slightly larger
  },
});

export default Profile;