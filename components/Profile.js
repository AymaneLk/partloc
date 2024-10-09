import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, SafeAreaView, Linking, Platform } from 'react-native';
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
      const { data, error } = await supabase
        .from('profiles')
        .update({ show_emergency_contacts: !showEmergencyContacts })
        .eq('user_id', user.user_id);

      if (error) throw error;
      setShowEmergencyContacts(!showEmergencyContacts);
    } catch (error) {
      Alert.alert('Error', 'Failed to update emergency contacts visibility');
    }
  };

  const addEmergencyContact = () => {
    // Implement add emergency contact functionality
    Alert.alert('Add Emergency Contact', 'This feature is not implemented yet.');
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <Switch
              value={showEmergencyContacts}
              onValueChange={toggleEmergencyContactsVisibility}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={showEmergencyContacts ? colors.primary : colors.surface}
            />
          </View>
          {emergencyContacts.map((contact, index) => (
            <View key={index} style={styles.contactItem}>
              <Icon name="person" size={24} color={colors.white} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addEmergencyContact}>
            <Icon name="add-circle" size={24} color={colors.white} />
            <Text style={styles.addButtonText}>Add Emergency Contact</Text>
          </TouchableOpacity>
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
      </ScrollView>
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
});

export default Profile;