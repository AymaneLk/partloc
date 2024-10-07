import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, SafeAreaView, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme';
import FloatingMenu from './FloatingMenu';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { updateUserLocation, getFriendsLocations, subscribeToFriendsLocations, supabase } from '../supabaseClient';

// Import your custom icon images
import customMarkerIcon from '../assets/location.png';
import locationIcon from '../assets/map (1).png';
import mapStyleIcon from '../assets/earth.png';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const mapStyles = [
  { name: 'Standard', style: 'standard' },
  { name: 'Satellite', style: 'satellite' },
  { name: 'Hybrid', style: 'hybrid' },
  { name: 'Terrain', style: 'terrain' },
];

function MapComponent({ session }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const [friendsLocations, setFriendsLocations] = useState([]);
  const [unavailableFriends, setUnavailableFriends] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState({});

  useEffect(() => {
    let locationSubscription;
    let friendsSubscription;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      // Get initial location
      let initialLocation = await Location.getCurrentPositionAsync({});
      setLocation(initialLocation);
      updateUserLocation(session, initialLocation.coords.latitude, initialLocation.coords.longitude);

      // Subscribe to location updates
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5, 
        },
        (newLocation) => {
          setLocation(newLocation);
          updateUserLocation(session, newLocation.coords.latitude, newLocation.coords.longitude);
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
          }
        }
      );

      // Fetch initial friends' locations
      try {
        const friendsLocations = await getFriendsLocations(session);
        setFriendsLocations(friendsLocations);
      } catch (error) {
        console.error('Error fetching friends locations:', error);
      }

      // Subscribe to friends' location updates
      friendsSubscription = await subscribeToFriendsLocations(session, (payload) => {
        setFriendsLocations(prevLocations => {
          const updatedLocations = [...prevLocations];
          const index = updatedLocations.findIndex(loc => loc.user_id === payload.new.user_id);
          if (index !== -1) {
            updatedLocations[index] = { ...updatedLocations[index], ...payload.new };
          } else {
            updatedLocations.push(payload.new);
          }
          return updatedLocations;
        });
      });
    })();

    // Cleanup function
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (friendsSubscription) {
        friendsSubscription.unsubscribe();
      }
    };
  }, [session]);

  const changeMapStyle = () => {
    setCurrentStyleIndex((prevIndex) => (prevIndex + 1) % mapStyles.length);
  };

  const centerOnUserLocation = async () => {
    if (location) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } else {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      mapRef.current.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  };

  const goToProfile = () => {
    navigation.navigate('Profile');
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 0,
          longitude: location?.coords.longitude || 0,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        mapType={mapStyles[currentStyleIndex].style}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="You are here"
            description="Your current location"
          >
            <Image 
              source={customMarkerIcon} 
              style={styles.markerIcon}
            />
          </Marker>
        )}
        {friendsLocations.map((friend) => (
          <Marker
            key={friend.user_id}
            coordinate={{
              latitude: friend.latitude,
              longitude: friend.longitude,
            }}
            title={friend.profiles.full_name}
            description={`Last updated: ${new Date(friend.timestamp).toLocaleString()}`}
          >
            <View style={styles.friendMarker}>
              <Text style={styles.friendMarkerText}>{friend.profiles.full_name}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      <FloatingMenu onProfilePress={goToProfile} />
      
      <SafeAreaView style={styles.topRightOverlay}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={changeMapStyle}
        >
          <Image source={mapStyleIcon} style={styles.iconImage} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.iconButton, styles.locationMarokerIcon]} 
          onPress={centerOnUserLocation}
        >
          <Image source={locationIcon} style={styles.iconImage} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerIcon: {
    width: 40,
    height: 40,
  },
  iconButton: {
    backgroundColor: colors.accent,
    borderRadius: 30,
    padding: 10,
    marginBottom: 10,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locatinMarokerIcon: {
    marginBottom: 0,
  },
  iconImage: {
    width: 25,
    height: 25,
  },
  topRightOverlay: {
    position: 'absolute',
    top: 100,
    right: 10,
    alignItems: 'flex-end',
  },
  settingsButton: {
    padding: 10,
    backgroundColor: colors.accent,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  friendMarker: {
    backgroundColor: colors.accent,
    padding: 5,
    borderRadius: 5,
  },
  friendMarkerText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MapComponent;