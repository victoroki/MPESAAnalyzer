import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar, Alert, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutDashboard, BarChart3, List, Lightbulb } from 'lucide-react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import InsightsScreen from './src/screens/InsightsScreen';

import { LoadingProvider } from './src/contexts/LoadingContext';
import useSMSReader from './src/hooks/useSMSReader';

const Tab = createBottomTabNavigator();

const AppContent = () => {
  const { transactions, loading, error, readSMSMessages } = useSMSReader();
  const [retryCount, setRetryCount] = useState(0);

  // Initial load
  useEffect(() => {
    readSMSMessages();
  }, [retryCount]);

  // Handle error display
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Error Reading Transactions',
        error.includes('permission') 
          ? 'Please grant SMS permission to read your M-Pesa transactions. You can enable this in Settings > Apps > MPESA Analyzer > Permissions.'
          : error,
        [
          {
            text: 'Retry',
            onPress: () => {
              setRetryCount(prev => prev + 1);
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    }
  }, [error]);

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
            height: 65,
            paddingBottom: 10,
            paddingTop: 10,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
          },
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          options={{
            tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={24} />,
            tabBarLabel: 'Overview',
          }}
        >
          {() => (<DashboardScreen transactions={transactions} onRefresh={readSMSMessages} />)}
        </Tab.Screen>

        <Tab.Screen
          name="Analytics"
          options={{
            tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={24} />,
            tabBarLabel: 'Analytics',
          }}
        >
          {() => (<AnalyticsScreen transactions={transactions} />)}
        </Tab.Screen>

        <Tab.Screen
          name="Transactions"
          options={{
            tabBarIcon: ({ color, size }) => <List color={color} size={24} />,
            tabBarLabel: 'Transactions',
          }}
        >
          {() => (<TransactionsScreen transactions={transactions} />)}
        </Tab.Screen>

        <Tab.Screen
          name="Insights"
          options={{
            tabBarIcon: ({ color, size }) => <Lightbulb color={color} size={24} />,
            tabBarLabel: 'Insights',
          }}
        >
          {() => (<InsightsScreen transactions={transactions} />)}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <LoadingProvider>
        <AppContent />
      </LoadingProvider>
    </SafeAreaProvider>
  );
};

export default App;