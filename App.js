import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
import { supabase } from './supabaseClient';

const Stack = createStackNavigator();

function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          'ClashGrotesk-Bold': require('./Fonts/OTF/ClashGrotesk-Bold.otf'),
          'ClashGrotesk-Medium': require('./Fonts/OTF/ClashGrotesk-Medium.otf'),
          'ClashGrotesk-Semibold': require('./Fonts/OTF/ClashGrotesk-Semibold.otf'),
          'ClashGrotesk-Regular': require('./Fonts/OTF/ClashGrotesk-Regular.otf'),
        });
        setFontsLoaded(true);

        // Get initial session
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
        const newSession = await refreshSession();
        if (newSession) {
          setSession(newSession);
        } else {
          setSession(null);
        }
      }
    }, 60000); // Refresh every minute

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
