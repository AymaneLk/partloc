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
    fetchUserProfile();
    fetchEmergencyContacts();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        console.log('Fetched user profile:', data);
        console.log('Avatar URL:', data.avatar_url);
        setUser(data);
      }
    }
  };

  const fetchEmergencyContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching emergency contacts:', error);
      } else {
        setEmergencyContacts(data);
      }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editButton}>
          <Icon name="edit" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileInfo}>
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={user?.avatar_url ? { uri: user.avatar_url } : require('../assets/user.png')}
              style={styles.profileImage}
              onError={(e) => {
                console.error('Image load error:', e.nativeEvent.error);
                // Fallback to default image on error
                setUser(prevUser => ({...prevUser, avatar_url: null}));
              }}
              onLoad={() => console.log('Image loaded successfully')}
            />
            <View style={styles.cameraIconContainer}>
              <Icon name="camera-alt" size={20} color={colors.white} />
            </View>
          </TouchableOpacity>
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
              <Icon name="person" size={24} color={colors.text.secondary} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addEmergencyContact}>
            <Icon name="add-circle" size={24} color={colors.accent} />
            <Text style={styles.addButtonText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Share Location</Text>
            <Switch
              value={isSharing}
              onValueChange={toggleLocationSharing}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={isSharing ? colors.primary : colors.surface}
            />
          </View>
        </View>

        <View style={styles.friendsSection}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('FriendsList')}>
            <Text style={styles.buttonText}>View Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AddFriend')}>
            <Text style={styles.buttonText}>Add Friend</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('FriendRequests')}>
            <Text style={styles.buttonText}>Friend Requests</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: Platform.OS === 'android' ? 20 : 0,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Bold',
  },
  editButton: {
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  profileInfo: {
    alignItems: 'center',
    padding: 20,
    marginTop: Platform.OS === 'ios' ? 10 : 7,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 16,
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 5,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: colors.surface,
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
    color: colors.text.primary,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  contactPhone: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'ClashGrotesk-Medium',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  addButtonText: {
    fontSize: 16,
    color: colors.accent,
    marginLeft: 8,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  button: {
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
    width: '90%',
    alignSelf: 'center',
    marginVertical: Platform.OS === 'ios' 
    ? 7
    : 5
  },
  buttonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
});

export default Profile;