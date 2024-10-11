import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import { supabase } from '../supabaseClient';
import { colors } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const FriendProfile = ({ route, navigation }) => {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  useEffect(() => {
    fetchFriendProfile();
    fetchEmergencyContacts();
  }, []);

  const fetchFriendProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      console.log('Fetched profile:', data); // Debug log
    } catch (error) {
      console.error('Error fetching friend profile:', error);
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('show_emergency_contacts')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      console.log('Show emergency contacts:', profileData.show_emergency_contacts); // Debug log

      if (profileData.show_emergency_contacts) {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;
        setEmergencyContacts(data);
        console.log('Fetched emergency contacts:', data); // Debug log
      } else {
        setEmergencyContacts([]);
      }
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      setEmergencyContacts([]);
    }
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Friend Profile</Text>
          <View style={styles.headerUnderline} />
        </View>
        <View style={styles.placeholderButton} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <Image
            source={profile.avatar_url ? { uri: profile.avatar_url } : require('../assets/user.png')}
            style={styles.profileImage}
          />
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <Text style={styles.phone}>{profile.phone || 'Phone number not set'}</Text>
          <Text style={styles.memberSince}>Member since {new Date(profile.created_at).toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          </View>
          {profile.show_emergency_contacts ? (
            emergencyContacts.length > 0 ? (
              emergencyContacts.map((contact, index) => (
                <View key={index} style={styles.contactItem}>
                  <Icon name="person" size={24} color={colors.white} style={styles.contactIcon} />
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noContactsText}>This user has not added any emergency contacts.</Text>
            )
          ) : (
            <Text style={styles.notEnabledText}>User is not sharing emergency contacts.</Text>
          )}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
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
    marginBottom: 4,
    fontFamily: 'ClashGrotesk-Medium',
  },
  memberSince: {
    fontSize: 14,
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
  sectionTitleContainer: {
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
  noContactsText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'ClashGrotesk-Medium',
    textAlign: 'center',
    marginTop: 10,
  },
  notEnabledText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'ClashGrotesk-Medium',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default FriendProfile;