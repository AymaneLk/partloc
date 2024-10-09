import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const Login = ({ setSession }) => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      if (data.session) {
        setSession(data.session);
        navigation.navigate('Map');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Log in to continue with locateIt</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.secondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.secondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginButtonText}>{loading ? 'Loading...' : 'Log In'}</Text>
        </TouchableOpacity>
        <Text style={styles.orText}>OR</Text>
        <TouchableOpacity style={styles.signUpButton} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  content: {
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.05,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  appName: {
    fontFamily: 'ClashGrotesk-Bold',
    fontSize: 32,
    color: colors.primary,
  },
  welcomeText: {
    fontFamily: 'ClashGrotesk-Bold',
    fontSize: 36,
    color: colors.error,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'ClashGrotesk-Medium',
    fontSize: 18,
    color: colors.secondary,
    marginBottom: height * 0.05,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Regular',
    color: colors.text.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.error,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Semibold',
  },
  orText: {
    fontFamily: 'ClashGrotesk-Medium',
    fontSize: 16,
    color: colors.secondary,
  },
  signUpButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.background,
    borderRadius: 30,
    marginTop: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.error,
    borderWidth: 2,
  },
  signUpButtonText: {
    color: colors.error,
    fontSize: 16,
    fontFamily: 'ClashGrotesk-Semibold',
  },
});

export default Login;
