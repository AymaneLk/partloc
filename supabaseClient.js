import { createClient } from '@supabase/supabase-js';
import * as Location from 'expo-location';  // Add this import
import { throttle } from 'lodash';  // Make sure to import throttle from lodash
import NetInfo from '@react-native-community/netinfo';
import haversine from 'haversine-distance';
import * as Battery from 'expo-battery';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Check your .env file.');
}

// Add this somewhere in your Supabase client initialization
NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async (response) => response.status === 204,
  reachabilityLongTimeout: 60 * 1000, // 60s
  reachabilityShortTimeout: 5 * 1000, // 5s
  reachabilityRequestTimeout: 15 * 1000, // 15s
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const sendFriendRequest = async (friendEmail) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if the user is trying to add themselves
  if (user.email === friendEmail) {
    throw new Error('You cannot send a friend request to yourself');
  }

  console.log('Searching for user with email:', friendEmail);

  // Fetch only the profile with the matching email
  const { data: friendData, error: friendError } = await supabase
    .from('profiles')
    .select('user_id, email')
    .eq('email', friendEmail)
    .single();

  if (friendError) {
    console.error('Error fetching friend data:', friendError);
    throw friendError;
  }

  console.log('Friend data:', friendData);

  if (!friendData) {
    console.log('No user found with email:', friendEmail);
    throw new Error('User not found');
  }

  // Check if trying to add self as friend (this is a redundant check, but we'll keep it for safety)
  if (friendData.user_id === user.id) {
    throw new Error('You cannot add yourself as a friend');
  }

  // Check if a friendship already exists
  const { data: existingFriendship, error: existingFriendshipError } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendData.user_id}),and(user_id.eq.${friendData.user_id},friend_id.eq.${user.id})`)
    .single();

  if (existingFriendshipError && existingFriendshipError.code !== 'PGRST116') {
    throw existingFriendshipError;
  }

  if (existingFriendship) {
    if (existingFriendship.status === 'accepted') {
      throw new Error('You are already friends with this user');
    } else if (existingFriendship.status === 'pending') {
      throw new Error('A friend request is already pending with this user');
    }
  }

  // If no existing friendship, create a new one
  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: user.id,
      friend_id: friendData.user_id,
      status: 'pending'
    });

  if (error) throw error;
  return data;
};

export const acceptFriendRequest = async (friendshipId) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Start a transaction
  const { data, error } = await supabase.rpc('accept_friend_request', {
    friendship_id: friendshipId,
    current_user_id: user.id
  });

  if (error) throw error;
  return { message: 'Friend request accepted' };
};

export const rejectFriendRequest = async (friendshipId) => {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'rejected' })
    .eq('id', friendshipId);

  if (error) throw error;
  return data;
};

export const getFriends = async (session) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      friend:profiles!friendships_friend_id_fkey(user_id, full_name, avatar_url),
      user:profiles!friendships_user_id_fkey(user_id, full_name, avatar_url)
    `)
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
    .eq('status', 'accepted');

  if (error) throw error;

  // Use a Set to keep track of unique user_ids
  const uniqueFriends = new Set();
  const friends = data.map(friendship => {
    const friend = friendship.user.user_id === session.user.id ? friendship.friend : friendship.user;
    return {
      ...friend,
      friendship_id: friendship.id
    };
  }).filter(friend => {
    // Only keep the friend if we haven't seen their user_id before
    if (!uniqueFriends.has(friend.user_id)) {
      uniqueFriends.add(friend.user_id);
      return true;
    }
    return false;
  });

  return friends;
};

export const getPendingFriendRequests = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      user_id,
      profiles!fk_user_id(user_id, full_name, avatar_url)
    `)
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error) throw error;
  return data;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const LOCATION_UPDATE_INTERVAL = 60000; // 1 minute
const SIGNIFICANT_DISTANCE = 5; // 5 meters

let lastLocation = null;
let lastUpdateTime = null;
let totalTimeAtLocation = 0;

export const updateUserLocation = async (session, latitude, longitude) => {
  let userId;
  if (session && session.user) {
    userId = session.user.id;
  } else {
    // If no session, try to get the user ID from storage
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id;
  }

  if (!userId) {
    console.log('No user ID available, skipping location update');
    return;
  }

  const currentTime = new Date();
  const currentLocation = { latitude, longitude };

  const shouldUpdate = () => {
    if (!lastLocation || !lastUpdateTime) return true;
    
    const timeDiff = currentTime - lastUpdateTime;
    const distance = haversine(lastLocation, currentLocation);

    if (distance <= SIGNIFICANT_DISTANCE) {
      // User is still at the same location
      totalTimeAtLocation += timeDiff;
      return true; // We'll update to reflect the increased time at this location
    } else {
      // User has moved to a new location
      totalTimeAtLocation = 0;
      return true;
    }
  };

  if (shouldUpdate()) {
    try {
      const timestamp = new Date().toISOString();
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();
      const isCharging = batteryState === Battery.BatteryState.CHARGING || 
                         batteryState === Battery.BatteryState.FULL;
      const roundedBatteryLevel = Math.round(batteryLevel * 100);
      console.log('Updating location with battery level:', roundedBatteryLevel, 'Charging:', isCharging);
      await updateUserLocationWithRetry(session, latitude, longitude, timestamp, totalTimeAtLocation, roundedBatteryLevel, isCharging);
      console.log('Location and battery info updated successfully');
      lastLocation = currentLocation;
      lastUpdateTime = currentTime;
    } catch (error) {
      console.error('Failed to update location and battery info:', error);
    }
  } else {
    console.log('Location update skipped: No significant change');
  }

  // Schedule next update
  setTimeout(() => updateUserLocation(session, latitude, longitude), LOCATION_UPDATE_INTERVAL);
};

const updateUserLocationWithRetry = async (session, latitude, longitude, timestamp, duration, batteryLevel, isCharging, retries = 3, backoff = 1000) => {
  try {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      console.log('No internet connection. Skipping location update.');
      return null;
    }

    const { data, error } = await supabase
      .from('user_locations')
      .upsert({
        user_id: session.user.id,
        latitude,
        longitude,
        timestamp,
        duration,
        is_sharing: true,
        battery_level: batteryLevel,
        is_charging: isCharging
      }, {
        onConflict: 'user_id',
        returning: 'minimal'
      });

    if (error) throw error;
    return data;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying update location. Attempts left: ${retries}`);
      await delay(backoff);
      return updateUserLocationWithRetry(session, latitude, longitude, timestamp, duration, batteryLevel, isCharging, retries - 1, backoff * 2);
    } else {
      console.error('Error updating location in database after all retries:', error);
      throw error;
    }
  }
};

