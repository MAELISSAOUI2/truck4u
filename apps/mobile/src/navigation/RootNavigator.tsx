import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@truck4u/logic';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Customer Screens
import CustomerNavigator from './CustomerNavigator';

// Driver Screens
import DriverNavigator from './DriverNavigator';

export type RootStackParamList = {
  Login: undefined;
  Register: { userType?: 'customer' | 'driver' };
  CustomerApp: undefined;
  DriverApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Navigator
 * Handles authentication and role-based navigation
 */
export default function RootNavigator() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Show authentication flow
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  // Show role-specific app
  if (user?.userType === 'driver') {
    return <DriverNavigator />;
  }

  return <CustomerNavigator />;
}
