import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme';

const FloatingMenu = ({ onProfilePress }) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuItemStyle = (position) => {
    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, position === 'top' ? -130 : position === 'left' ? -65 : -65],
    });

    const translateX = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, position === 'left' ? -112 : position === 'right' ? 112 : 0],
    });

    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    const opacity = animation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    });

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
    };
  };

  const renderMenuItem = (icon, text, onPress, position) => (
    <Animated.View key={text} style={[styles.menuItem, menuItemStyle(position)]}>
      <TouchableOpacity style={styles.menuItemButton} onPress={onPress}>
        <Icon name={icon} size={24} color={colors.text.primary} />
        <Text style={styles.menuItemText}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {renderMenuItem('person', 'Profile', onProfilePress, 'top')}
      {renderMenuItem('people', 'Circle', () => console.log('Circle pressed'), 'left')}
      {renderMenuItem('notifications', 'Notifications', () => console.log('Notifications pressed'), 'right')}

      <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon name="add" size={30} color={colors.text.primary} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  menuButton: {
    backgroundColor: colors.accent,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2,
  },
  menuItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemButton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItemText: {
    color: colors.text.primary,
    fontSize: 14,
    marginLeft: 8,
  },
});

export default FloatingMenu;
