import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Dimensions, SafeAreaView, Alert, Platform, Modal, AppState } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme';
import FloatingMenu from './FloatingMenu';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
  updateUserLocation, 
  getFriendsLocations, 
  subscribeToFriendsLocations, 
  updateWatchState, 
  subscribeToWatchStateChanges, 
  getInitialProfiles
} from '../supabaseClient';
import { debounce } from 'lodash';
import { LOCATION_UPDATE_INTERVAL } from '../supabaseClient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

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

const OFFLINE_THRESHOLD = 60000; // 1 minute in milliseconds

function MapComponent({ session }) {
  const [mapState, setMapState] = useState({
    location: null,
    errorMsg: null,
    currentStyleIndex: 0,
    friendsLocations: [],
    unavailableFriends: [],
    friendProfiles: {},
    friendColors: {},
    initialFitDone: false,
  });

  const [profiles, setProfiles] = useState({});
  const [mapType, setMapType] = useState('standard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lastUpdatedLocation, setLastUpdatedLocation] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  const mapRef = useRef(null);
  const navigation = useNavigation();

  const [mapCamera, setMapCamera] = useState({
    center: {
      latitude: 0,
      longitude: 0,
    },
    pitch: 45,
    altitude: 500,
    zoom: 15,
    heading: 0,
  });

  const [lastTap, setLastTap] = useState(null);

  const changeMapStyle = useCallback(() => {
    if (Platform.OS === 'ios') {
      setMapType(prevType => {
        const types = ['standard', 'satellite', 'hybrid', 'terrain'];
        const currentIndex = types.indexOf(prevType);
        const nextIndex = (currentIndex + 1) % types.length;
        return types[nextIndex];
      });
    } else {
      setMapState(prev => ({
        ...prev,
        currentStyleIndex: (prev.currentStyleIndex + 1) % mapStyles.length
      }));
    }
  }, []);

  useEffect(() => {
    if (mapState.location) {
      setMapCamera(prevCamera => ({
        ...prevCamera,
        center: {
          latitude: mapState.location.coords.latitude,
          longitude: mapState.location.coords.longitude,
        },
      }));
    }
  }, [mapState.location]);

  const onMapReady = useCallback(() => {
    if (mapRef.current && mapState.location) {
      mapRef.current.animateCamera(mapCamera, { duration: 1000 });
    }
  }, [mapCamera, mapState.location]);

  const loadFriendsLocations = useCallback(async () => {
    try {
      const friendsLocations = await getFriendsLocations(session);
      setMapState(prev => ({ ...prev, friendsLocations }));
    } catch (error) {
      console.error('Error fetching friends locations:', error);
    }
  }, [session]);

  const updateUserLocationPeriodically = useCallback(async () => {
    try {
      let currentLocation = await Location.getCurrentPositionAsync({});
      setMapState(prev => ({ ...prev, location: currentLocation }));

      // Check if location has changed significantly (e.g., more than 10 meters)
      const hasLocationChangedSignificantly = !lastUpdatedLocation ||
        (Math.abs(currentLocation.coords.latitude - lastUpdatedLocation.latitude) > 0.0001 ||
         Math.abs(currentLocation.coords.longitude - lastUpdatedLocation.longitude) > 0.0001);

      if (hasLocationChangedSignificantly) {
        await updateUserLocation(session, currentLocation.coords.latitude, currentLocation.coords.longitude);
        setLastUpdatedLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        });
      }
    } catch (error) {
      console.error('Error updating user location:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert(
          'Network Error',
          'Unable to update location due to network issues. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [session, lastUpdatedLocation]);

  const debouncedUpdateLocation = useMemo(
    () => debounce(updateUserLocationPeriodically, 5000, { leading: true, trailing: false }),
    [updateUserLocationPeriodically]
  );

  const handleAppStateChange = useCallback(async (nextAppState) => {
    console.log('App state changed:', nextAppState);
    if (nextAppState === 'active' || (nextAppState === 'inactive' && modalVisible)) {
      const result = await updateWatchState(session.user.id, true);
      if (!result) {
        console.log('Failed to update watch state to true');
      }
    } else if (nextAppState === 'background' && !modalVisible) {
      const result = await updateWatchState(session.user.id, false);
      if (!result) {
        console.log('Failed to update watch state to false');
      }
    }
    setAppState(nextAppState);
  }, [session.user.id, modalVisible]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  const fitMapToMarkers = useCallback((locations) => {
    if (locations.length === 0) return;

    const latitudes = locations.map(loc => loc.latitude);
    const longitudes = locations.map(loc => loc.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const paddingPercentage = 0.25; // Reduced padding for a tighter fit

    const newRegion = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * (1 + paddingPercentage),
      longitudeDelta: (maxLng - minLng) * (1 + paddingPercentage),
    };

    // Ensure the aspect ratio is maintained
    if (newRegion.latitudeDelta > newRegion.longitudeDelta * ASPECT_RATIO) {
      newRegion.longitudeDelta = newRegion.latitudeDelta / ASPECT_RATIO;
    } else {
      newRegion.latitudeDelta = newRegion.longitudeDelta * ASPECT_RATIO;
    }

    mapRef.current?.animateToRegion(newRegion, 1000);
  }, []);

  const fitMapToAllMarkers = useCallback(() => {
    if (mapRef.current && mapState.friendsLocations.length > 0) {
      const allLocations = [
        { latitude: mapState.location.coords.latitude, longitude: mapState.location.coords.longitude },
        ...mapState.friendsLocations.map(friend => ({ latitude: friend.latitude, longitude: friend.longitude }))
      ];

      mapRef.current.fitToCoordinates(allLocations, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [mapState.location, mapState.friendsLocations]);

  useEffect(() => {
    let locationSubscription;
    let friendsSubscription;
    let watchStateSubscription;
    let watchStateRefreshInterval;
    let locationUpdateInterval;

    const refreshWatchStates = async () => {
      try {
        const updatedProfiles = await getInitialProfiles();
        setProfiles(prev => {
          const updated = { ...prev };
          updatedProfiles.forEach(profile => {
            updated[profile.user_id] = { ...updated[profile.user_id], ...profile };
          });
          return updated;
        });
      } catch (error) {
        console.error('Error refreshing watch states:', error);
      }
    };

    const setupLocationAndFriends = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setMapState(prev => ({ ...prev, errorMsg: 'Permission to access location was denied' }));
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setMapState(prev => ({ ...prev, location: currentLocation }));

        const friendsLocations = await getFriendsLocations(session);
        setMapState(prev => ({ ...prev, friendsLocations }));

        // Combine current user's location with friends' locations
        const allLocations = [
          { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude },
          ...friendsLocations.map(friend => ({ latitude: friend.latitude, longitude: friend.longitude }))
        ];

        // Only fit to markers on initial load
        if (!mapState.initialFitDone) {
          fitMapToMarkers(allLocations);
          setMapState(prev => ({ ...prev, initialFitDone: true }));
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (newLocation) => {
            setMapState(prev => ({ ...prev, location: newLocation }));
            updateUserLocation(session, newLocation.coords.latitude, newLocation.coords.longitude);
          }
        );

        locationUpdateInterval = setInterval(debouncedUpdateLocation, 30000); // Update every 30 seconds

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

        // Update watching state to true immediately when the app opens
        const updatedProfile = await updateWatchState(session.user.id, true);
        setProfiles(prev => ({
          ...prev,
          [updatedProfile.user_id]: updatedProfile
        }));

        // Fetch initial profiles
        const initialProfiles = await getInitialProfiles();
        const profilesObj = initialProfiles.reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {});
        setProfiles(profilesObj);

        // Subscribe to watching state changes
        watchStateSubscription = subscribeToWatchStateChanges((updatedProfile) => {
          console.log('Received watching state update in Map component:', updatedProfile);
          setProfiles(prev => ({
            ...prev,
            [updatedProfile.user_id]: {
              ...prev[updatedProfile.user_id],
              ...updatedProfile
            }
          }));
        });

        // Set up periodic refresh of watching states
        watchStateRefreshInterval = setInterval(refreshWatchStates, 10000); // Refresh every 10 seconds
      } catch (error) {
        console.error('Error setting up location and friends:', error);
      }
    };

    setupLocationAndFriends();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (friendsSubscription) friendsSubscription.unsubscribe();
      if (watchStateSubscription) watchStateSubscription.unsubscribe();
      if (watchStateRefreshInterval) clearInterval(watchStateRefreshInterval);
      if (locationUpdateInterval) clearInterval(locationUpdateInterval);
      debouncedUpdateLocation.cancel(); // Cancel any pending debounced calls
      
      // Update watching state to false when the component unmounts
      updateWatchState(session.user.id, false);
    };
  }, [session, debouncedUpdateLocation, loadFriendsLocations, fitMapToMarkers]);

  useFocusEffect(useCallback(() => {
    loadFriendsLocations();
  }, [loadFriendsLocations]));

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

  const getLocationStatus = useCallback((user, timestamp) => {
    if (!timestamp || !user.latitude || !user.longitude) {
      return { 
        status: 'offline', 
        description: 'Cannot locate the user'
      };
    }

    const now = new Date();
    const lastUpdated = new Date(timestamp);
    const diffInMilliseconds = now - lastUpdated;

    const formatTimeDiff = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000);
      if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    };

    const firstName = user && user.full_name ? user.full_name.split(' ')[0] : 'User';

    // Consider the user online if the last update was within the last minute
    if (diffInMilliseconds <= 60000) { // 1 minute
      return { 
        status: 'online', 
        description: 'Current location'
      };
    } else if (diffInMilliseconds <= OFFLINE_THRESHOLD) {
      return { 
        status: 'online', 
        description: `${firstName} is here for ${formatTimeDiff(diffInMilliseconds)}`
      };
    } else {
      return { 
        status: 'offline', 
        description: `Last seen ${formatTimeDiff(diffInMilliseconds)} ago`
      };
    }
  }, []);

  const handleMarkerPress = useCallback((user) => {
    // Zoom to the user's location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: user.latitude,
        longitude: user.longitude,
        latitudeDelta: LATITUDE_DELTA / 4,
        longitudeDelta: LONGITUDE_DELTA / 4,
      }, 1000);
    }
  }, []);

  const handleMarkerLongPress = useCallback((user) => {
    setSelectedUser(user);
    setModalVisible(true);
  }, []);

  const renderMarker = useCallback((user, isCurrentUser = false) => {
    const { latitude, longitude } = user;
    let name, avatarUrl, isWatching;

    if (isCurrentUser) {
      name = 'Me';
      avatarUrl = profiles[session.user.id]?.avatar_url;
      isWatching = profiles[session.user.id]?.watch_state || false;
    } else {
      const profile = profiles[user.user_id];
      name = profile?.full_name || 'Unknown';
      avatarUrl = profile?.avatar_url;
      isWatching = profile?.watch_state || false;
    }

    const initials = getInitials(name);
    const backgroundColor = isCurrentUser ? colors.accent : mapState.friendColors[user.user_id] || getRandomLightColor();

    const { status, description } = getLocationStatus(user, user.timestamp);
    const isOnline = status === 'online';

    const markerStyle = Platform.OS === 'ios' 
      ? styles.markerContainer 
      : [styles.markerContainer, isWatching && styles.androidWatchingMarker];

    return (
      <Marker
        key={user.user_id}
        coordinate={{ latitude, longitude }}
        title={name}
        description={isCurrentUser ? "Your location" : description}
        onPress={() => handleMarkerPress(user)}
      >
        <TouchableOpacity
          onLongPress={() => !isCurrentUser && handleMarkerLongPress(user)}
          delayLongPress={500}
        >
          <View style={markerStyle}>
            {Platform.OS === 'ios' && (
              <>
                <View style={[
                  styles.statusDot,
                  isOnline ? styles.onlineDot : styles.offlineDot
                ]} />
                <View style={styles.watchingEye}>
                  <Icon 
                    name={isWatching ? "eye" : "eye-off"} 
                    size={12} 
                    color={isWatching ? colors.error : '#9E9E9E'}
                  />
                </View>
              </>
            )}
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
        </TouchableOpacity>
        <Callout tooltip>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutName}>{name}</Text>
            <Text style={styles.calloutDescription}>{description}</Text>
          </View>
        </Callout>
      </Marker>
    );
  }, [session.user.id, profiles, mapState.friendColors, getLocationStatus, handleMarkerPress, handleMarkerLongPress]);

  const renderUserDetailsModal = () => {
    if (!selectedUser) return null;

    const profile = profiles[selectedUser.user_id];
    const { status, description } = getLocationStatus(selectedUser, selectedUser.timestamp);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedUser(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setModalVisible(false);
            setSelectedUser(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Image
                source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../assets/user.png')}
                style={styles.modalAvatar}
              />
              <Text style={styles.modalName}>{profile?.full_name || 'Unknown'}</Text>
              <Text style={styles.modalDescription}>{description}</Text>
              <TouchableOpacity 
                style={styles.profileButton} 
                onPress={() => {
                  setModalVisible(false);
                  setSelectedUser(null);
                  navigation.navigate('FriendProfile', { userId: selectedUser.user_id });
                }}
              >
                <Text style={styles.profileButtonText}>Profile</Text>
                <Icon name="arrow-forward" size={20} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => {
                  setModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  useEffect(() => {
    if (selectedUser && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: selectedUser.latitude,
        longitude: selectedUser.longitude,
        latitudeDelta: LATITUDE_DELTA / 2,
        longitudeDelta: LONGITUDE_DELTA / 2,
      }, 1000);
    }
  }, [selectedUser]);

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
        provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 0,
          longitude: 0,
          latitudeDelta: 90,
          longitudeDelta: 90,
        }}
        mapType={Platform.OS === 'ios' ? mapType : mapStyles[mapState.currentStyleIndex].style}
        showsBuildings={true}
        pitchEnabled={true}
        rotateEnabled={true}
        showsCompass={true}
        showsScale={true}
        onMapReady={onMapReady}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        {mapState.location && renderMarker({
          user_id: session.user.id,
          latitude: mapState.location.coords.latitude,
          longitude: mapState.location.coords.longitude,
          timestamp: new Date().toISOString(),
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
          style={styles.iconButton} 
          onPress={centerOnUserLocation}
        >
          <Image source={locationIcon} style={styles.iconImage} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={() => {
            try {
              fitMapToAllMarkers();
            } catch (error) {
              console.error('Error fitting map to markers:', error);
              // Fallback to a simpler zoom out method
              if (mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: mapState.location.coords.latitude,
                  longitude: mapState.location.coords.longitude,
                  latitudeDelta: 0.5,
                  longitudeDelta: 0.5,
                }, 1000);
              }
            }
          }}
        >
          <MaterialIcon name="zoom-out-map" size={24} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </SafeAreaView>
      {renderUserDetailsModal()}
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
    backgroundColor: colors.error,
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
    top: 50,
    right: 10,
    alignItems: 'flex-end',
  },
  settingsButton: {
    padding: 10,
    backgroundColor: colors.error,
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
    overflow: 'visible',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidWatchingMarker: {
    borderColor: '#4CAF50',
    borderWidth: 3,
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
    zIndex: 1,
  },
  onlineDot: {
    backgroundColor: '#4CAF50', // Green color for online status
  },
  offlineDot: {
    backgroundColor: '#9E9E9E', // Gray color for offline status
  },
  watchingEye: {
    position: 'absolute',
    top: -6,
    left: -6,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 2,
    width: 18,  // Ensure consistent width
    height: 18, // Ensure consistent height
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidStatusContainer: {
    position: 'absolute',
    top: -12,
    right: -12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 3,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  androidStatusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 5,
  },
  androidOnlineDot: {
    backgroundColor: '#4CAF50',
  },
  androidOfflineDot: {
    backgroundColor: '#9E9E9E',
  },
  androidWatchingEye: {
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.error, // This will make the modal orange
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  modalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.white,
    marginBottom: 15,
    textAlign: 'center',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  profileButtonText: {
    color: colors.error,
    fontWeight: 'bold',
    marginRight: 5,
  },
  closeButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  closeButtonText: {
    color: colors.error,
    fontWeight: 'bold',
  },
  calloutContainer: {
    width: 100,
    backgroundColor: colors.error,
    padding: 10,
    borderRadius: 30,
    alignItems: 'center',
  },
  calloutName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
  },
  calloutDescription: {
    color: 'white',
    fontSize: 8,
  },
});

export default React.memo(MapComponent);