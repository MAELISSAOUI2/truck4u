import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Driver Screens
import DashboardScreen from '../screens/driver/DashboardScreen';
import AvailableRidesScreen from '../screens/driver/AvailableRidesScreen';
import ActiveRideScreen from '../screens/driver/ActiveRideScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';

export type DriverTabParamList = {
  Dashboard: undefined;
  Available: undefined;
  Active: undefined;
  Earnings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();

/**
 * Driver Bottom Tab Navigator
 * Main navigation for driver role
 */
export default function DriverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'speedometer';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Available') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Active') {
            iconName = focused ? 'navigate' : 'navigate-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: 'gray',
        headerShown: true
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Available"
        component={AvailableRidesScreen}
        options={{ title: 'Available Rides' }}
      />
      <Tab.Screen
        name="Active"
        component={ActiveRideScreen}
        options={{ title: 'Active Ride' }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ title: 'Earnings' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
