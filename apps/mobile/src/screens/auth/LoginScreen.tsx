import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@truck4u/logic';
import { Button, Input } from '@truck4u/ui';

/**
 * Login Screen
 * Handles user authentication for both customers and drivers
 */
export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('+216');
  const [userType, setUserType] = useState<'customer' | 'driver'>('customer');
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (phone.length < 12) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      await login(phone, userType);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please try again');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Truck4u</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      <View style={styles.form}>
        <Input
          label="Phone Number"
          placeholder="+216 XX XXX XXX"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.userTypeButton,
              userType === 'customer' && styles.userTypeButtonActive
            ]}
            onPress={() => setUserType('customer')}
          >
            <Text
              style={[
                styles.userTypeText,
                userType === 'customer' && styles.userTypeTextActive
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.userTypeButton,
              userType === 'driver' && styles.userTypeButtonActive
            ]}
            onPress={() => setUserType('driver')}
          >
            <Text
              style={[
                styles.userTypeText,
                userType === 'driver' && styles.userTypeTextActive
              ]}
            >
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Login"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.loginButton}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('Register', { userType })}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>
            Don't have an account? Register
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 40,
    textAlign: 'center'
  },
  form: {
    width: '100%'
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    gap: 12
  },
  userTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  userTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  userTypeText: {
    fontSize: 16,
    color: '#666'
  },
  userTypeTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  loginButton: {
    marginTop: 20
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center'
  },
  registerText: {
    color: '#007AFF',
    fontSize: 16
  }
});
