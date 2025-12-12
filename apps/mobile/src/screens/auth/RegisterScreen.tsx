import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@truck4u/logic';
import { Button, Input } from '@truck4u/ui';

/**
 * Register Screen
 * Handles new user registration for customers and drivers
 */
export default function RegisterScreen({ route, navigation }: any) {
  const { userType = 'customer' } = route.params || {};
  const [phone, setPhone] = useState('+216');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState('CAMIONNETTE');
  const { register, isLoading } = useAuth();

  const handleRegister = async () => {
    if (!name || phone.length < 12) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const data: any = { phone, name };
      if (email) data.email = email;
      if (userType === 'driver') data.vehicleType = vehicleType;

      await register(data, userType);
      navigation.replace('Login');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>
        Register as a {userType === 'driver' ? 'Driver' : 'Customer'}
      </Text>

      <View style={styles.form}>
        <Input
          label="Full Name *"
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Phone Number *"
          placeholder="+216 XX XXX XXX"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Input
          label="Email (Optional)"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {userType === 'driver' && (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              ℹ️ After registration, you'll need to complete KYC verification before accepting rides.
            </Text>
          </View>
        )}

        <Button
          title="Register"
          onPress={handleRegister}
          loading={isLoading}
          style={styles.registerButton}
        />

        <Button
          title="Back to Login"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.backButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center'
  },
  form: {
    width: '100%'
  },
  note: {
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12
  },
  noteText: {
    color: '#0066CC',
    fontSize: 14
  },
  registerButton: {
    marginTop: 20
  },
  backButton: {
    marginTop: 12
  }
});
