import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { colors } from '../theme';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function WelcomePage() {
  const navigation = useNavigation();

  const handleStart = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Video
        source={require('../assets/maps_pro.mp4')}
        style={styles.backgroundVideo}
        resizeMode="cover"
        shouldPlay
        isLooping
        isMuted
      />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.locateText}>locate</Text>
            <Text style={styles.itText}>It</Text>
          </View>
          <Text style={styles.subtitle}>Stay Connected, Stay Safe.</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width,
    height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)', // Semi-transparent black overlay
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
  },
  locateText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'ClashGrotesk-Bold',
  },
  itText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.accent,
    fontFamily: 'ClashGrotesk-Bold',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginTop: 10,
    fontFamily: 'ClashGrotesk-Medium',
  },
  startButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'ClashGrotesk-Semibold',
  },
});
