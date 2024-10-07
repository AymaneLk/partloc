import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Check your .env file.');
}

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

  return data.map(friendship => 
    friendship.user.user_id === session.user.id ? friendship.friend : friendship.user
  );
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

// Add these functions to your existing supabaseClient.js file

export const updateUserLocation = async (session, latitude, longitude) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_locations')
    .upsert({
      user_id: session.user.id,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      is_sharing: true
    }, {
      onConflict: 'user_id',
      returning: 'minimal'
    });

  if (error) throw error;
  return data;
};

export const getFriendsLocations = async (session) => {
  if (!session || !session.user) throw new Error('Not authenticated');

  // Get all friendships where the current user is either user_id or friend_id
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
    .eq('status', 'accepted');

  if (friendshipsError) throw friendshipsError;

  // Extract all friend IDs (both from user_id and friend_id)
  const friendIds = friendships.reduce((ids, friendship) => {
    if (friendship.user_id !== session.user.id) ids.push(friendship.user_id);
    if (friendship.friend_id !== session.user.id) ids.push(friendship.friend_id);
    return ids;
  }, []);

  // Get locations for all friends
  const { data: locations, error: locationsError } = await supabase
    .from('user_locations')
    .select(`
      user_id,
      latitude,
      longitude,
      timestamp,
      is_sharing,
      profiles:profiles!inner(user_id, full_name)
    `)
    .in('user_id', friendIds)
    .order('timestamp', { ascending: false });

  if (locationsError) throw locationsError;

  // Filter out any null locations and ensure all required fields are present
  const validLocations = locations.filter(loc => 
    loc && loc.latitude && loc.longitude && loc.profiles && loc.profiles.full_name
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
      filter: `user_id=in.(${friendIds.join(',')})`
    }, payload => {
      callback(payload);
    })
    .subscribe();
};