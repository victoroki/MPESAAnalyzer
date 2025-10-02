import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SmsAndroid from 'react-native-get-sms-android';


interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'payment' | 'withdrawal' | 'unknown';
  amount: number;
  recipient: string;
  sender: string;
  balance: number;
  transactionCode: string;
  date: string;
  rawMessage: string;
  category: string;
}

interface SMSMessage {
  _id: string;
  body: string;
  date: string;
  address: string;
}

const Tab = createBottomTabNavigator();

const App = (): React.JSX.Element => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    requestSMSPermission();
  }, []);

  const requestSMSPermission = async (): Promise<void> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Permission',
            message:
              'This app needs access to your SMS to analyze MPESA transactions',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          loadTransactions();
        } else {
          Alert.alert(
            'Permission Denied',
            'SMS permission is required to analyze transactions',
          );
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const loadTransactions = (): void => {
    if (Platform.OS === 'android') {
      const filter = {
        box: 'inbox',
        indexFrom: 0, 
        maxCount: 1000,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.log('Failed to load SMS:', fail);
        },
        (count: number, smsList: string) => {
          const messages: SMSMessage[] = JSON.parse(smsList);

          const mpesaMessages = messages.filter(
            msg => msg.address && msg.address.toUpperCase().includes('MPESA')
          );

          const parsedTransactions = mpesaMessages
            .map(msg => parseMPESAMessage(msg))
            .filter((t): t is Transaction => t !== null);

          setTransactions(parsedTransactions);
          saveTransactions(parsedTransactions);
        },
      );
    }
  };

  const parseMPESAMessage = (sms: SMSMessage): Transaction | null => {
    const text = sms.body;
    const date = new Date(parseInt(sms.date));

    let type: Transaction['type'] = 'unknown';
    let amount = 0;
    let recipient = '';
    let sender = '';
    let balance = 0;
    let transactionCode = '';

    // Sent money pattern
    const sentPattern = /([A-Z0-9]+) Confirmed\. Ksh([\d,]+\.\d{2}) sent to (.+?) on/i;
    const sentMatch = text.match(sentPattern);

    if (sentMatch) {
      type = 'sent';
      transactionCode = sentMatch[1];
      amount = parseFloat(sentMatch[2].replace(/,/g, ''));
      recipient = sentMatch[3];
    }

    const receivedPattern = /([A-Z0-9]+) Confirmed\. You have received Ksh([\d,]+\.\d{2}) from (.+?) on/i;
    const receivedMatch = text.match(receivedPattern);

    if (receivedMatch) {
      type = 'received';
      transactionCode = receivedMatch[1];
      amount = parseFloat(receivedMatch[2].replace(/,/g, ''));
      sender = receivedMatch[3];
    }

    const paidPattern = /([A-Z0-9]+) Confirmed\. Ksh([\d,]+\.\d{2}) paid to (.+?)\./i;
    const paidMatch = text.match(paidPattern);

    if (paidMatch) {
      type = 'payment';
      transactionCode = paidMatch[1];
      amount = parseFloat(paidMatch[2].replace(/,/g, ''));
      recipient = paidMatch[3];
    }

    const balancePattern = /New M-PESA balance is Ksh([\d,]+\.\d{2})/i;
    const balanceMatch = text.match(balancePattern);

    if (balanceMatch) {
      balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    }

    const withdrawPattern = /([A-Z0-9]+) Confirmed\. Ksh([\d,]+\.\d{2}) withdrawn from/i;
    const withdrawMatch = text.match(withdrawPattern);

    if (withdrawMatch) {
      type = 'withdrawal';
      transactionCode = withdrawMatch[1];
      amount = parseFloat(withdrawMatch[2].replace(/,/g, ''));
    }

    if (type === 'unknown' || amount === 0) return null;

    return {
      id: sms._id,
      type,
      amount,
      recipient,
      sender,
      balance,
      transactionCode,
      date: date.toISOString(),
      rawMessage: text,
      category: categorizeTransaction(type, recipient),
    };
  };

  const categorizeTransaction = (type: string, name: string): string => {
    if (type === 'received') return 'Income';
    if (type === 'withdrawal') return 'Cash';

    const lower = name.toLowerCase();

    if (
      lower.includes('shop') ||
      lower.includes('store') ||
      lower.includes('supermarket')
    )
      return 'Shopping';
    if (
      lower.includes('restaurant') ||
      lower.includes('food') ||
      lower.includes('cafe')
    )
      return 'Food';
    if (
      lower.includes('fuel') ||
      lower.includes('petrol') ||
      lower.includes('gas')
    )
      return 'Transport';
    if (
      lower.includes('hospital') ||
      lower.includes('clinic') ||
      lower.includes('pharmacy')
    )
      return 'Health';
    if (
      lower.includes('electric') ||
      lower.includes('water') ||
      lower.includes('rent')
    )
      return 'Bills';
    if (
      lower.includes('school') ||
      lower.includes('college') ||
      lower.includes('university')
    )
      return 'Education';

    return 'Other';
  };

  const saveTransactions = async (data: Transaction[]): Promise<void> => {
    try {
      await AsyncStorage.setItem('transactions', JSON.stringify(data));
    } catch (e) {
      console.log('Error saving transactions:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#6366F1',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: styles.tabBar,
            headerStyle: { backgroundColor: '#6366F1' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}>
          <Tab.Screen
            name="Dashboard"
            options={{ tabBarLabel: 'Home' }}>
            {props => <DashboardScreen {...props} transactions={transactions} />}
          </Tab.Screen>
          <Tab.Screen
            name="Transactions"
            options={{ tabBarLabel: 'Transactions' }}>
            {props => <TransactionsScreen {...props} transactions={transactions} />}
          </Tab.Screen>
          <Tab.Screen
            name="Analytics"
            options={{ tabBarLabel: 'Analytics' }}>
            {props => <AnalyticsScreen {...props} transactions={transactions} />}
          </Tab.Screen>
          <Tab.Screen
            name="Insights"
            options={{ tabBarLabel: 'Insights' }}>
            {props => <InsightsScreen {...props} transactions={transactions} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
});

export default App;