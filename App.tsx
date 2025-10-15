import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  View,
  Text,
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
  type: 'sent' | 'received' | 'payment' | 'withdrawal' | 'airtime' | 'unknown';
  amount: number;
  recipient: string;
  sender: string;
  balance: number;
  transactionCode: string;
  date: string;
  rawMessage: string;
  category: string;
  phoneNumber?: string;
}

interface SMSMessage {
  _id: string;
  body: string;
  date: string;
  address: string;
}

// Custom Icon Components using SVG-like styling
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.homeIcon, { borderColor: color, borderWidth: 2.5 }]} />
    <View style={[styles.homeIconRoof, { borderTopColor: color, borderTopWidth: 2.5 }]} />
  </View>
);

const ListIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.listLine, { backgroundColor: color, width: size * 0.7 }]} />
    <View style={[styles.listLine, { backgroundColor: color, width: size * 0.7 }]} />
    <View style={[styles.listLine, { backgroundColor: color, width: size * 0.7 }]} />
  </View>
);

const ChartIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.chartBar, { backgroundColor: color, height: size * 0.4 }]} />
    <View style={[styles.chartBar, { backgroundColor: color, height: size * 0.7 }]} />
    <View style={[styles.chartBar, { backgroundColor: color, height: size * 0.5 }]} />
  </View>
);

const BulbIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.bulb, { 
      borderColor: color, 
      borderWidth: 2.5,
      width: size * 0.6,
      height: size * 0.6 
    }]} />
    <View style={[styles.bulbBase, { backgroundColor: color, width: size * 0.3 }]} />
  </View>
);

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
        maxCount: 5000,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.log('Failed to load SMS:', fail);
        },
        (count: number, smsList: string) => {
          const messages: SMSMessage[] = JSON.parse(smsList);

          const mpesaMessages = messages.filter(
            msg =>
              msg.address &&
              (msg.address.toUpperCase().includes('MPESA') ||
                msg.address.includes('M-PESA'))
          );

          console.log(`Found ${mpesaMessages.length} MPESA messages`);

          const parsedTransactions = mpesaMessages
            .map(msg => parseMPESAMessage(msg))
            .filter((t): t is Transaction => t !== null)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          console.log(`Parsed ${parsedTransactions.length} transactions`);

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
    let phoneNumber = '';

    const codePattern = /^([A-Z0-9]{10})\s+Confirmed/i;
    const codeMatch = text.match(codePattern);
    if (codeMatch) {
      transactionCode = codeMatch[1];
    }

    const balancePattern = /New M-PESA balance is Ksh([\d,]+\.\d{2})/i;
    const balanceMatch = text.match(balancePattern);
    if (balanceMatch) {
      balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
    }

    const receivedPattern = /You have received Ksh([\d,]+\.\d{2}) from (.+?)(?:\s+\*+\s+)?(\d{10}|\d{4}\*+\d+)?\s+on/i;
    const receivedMatch = text.match(receivedPattern);

    if (receivedMatch) {
      type = 'received';
      amount = parseFloat(receivedMatch[1].replace(/,/g, ''));
      sender = receivedMatch[2].trim();
      phoneNumber = receivedMatch[3] || '';
      
      return {
        id: sms._id,
        type,
        amount,
        recipient: '',
        sender,
        balance,
        transactionCode,
        date: date.toISOString(),
        rawMessage: text,
        category: 'Income',
        phoneNumber,
      };
    }

    const sentPattern = /Ksh([\d,]+\.\d{2}) sent to (.+?)(?:\s+)?(\d{10})?\s+on/i;
    const sentMatch = text.match(sentPattern);

    if (sentMatch) {
      type = 'sent';
      amount = parseFloat(sentMatch[1].replace(/,/g, ''));
      recipient = sentMatch[2].trim();
      phoneNumber = sentMatch[3] || '';
      
      return {
        id: sms._id,
        type,
        amount,
        recipient,
        sender: '',
        balance,
        transactionCode,
        date: date.toISOString(),
        rawMessage: text,
        category: categorizeTransaction(type, recipient, phoneNumber),
        phoneNumber,
      };
    }

    const paidPattern = /Ksh([\d,]+\.\d{2}) paid to (.+?)\.?(?:\s+on|\s+New)/i;
    const paidMatch = text.match(paidPattern);

    if (paidMatch) {
      type = 'payment';
      amount = parseFloat(paidMatch[1].replace(/,/g, ''));
      recipient = paidMatch[2].trim();
      
      return {
        id: sms._id,
        type,
        amount,
        recipient,
        sender: '',
        balance,
        transactionCode,
        date: date.toISOString(),
        rawMessage: text,
        category: categorizeTransaction(type, recipient, ''),
        phoneNumber: '',
      };
    }

    const withdrawPattern = /Ksh([\d,]+\.\d{2}) withdrawn from (.+?)\.?(?:\s+on|\s+New)/i;
    const withdrawMatch = text.match(withdrawPattern);

    if (withdrawMatch) {
      type = 'withdrawal';
      amount = parseFloat(withdrawMatch[1].replace(/,/g, ''));
      recipient = withdrawMatch[2].trim();
      
      return {
        id: sms._id,
        type,
        amount,
        recipient,
        sender: '',
        balance,
        transactionCode,
        date: date.toISOString(),
        rawMessage: text,
        category: 'Cash Withdrawal',
        phoneNumber: '',
      };
    }

    const airtimePattern = /Ksh([\d,]+\.\d{2}) (worth of airtime|airtime|bought airtime|for airtime)/i;
    const airtimeMatch = text.match(airtimePattern);

    if (airtimeMatch) {
      type = 'airtime';
      amount = parseFloat(airtimeMatch[1].replace(/,/g, ''));
      
      return {
        id: sms._id,
        type,
        amount,
        recipient: 'Airtime',
        sender: '',
        balance,
        transactionCode,
        date: date.toISOString(),
        rawMessage: text,
        category: 'Airtime',
        phoneNumber: '',
      };
    }

    if (transactionCode) {
      console.log('Could not parse transaction:', text.substring(0, 100));
    }

    return null;
  };

  const categorizeTransaction = (
    type: string,
    name: string,
    phone: string
  ): string => {
    if (type === 'received') return 'Income';
    if (type === 'withdrawal') return 'Cash Withdrawal';
    if (type === 'airtime') return 'Airtime';

    const lower = name.toLowerCase();

    if (
      lower.includes('shop') ||
      lower.includes('store') ||
      lower.includes('supermarket') ||
      lower.includes('carrefour') ||
      lower.includes('naivas') ||
      lower.includes('quickmart') ||
      lower.includes('tuskys')
    )
      return 'Shopping';

    if (
      lower.includes('restaurant') ||
      lower.includes('food') ||
      lower.includes('cafe') ||
      lower.includes('kfc') ||
      lower.includes('java') ||
      lower.includes('pizza') ||
      lower.includes('hotel') ||
      lower.includes('eatery')
    )
      return 'Food & Dining';

    if (
      lower.includes('fuel') ||
      lower.includes('petrol') ||
      lower.includes('gas') ||
      lower.includes('uber') ||
      lower.includes('bolt') ||
      lower.includes('matatu') ||
      lower.includes('bus') ||
      lower.includes('taxi')
    )
      return 'Transport';

    if (
      lower.includes('hospital') ||
      lower.includes('clinic') ||
      lower.includes('pharmacy') ||
      lower.includes('medical') ||
      lower.includes('doctor') ||
      lower.includes('health')
    )
      return 'Health';

    if (
      lower.includes('kplc') ||
      lower.includes('electric') ||
      lower.includes('water') ||
      lower.includes('rent') ||
      lower.includes('nairobi water') ||
      lower.includes('gotv') ||
      lower.includes('dstv') ||
      lower.includes('zuku') ||
      lower.includes('startimes')
    )
      return 'Bills & Utilities';

    if (
      lower.includes('school') ||
      lower.includes('college') ||
      lower.includes('university') ||
      lower.includes('tuition') ||
      lower.includes('education')
    )
      return 'Education';

    if (
      lower.includes('safaricom') ||
      lower.includes('airtel') ||
      lower.includes('telkom')
    )
      return 'Airtime';

    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/i.test(name.trim())) {
      return 'Personal Transfer';
    }

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
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#10B981',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
            headerStyle: styles.header,
            headerTintColor: '#fff',
            headerTitleStyle: styles.headerTitle,
          }}>
          <Tab.Screen 
            name="Dashboard" 
            options={{ 
              tabBarLabel: 'Home',
              tabBarIcon: ({ color, size }) => (
                <HomeIcon color={color} size={size} />
              ),
            }}>
            {props => <DashboardScreen {...props} transactions={transactions} />}
          </Tab.Screen>
          <Tab.Screen
            name="Transactions"
            options={{ 
              tabBarLabel: 'History',
              tabBarIcon: ({ color, size }) => (
                <ListIcon color={color} size={size} />
              ),
            }}>
            {props => (
              <TransactionsScreen {...props} transactions={transactions} />
            )}
          </Tab.Screen>
          <Tab.Screen 
            name="Analytics" 
            options={{ 
              tabBarLabel: 'Analytics',
              tabBarIcon: ({ color, size }) => (
                <ChartIcon color={color} size={size} />
              ),
            }}>
            {props => <AnalyticsScreen {...props} transactions={transactions} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Insights" 
            options={{ 
              tabBarLabel: 'Insights',
              tabBarIcon: ({ color, size }) => (
                <BulbIcon color={color} size={size} />
              ),
            }}>
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
    height: 65,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  header: {
    backgroundColor: '#10B981',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  // Custom Icon Styles
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Home Icon
  homeIcon: {
    width: '70%',
    height: '50%',
    borderBottomWidth: 0,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    position: 'absolute',
    bottom: 2,
  },
  homeIconRoof: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 0,
  },
  // List Icon
  listLine: {
    height: 2.5,
    borderRadius: 2,
    marginVertical: 2,
  },
  // Chart Icon
  chartBar: {
    width: 5,
    borderRadius: 2,
    marginHorizontal: 1.5,
    alignSelf: 'flex-end',
  },
  // Bulb Icon
  bulb: {
    borderRadius: 100,
    position: 'absolute',
    top: 0,
  },
  bulbBase: {
    height: 6,
    borderRadius: 1,
    position: 'absolute',
    bottom: 2,
  },
});

export default App;