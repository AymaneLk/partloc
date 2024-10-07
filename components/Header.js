import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

function Header() {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.logo}>Partloc</Text>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navLink}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.navLink}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2c3e50',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  nav: {
    flexDirection: 'row',
  },
  navButton: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: '#34495e',
    borderRadius: 20,
  },
  navLink: {
    color: '#ecf0f1',
    fontSize: 16,
  },
});

export default Header;
