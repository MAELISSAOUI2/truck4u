import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@truck4u/logic';
import { Button } from '@truck4u/ui';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.phone}>{user?.phone}</Text>
      <Button title="Logout" onPress={logout} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  name: { fontSize: 20, marginTop: 20 },
  phone: { fontSize: 16, color: '#666', marginBottom: 30 },
  button: { marginTop: 20 }
});
