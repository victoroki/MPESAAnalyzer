import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar, Alert, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutDashboard, BarChart3, List, Lightbulb, Sparkles } from 'lucide-react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen';

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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 15,
            paddingTop: 10,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            position: 'absolute',
          },
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 4,
            letterSpacing: 0.5,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused && styles.activeTabIcon}>
                <LayoutDashboard color={color} size={22} />
              </View>
            ),
            tabBarLabel: 'Home',
          }}
        >
          {() => <DashboardScreen transactions={transactions} onRefresh={readSMSMessages} />}
        </Tab.Screen>

        <Tab.Screen
          name="Analytics"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused && styles.activeTabIcon}>
                <BarChart3 color={color} size={22} />
              </View>
            ),
            tabBarLabel: 'Analysis',
          }}
        >
          {() => <AnalyticsScreen transactions={transactions} />}
        </Tab.Screen>

        <Tab.Screen
          name="Transactions"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused && styles.activeTabIcon}>
                <List color={color} size={22} />
              </View>
            ),
            tabBarLabel: 'History',
          }}
        >
          {() => <TransactionsScreen transactions={transactions} />}
        </Tab.Screen>

        <Tab.Screen
          name="AI Assistant"
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused && styles.activeTabIcon}>
                <Sparkles color={color} size={22} />
              </View>
            ),
            tabBarLabel: 'AI Assistant',
          }}
        >
          {() => <AIAssistantScreen />}
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

const styles = StyleSheet.create({
  activeTabIcon: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
});

export default App;
