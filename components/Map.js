import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, SafeAreaView, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme';
import FloatingMenu from './FloatingMenu';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { updateUserLocation, getFriendsLocations, subscribeToFriendsLocations, supabase, subscribeToProfileChanges } from '../supabaseClient';

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

// Add these functions at the top of your file, after the imports

const getRandomLightColor = () => {
  const r = Math.floor(Math.random() * 100 + 155);
  const g = Math.floor(Math.random() * 100 + 155);
  const b = Math.floor(Math.random() * 100 + 155);
  return `rgb(${r},${g},${b})`;
};

const getInitials = (name) => {
  if (!name) return '?'; // Return a default value if name is undefined
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function MapComponent({ session }) {
  const [mapState, setMapState] = useState({
    location: null,
    errorMsg: null,
    currentStyleIndex: 0,
    friendsLocations: [],
    unavailableFriends: [],
    friendProfiles: {},
    friendColors: {},
  });

  const [profiles, setProfiles] = useState({});

  const mapRef = useRef(null);
  const navigation = useNavigation();

  const loadFriendsLocations = useCallback(async () => {
    try {
      const friendsLocations = await getFriendsLocations(session);
      setMapState(prev => ({ ...prev, friendsLocations }));
    } catch (error) {
      console.error('Error fetching friends locations:', error);
    }
  }, [session]);

  useEffect(() => {
    let locationSubscription;
    let friendsSubscription;
    let profileSubscription;
    let locationUpdateInterval;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMapState(prev => ({ ...prev, errorMsg: 'Permission to access location was denied' }));
        return;
      }

      let initialLocation = await Location.getCurrentPositionAsync({});
      setMapState(prev => ({ ...prev, location: initialLocation }));
      updateUserLocation(session, initialLocation.coords.latitude, initialLocation.coords.longitude);

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setMapState(prev => ({ ...prev, location: newLocation }));
          updateUserLocation(session, newLocation.coords.latitude, newLocation.coords.longitude);
        }
      );

      await loadFriendsLocations();
      locationUpdateInterval = setInterval(loadFriendsLocations, 5000);

      friendsSubscription = await subscribeToFriendsLocations(session, (payload) => {
        setMapState(prev => {
          const updatedLocations = prev.friendsLocations.map(loc => 
            loc.user_id === payload.new.user_id 
              ? { ...loc, ...payload.new, lastUpdated: new Date().toISOString() }
              : loc
          );
          if (!updatedLocations.some(loc => loc.user_id === payload.new.user_id)) {
            updatedLocations.push({ ...payload.new, lastUpdated: new Date().toISOString() });
          }
          return { ...prev, friendsLocations: updatedLocations };
        });
      });

      // Initialize friend colors
      setMapState(prev => {
        const colors = {};
        prev.friendsLocations.forEach(friend => {
          if (!colors[friend.user_id]) {
            colors[friend.user_id] = getRandomLightColor();
          }
        });
        return { ...prev, friendColors: colors };
      });

      // Subscribe to profile changes
      profileSubscription = subscribeToProfileChanges(session, (payload) => {
        setProfiles(prev => ({
          ...prev,
          [payload.new.user_id]: payload.new
        }));
      });

      // Initialize profiles
      const { data: initialProfiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url');
      
      if (error) {
        console.error('Error fetching initial profiles:', error);
      } else {
        const profilesObj = initialProfiles.reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {});
        setProfiles(profilesObj);
      }
    })();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (friendsSubscription) friendsSubscription.unsubscribe();
      if (profileSubscription) profileSubscription.unsubscribe();
      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
    };
  }, [session, loadFriendsLocations]);

  useFocusEffect(useCallback(() => {
    loadFriendsLocations();
  }, [loadFriendsLocations]));

  const changeMapStyle = useCallback(() => {
    setMapState(prev => ({ ...prev, currentStyleIndex: (prev.currentStyleIndex + 1) % mapStyles.length }));
  }, []);

  const centerOnUserLocation = useCallback(async () => {
    if (mapState.location) {
      mapRef.current?.animateToRegion({
        latitude: mapState.location.coords.latitude,
        longitude: mapState.location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } else {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMapState(prev => ({ ...prev, errorMsg: 'Permission to access location was denied' }));
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setMapState(prev => ({ ...prev, location: currentLocation }));
      mapRef.current?.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    }
  }, [mapState.location]);

  const goToProfile = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const getLocationStatus = useCallback((timestamp) => {
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
  }, []);

  const renderMarker = useCallback((user, isCurrentUser = false) => {
    const { latitude, longitude } = user;
    let name, avatarUrl;

    if (isCurrentUser) {
      name = 'Me';
      avatarUrl = profiles[session.user.id]?.avatar_url;
    } else {
      const profile = profiles[user.user_id];
      name = profile?.full_name || 'Unknown';
      avatarUrl = profile?.avatar_url;
    }

    const initials = getInitials(name);
    const backgroundColor = isCurrentUser ? colors.accent : mapState.friendColors[user.user_id] || getRandomLightColor();

    const { status, description } = getLocationStatus(user.timestamp);
    const isOnline = status === 'current';

    return (
      <Marker
        key={user.user_id}
        coordinate={{ latitude, longitude }}
        title={name}
        description={isCurrentUser ? "Your location" : description}
      >
        <View style={styles.markerContainer}>
          <View style={[
            styles.statusDot,
            isOnline ? styles.onlineDot : styles.offlineDot
          ]} />
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.avatarImage} 
              onError={() => {
                setProfiles(prev => ({
                  ...prev,
                  [user.user_id]: { ...prev[user.user_id], avatar_url: null }
                }));
              }}
            />
          ) : (
            <View style={[styles.initialsContainer, { backgroundColor }]}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          )}
        </View>
      </Marker>
    );
  }, [session.user.id, profiles, mapState.friendColors, getLocationStatus]);

  if (!mapState.location) {
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
          latitude: mapState.location?.coords.latitude || 0,
          longitude: mapState.location?.coords.longitude || 0,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        mapType={mapStyles[mapState.currentStyleIndex].style}
      >
        {mapState.location && renderMarker({
          user_id: session.user.id,
          latitude: mapState.location.coords.latitude,
          longitude: mapState.location.coords.longitude,
          timestamp: new Date().toISOString(), // Always consider current user as online
        }, true)}
        {mapState.friendsLocations.map(friend => renderMarker(friend))}
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
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'visible', // Changed from 'hidden' to 'visible'
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18, // To account for the border
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18, // To account for the border
  },
  initialsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: -6,
    right: -6,
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 1, // Ensure it's above the avatar/initials
  },
  onlineDot: {
    backgroundColor: '#4CAF50', // Green color for online status
  },
  offlineDot: {
    backgroundColor: '#9E9E9E', // Gray color for offline status
  },
});

export default React.memo(MapComponent);