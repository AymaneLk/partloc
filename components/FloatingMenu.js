import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';

const FloatingMenu = ({ onProfilePress, onNotificationsPress }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onProfilePress}>
        <Icon name="person" size={24} color={colors.error} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onNotificationsPress}>
        <Icon name="notifications" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default FloatingMenu;