export const getFriendsLocations = async (session) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  // First, get all friendships
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
    .eq('status', 'accepted');

  if (friendshipsError) throw friendshipsError;

  // Extract friend IDs
  const friendIds = friendships.reduce((ids, friendship) => {
    if (friendship.user_id !== session.user.id) ids.push(friendship.user_id);
    if (friendship.friend_id !== session.user.id) ids.push(friendship.friend_id);
    return ids;
  }, []);

  // If there are no friends, return an empty array
  if (friendIds.length === 0) return [];

  // Now get the locations for these friends
  const { data: locations, error: locationsError } = await supabase
    .from('user_locations')
    .select(`
      user_id,
      latitude,
      longitude,
      timestamp,
      is_sharing,
      battery_level,
      is_charging,
      profiles:profiles!inner(user_id, full_name, avatar_url)
    `)
    .in('user_id', friendIds)
    .order('timestamp', { ascending: false });

  if (locationsError) throw locationsError;

  const validLocations = locations.filter(loc => 
    loc && loc.latitude && loc.longitude && loc.profiles
  );

  return validLocations;
};

export const subscribeToFriendsLocations = async (session, callback) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', session.user.id)
    .eq('status', 'accepted');

  if (friendshipsError) throw friendshipsError;

  const friendIds = friendships.map(f => f.friend_id);

  return supabase
    .channel('friends_locations')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_locations',
      filter: `user_id=in.(${friendIds.join(',')})`,
    }, payload => {
      console.log('Friend location update payload:', payload);
      callback(payload);
    })
    .subscribe();
};

// Add this function to your existing supabaseClient.js file

export const subscribeToProfileChanges = (session, callback) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  return supabase
    .channel('public:profiles')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'profiles',
    }, payload => {
      callback(payload);
    })
    .subscribe();
};

// Use updateWatchState consistently
export const updateWatchState = async (userId, isWatching) => {
  console.log(`Attempting to update watch state for user ${userId} to ${isWatching}`);
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ watch_state: isWatching })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    console.log('Updated watch state:', data);
    return data;
  } catch (error) {
    console.error('Error updating watch state:', error);
    return null;
  }
};

// Keep other functions as they are
export const subscribeToWatchStateChanges = (callback) => {
  return supabase
    .channel('public:profiles')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: 'watch_state=eq.true OR watch_state=eq.false',
    }, payload => {
      console.log('Received watch state update:', payload.new);
      callback(payload.new);
    })
    .subscribe();
};

export const getInitialProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url, watch_state, email');
  
  if (error) {
    console.error('Error fetching initial profiles:', error);
    throw error;
  }
  return data;
};

export const deleteFriendship = async (session, friendId) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${session.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${session.user.id})`)
    .eq('status', 'accepted');

  if (error) throw error;
  return data;
};

export const updateUserBatteryLevel = async (session, batteryLevel, isCharging) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  console.log('Updating battery level in Supabase:', batteryLevel, 'Charging:', isCharging);

  const { data, error } = await supabase
    .from('user_locations')
    .update({ battery_level: batteryLevel, is_charging: isCharging })
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error updating battery info in user_locations:', error);
    throw error;
  }

  console.log('Battery info updated successfully in Supabase:', { batteryLevel, isCharging });
  return { batteryLevel, isCharging };
};

export const getFriendsBatteryLevels = async (session) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', session.user.id)
    .eq('status', 'accepted');

  if (friendshipsError) throw friendshipsError;

  const friendIds = friendships.map(f => f.friend_id);

  const { data, error } = await supabase
    .from('user_locations')
    .select('user_id, battery_level')
    .in('user_id', friendIds);

  if (error) {
    console.error('Error fetching friends battery levels:', error);
    throw error;
  }

  return data;
};

export const subscribeToBatteryLevelChanges = (session, callback) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  return supabase
    .channel('battery_level_changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_locations',
      filter: `battery_level=is.not.null`,
    }, payload => {
      console.log('Received battery level update:', payload.new);
      callback(payload.new);
    })
    .subscribe();
};

export const requestAudioAccess = async (friendId) => {
  const { data, error } = await supabase
    .from('audio_access_requests')
    .insert({ requester_id: supabase.auth.user().id, target_id: friendId });
  if (error) throw error;
  return data;
};

export const grantAudioAccess = async (requestId) => {
  const { data, error } = await supabase
    .from('audio_access_requests')
    .update({ status: 'granted' })
    .eq('id', requestId);
  if (error) throw error;
  return data;
};

export const revokeAudioAccess = async (friendId) => {
  const { data, error } = await supabase
    .from('audio_access_requests')
    .update({ status: 'revoked' })
    .eq('requester_id', friendId)
    .eq('target_id', supabase.auth.user().id);
  if (error) throw error;
  return data;
};