import { useState, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
// @ts-ignore
import SmsAndroid from 'react-native-get-sms-android';
import { useLoading } from '../contexts/LoadingContext';

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

const useSMSReader = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();

  const requestSMSPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Permission',
            message: 'This app needs access to your SMS to read M-Pesa transactions',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const parseMPesaMessage = (message: string): Partial<Transaction> | null => {
    // This is a simplified parser - in a real app, you'd have more robust parsing
    const patterns = {
      sent: /You have sent KSh([\d,]+) to (.+?)\. New balance is KSh([\d,]+)/,
      received: /You have received KSh([\d,]+) from (.+?)\. New balance is KSh([\d,]+)/,
      payment: /KSh([\d,]+) paid to (.+?)\. New balance is KSh([\d,]+)/,
      withdrawal: /KSh([\d,]+) withdrawn from (.+?)\. New balance is KSh([\d,]+)/,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: type as any,
          amount: parseFloat(match[1].replace(/,/g, '')),
          recipient: type === 'received' ? '' : match[2],
          sender: type === 'received' ? match[2] : '',
          balance: parseFloat(match[3].replace(/,/g, '')),
        };
      }
    }

    return null;
  };

  const readSMSMessages = async () => {
    showLoading('Reading your M-Pesa transactions...');
    
    try {
      const hasPermission = await requestSMSPermission();
      if (!hasPermission) {
        throw new Error('SMS permission not granted');
      }

      // Simulate processing time for demo
      await new Promise((resolve) => setTimeout(() => resolve(null), 2000));

      // In a real implementation, you would use:
      // SmsAndroid.list(
      //   JSON.stringify({}),
      //   (fail) => {
      //     setError(fail);
      //     hideLoading();
      //   },
      //   (count, smsList) => {
      //     const parsedSmsList = JSON.parse(smsList);
      //     // Process messages and extract transactions
      //     hideLoading();
      //   }
      // );

      // For demo purposes, we'll return mock data
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'sent',
          amount: 500,
          recipient: 'John Doe',
          sender: '',
          balance: 1200,
          transactionCode: 'ABC123',
          date: new Date().toISOString(),
          rawMessage: 'You have sent KSh500 to John Doe. New balance is KSh1200.',
          category: 'Personal Transfer',
        },
        {
          id: '2',
          type: 'received',
          amount: 2000,
          recipient: '',
          sender: 'Jane Smith',
          balance: 3200,
          transactionCode: 'DEF456',
          date: new Date(Date.now() - 86400000).toISOString(),
          rawMessage: 'You have received KSh2000 from Jane Smith. New balance is KSh3200.',
          category: 'Personal Transfer',
        },
      ];

      setTransactions(mockTransactions);
      hideLoading();
      return mockTransactions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      hideLoading();
      return [];
    }
  };

  return {
    transactions,
    error,
    readSMSMessages,
    loading: false, // This would be managed by the LoadingContext
  };
};

export default useSMSReader;