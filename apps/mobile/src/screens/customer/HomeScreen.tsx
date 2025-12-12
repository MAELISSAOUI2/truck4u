import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@truck4u/ui';

/**
 * Customer Home Screen
 * Main screen for creating new ride requests
 * TODO: Integrate with map, address picker, and pricing estimation
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request a Ride</Text>
      <Text style={styles.subtitle}>
        Find nearby drivers for your transport needs
      </Text>

      {/* TODO: Add map view */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📍 Map View</Text>
        <Text style={styles.note}>
          Will integrate React Native Maps for pickup/dropoff selection
        </Text>
      </View>

      {/* TODO: Add address inputs */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📍 Address Selection</Text>
        <Text style={styles.note}>
          Pickup and dropoff address autocomplete
        </Text>
      </View>

      <Button
        title="Request Ride"
        onPress={() => console.log('Navigate to ride details')}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center'
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  button: {
    marginTop: 'auto'
  }
});
