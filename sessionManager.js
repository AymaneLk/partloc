import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getInitialSession = async () => {
  try {
    const storedSession = await AsyncStorage.getItem('userSession');
    if (storedSession) {
      const session = JSON.parse(storedSession);
      // Check if the session is still valid
      const { data, error } = await supabase.auth.getUser(session.access_token);
      if (error) throw error;
      return session;
    }
    return null;
  } catch (error) {
    console.error('Error fetching initial session:', error);
    return null;
  }
};

export const setupSessionListener = (setSession) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      await AsyncStorage.setItem('userSession', JSON.stringify(session));
      setSession(session);
    } else if (event === 'SIGNED_OUT') {
      await AsyncStorage.removeItem('userSession');
      setSession(null);
    }
  });
};

export const signOut = async () => {
  try {
    await AsyncStorage.removeItem('userSession');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
  return data.session;
};