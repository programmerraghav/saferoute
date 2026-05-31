/**
 * mobile-app/App.js — SafeRoute Mobile App Root
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';

// Configure notification handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

export default function App() {
  useEffect(() => {
    // Request notification permissions on startup
    Notifications.requestPermissionsAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#0a0e1a" />
      <AppNavigator />
    </>
  );
}
