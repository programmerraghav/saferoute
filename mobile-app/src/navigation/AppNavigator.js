/**
 * mobile-app/src/navigation/AppNavigator.js
 * Stack + Bottom Tab navigator for SafeRoute mobile app.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen           from '../screens/HomeScreen';
import SOSScreen            from '../screens/SOSScreen';
import ReportPotholeScreen  from '../screens/ReportPotholeScreen';
import SettingsScreen       from '../screens/SettingsScreen';
import LoginScreen          from '../screens/LoginScreen';
import { colors, spacing, radius } from '../constants/theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_SCREENS = [
  { name: 'Home',     component: HomeScreen,    icon: '🏠', label: 'Home'    },
  { name: 'SOS',      component: SOSScreen,     icon: '🚨', label: 'SOS'     },
  { name: 'Report',   component: ReportPotholeScreen, icon: '📷', label: 'Report' },
  { name: 'Settings', component: SettingsScreen,icon: '⚙️', label: 'Settings' },
];

function SOSTabBarButton({ children, onPress }) {
  return (
    <TouchableOpacity
      style={styles.sosFab}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {children}
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   colors.amber,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabel: ({ focused, color }) => {
          const screen = TAB_SCREENS.find(s => s.name === route.name);
          return <Text style={{ fontSize: 10, color, fontWeight: focused ? '700' : '500', marginBottom: 4 }}>{screen?.label}</Text>;
        },
        tabBarIcon: ({ focused }) => {
          const screen = TAB_SCREENS.find(s => s.name === route.name);
          if (route.name === 'SOS') {
            return (
              <View style={{ alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize: 28 }}>🚨</Text>
              </View>
            );
          }
          return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{screen?.icon}</Text>;
        },
      })}
    >
      {TAB_SCREENS.map(screen => (
        <Tab.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={screen.name === 'SOS' ? {
            tabBarButton: (props) => (
              <SOSTabBarButton {...props} />
            ),
          } : {}}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary:    colors.amber,
          background: colors.bgPrimary,
          card:       colors.bgCard,
          text:       colors.textPrimary,
          border:     colors.border,
          notification: colors.red,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main"  component={MainTabs}   />
        {/* Direct SOS access without authentication */}
        <Stack.Screen name="SOS"   component={SOSScreen}  options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor:  colors.bgCard,
    borderTopWidth:   1,
    borderTopColor:   colors.border,
    height:           72,
    paddingBottom:    8,
    paddingTop:       6,
    position:         'absolute',
  },
  sosFab: {
    top:          -18,
    width:        64,
    height:       64,
    borderRadius: 32,
    backgroundColor: colors.red,
    alignItems:   'center',
    justifyContent: 'center',
    shadowColor:  colors.red,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation:    12,
    borderWidth:  3,
    borderColor:  colors.bgPrimary,
  },
});
