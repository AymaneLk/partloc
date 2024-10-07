import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

function Sidebar() {
  // Mock user data (replace with real data from your backend)
  const users = [
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' },
    { id: 3, name: 'User 3' },
  ];

  return (
    <View style={styles.sidebarContainer}>
      <Text style={styles.heading}>Users</Text>
      <ScrollView>
        {users.map((user) => (
          <View key={user.id} style={styles.userItem}>
            <Text>{user.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 300,
    backgroundColor: '#f0f0f0',
    padding: 20,
    flex: 1,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // Required for shadow on Android
  },
});

export default Sidebar;
