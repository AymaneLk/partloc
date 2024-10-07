import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, SafeAreaView, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme';
import FloatingMenu from './FloatingMenu';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { updateUserLocation, getFriendsLocations, subscribeToFriendsLocations, supabase } from '../supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

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

  const loadFriendsLocations = useCallback(async () => {
    try {
      const friendsLocations = await getFriendsLocations(session);
      setFriendsLocations(friendsLocations);
    } catch (error) {
      console.error('Error fetching friends locations:', error);
    }
  }, [session]);

  useEffect(() => {
    let locationSubscription;
    let friendsSubscription;
    let locationUpdateInterval;

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

      // Initial load of friends' locations
      await loadFriendsLocations();

      // Set up interval to update friends' locations every 5 seconds
      locationUpdateInterval = setInterval(loadFriendsLocations, 5000);

      // Subscribe to friends' location updates
      friendsSubscription = await subscribeToFriendsLocations(session, (payload) => {
        setFriendsLocations(prevLocations => {
          const updatedLocations = [...prevLocations];
          const index = updatedLocations.findIndex(loc => loc.user_id === payload.new.user_id);
          if (index !== -1) {
            updatedLocations[index] = { 
              ...updatedLocations[index], 
              ...payload.new,
              lastUpdated: new Date().toISOString()
            };
          } else {
            updatedLocations.push({
              ...payload.new,
              lastUpdated: new Date().toISOString()
            });
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
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
    };
  }, [session, loadFriendsLocations]);

  useFocusEffect(
    useCallback(() => {
      loadFriendsLocations();
    }, [loadFriendsLocations])
  );

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

  const getLocationDescription = (timestamp) => {
    const now = new Date();
    const lastUpdated = new Date(timestamp);
    const diffInSeconds = Math.floor((now - lastUpdated) / 1000);

    if (diffInSeconds <= 10) {
      return 'Current location';
    } else {
      if (diffInSeconds < 60) {
        return `Last updated: ${diffInSeconds} seconds ago`;
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Last updated: ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Last updated: ${hours} hour${hours > 1 ? 's' : ''} ago`;
      }
    }
  };

  const getLocationStatus = (timestamp) => {
    const now = new Date();
    const lastUpdated = new Date(timestamp);
    const diffInSeconds = Math.floor((now - lastUpdated) / 1000);

    if (diffInSeconds <= 10) {
      return { status: 'current', description: 'Current location' };
    } else if (diffInSeconds <= 70) {
      return { status: 'recent', description: `Updated ${diffInSeconds} seconds ago` };
    } else {
      const minutes = Math.floor(diffInSeconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return { status: 'stale', description: `Updated ${hours} hour${hours > 1 ? 's' : ''} ago` };
      } else {
        return { status: 'stale', description: `Updated ${minutes} minute${minutes > 1 ? 's' : ''} ago` };
      }
    }
  };

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
        {friendsLocations.length > 0 ? (
          friendsLocations.map((friend) => {
            const { status, description } = getLocationStatus(friend.timestamp);
            return (
              <Marker
                key={friend.user_id}
                coordinate={{
                  latitude: friend.latitude,
                  longitude: friend.longitude,
                }}
                title={friend.profiles.full_name}
                description={description}
              >
                <View style={[styles.friendMarker, styles[`${status}Marker`]]}>
                  <Text style={styles.friendMarkerText}>{friend.profiles.full_name}</Text>
                </View>
              </Marker>
            );
          })
        ) : (
          <Text>No friends' locations available</Text>
        )}
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
    padding: 5,
    borderRadius: 5,
  },
  friendMarkerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  currentMarker: {
    backgroundColor: colors.accent,
  },
  recentMarker: {
    backgroundColor: '#FFA500', // Orange color for recent locations
  },
  staleMarker: {
    backgroundColor: colors.secondary,
  },
});

export default MapComponent;