import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomePage from './components/Welcome';
import Login from './components/Login';
import SignUp from './components/SignUp';
import MapComponent from './components/Map';
import Settings from './components/Settings';
import Profile from './components/Profile';
import { View, Text, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import FriendsList from './components/FriendsList';
import AddFriend from './components/AddFriend';
import FriendRequests from './components/FriendRequests';
import { getInitialSession, setupSessionListener, refreshSession } from './sessionManager';
import { colors } from './theme';
import { supabase, updateWatchState } from './supabaseClient';
import { AppState } from 'react-native';

const Stack = createNativeStackNavigator();

function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const handleAppStateChange = useCallback(async (nextAppState) => {
    console.log('App state changed:', nextAppState);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (nextAppState === 'active') {
        const result = await updateWatchState(user.id, true);
        if (!result) {
          console.log('Failed to update watch state to true');
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        const result = await updateWatchState(user.id, false);
        if (!result) {
          console.log('Failed to update watch state to false');
        }
      }
    } else {
      console.log('User is not authenticated, skipping watch state update');
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set initial watch state to true when the app is opened
    if (session && session.user) {
      updateWatchState(session.user.id, true).then(result => {
        if (!result) {
          console.log('Failed to set initial watch state to true');
        }
      });
    }

    return () => {
      subscription.remove();
      // Set watch state to false when the app is closed
      if (session && session.user) {
        updateWatchState(session.user.id, false).then(result => {
          if (!result) {
            console.log('Failed to set final watch state to false');
          }
        });
      }
    };
  }, [handleAppStateChange, session]);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          'ClashGrotesk-Bold': require('./Fonts/OTF/ClashGrotesk-Bold.otf'),
          'ClashGrotesk-Medium': require('./Fonts/OTF/ClashGrotesk-Medium.otf'),
          'ClashGrotesk-Semibold': require('./Fonts/OTF/ClashGrotesk-Semibold.otf'),
          'ClashGrotesk-Regular': require('./Fonts/OTF/ClashGrotesk-Regular.otf'),
        });
        setFontsLoaded(true);

        const initialSession = await getInitialSession();
        console.log('Initial session:', initialSession);
        setSession(initialSession);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsLoading(false);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession);
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (session) {
        try {
          const newSession = await refreshSession();
          if (newSession) {
            setSession(newSession);
          } else {
            console.log('Session refresh returned null, signing out');
            await supabase.auth.signOut();
            setSession(null);
          }
        } catch (error) {
          console.error('Error refreshing session:', error);
          if (error.message.includes('Invalid Refresh Token')) {
            console.log('Invalid refresh token, signing out');
            await supabase.auth.signOut();
            setSession(null);
          }
        }
      }
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [session]);

  const reloadSession = async () => {
    const newSession = await refreshSession();
    if (newSession) {
      setSession(newSession);
    }
  };

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 10, color: colors.text.primary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && session.user ? (
          <>
            <Stack.Screen name="Map">
              {(props) => <MapComponent {...props} session={session} reloadSession={reloadSession} />}
            </Stack.Screen>
            <Stack.Screen name="Settings">
              {(props) => <Settings {...props} session={session} />}
            </Stack.Screen>
            <Stack.Screen name="Profile">
              {(props) => <Profile {...props} session={session} />}
            </Stack.Screen>
            <Stack.Screen name="FriendsList">
              {(props) => <FriendsList {...props} session={session} />}
            </Stack.Screen>
            <Stack.Screen name="AddFriend">
              {(props) => <AddFriend {...props} session={session} reloadSession={reloadSession} />}
            </Stack.Screen>
            <Stack.Screen name="FriendRequests">
              {(props) => <FriendRequests {...props} session={session} reloadSession={reloadSession} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomePage} />
            <Stack.Screen name="Login">
              {(props) => <Login {...props} setSession={setSession} />}
            </Stack.Screen>
            <Stack.Screen name="SignUp" component={SignUp} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;