import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RidesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Rides</Text>
      <Text style={styles.note}>Ride history and active rides will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  note: { fontSize: 16, color: '#666', textAlign: 'center' }
});
