import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLoading } from '../contexts/LoadingContext';
import useSMSReader from '../hooks/useSMSReader';
import DateRangePicker from '../components/DateRangePicker';

const SMSReaderDemo = () => {
  const { showLoading, hideLoading } = useLoading();
  const { transactions, readSMSMessages, error } = useSMSReader();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());

  const handleReadSMS = async () => {
    showLoading('Reading your M-Pesa transactions...');
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(() => resolve(null), 3000));
    await readSMSMessages();
  };

  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Calculate spending within the selected date range
  const calculateSpendingInRange = () => {
    return transactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      })
      .filter(transaction => 
        transaction.type === 'sent' || 
        transaction.type === 'payment' || 
        transaction.type === 'withdrawal'
      )
      .reduce((total, transaction) => total + transaction.amount, 0);
  };

  const spendingInRange = calculateSpendingInRange();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>M-Pesa Transaction Reader</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleReadSMS}>
        <Text style={styles.buttonText}>Read M-Pesa Transactions</Text>
      </TouchableOpacity>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <DateRangePicker 
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
      />
      
      <View style={styles.spendingCard}>
        <Text style={styles.spendingTitle}>Spending in Selected Range</Text>
        <Text style={styles.spendingAmount}>KSh {spendingInRange.toLocaleString('en-KE')}</Text>
        <Text style={styles.spendingPeriod}>
          {startDate.toLocaleDateString('en-US')} - {endDate.toLocaleDateString('en-US')}
        </Text>
      </View>
      
      {transactions.length > 0 && (
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.map(transaction => (
            <View key={transaction.id} style={styles.transactionItem}>
              <Text style={styles.transactionType}>{transaction.type}</Text>
              <Text style={styles.transactionAmount}>KSh {transaction.amount}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.date).toLocaleDateString('en-US')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  spendingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spendingTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  spendingAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 10,
  },
  spendingPeriod: {
    fontSize: 14,
    color: '#999',
  },
  transactionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionType: {
    fontSize: 14,
    color: '#333',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default SMSReaderDemo;