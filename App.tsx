import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LoadingProvider } from './src/contexts/LoadingContext';

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

interface Props {
  transactions: Transaction[];
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
}

const { width } = Dimensions.get('window');

// Simple arrow icons
const ChevronLeft = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRight = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DashboardScreen: React.FC<Props> = ({ transactions, selectedMonth, setSelectedMonth }) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transDate = new Date(t.date);
      return (
        transDate.getMonth() === selectedMonth.getMonth() &&
        transDate.getFullYear() === selectedMonth.getFullYear()
      );
    });
  }, [transactions, selectedMonth]);

  // Calculate accurate totals
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let transactionCount = 0;

    monthTransactions.forEach(t => {
      transactionCount++;
      if (t.type === 'received') {
        totalIncome += t.amount;
      } else if (['sent', 'payment', 'withdrawal', 'airtime'].includes(t.type)) {
        totalExpenses += t.amount;
      }
    });

    const netBalance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      transactionCount,
    };
  }, [monthTransactions]);

  // Get category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: { [key: string]: number } = {};
    
    monthTransactions.forEach(t => {
      if (t.type !== 'received') {
        const category = t.category || 'Other';
        breakdown[category] = (breakdown[category] || 0) + t.amount;
      }
    });

    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [monthTransactions]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return monthTransactions.slice(0, 5);
  }, [monthTransactions]);

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const goToNextMonth = () => {
    const currentDate = new Date();
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Don't allow going beyond current month
    if (nextMonth <= currentDate) {
      setSelectedMonth(nextMonth);
    }
  };

  const isCurrentMonth = () => {
    const current = new Date();
    return (
      selectedMonth.getMonth() === current.getMonth() &&
      selectedMonth.getFullYear() === current.getFullYear()
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Shopping': '#F59E0B',
      'Food & Dining': '#EF4444',
      'Transport': '#3B82F6',
      'Health': '#10B981',
      'Bills & Utilities': '#8B5CF6',
      'Education': '#EC4899',
      'Airtime': '#06B6D4',
      'Cash Withdrawal': '#6B7280',
      'Personal Transfer': '#14B8A6',
      'Other': '#94A3B8',
    };
    return colors[category] || '#94A3B8';
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Shopping': '🛒',
      'Food & Dining': '🍽️',
      'Transport': '🚗',
      'Health': '⚕️',
      'Bills & Utilities': '💡',
      'Education': '📚',
      'Airtime': '📱',
      'Cash Withdrawal': '💵',
      'Personal Transfer': '👤',
      'Other': '📊',
    };
    return icons[category] || '📊';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity 
          style={styles.monthButton}
          onPress={goToPreviousMonth}
          activeOpacity={0.7}
        >
          <ChevronLeft color="#0EA5E9" />
        </TouchableOpacity>
        
        <View style={styles.monthLabel}>
          <Text style={styles.monthText}>
            {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
          </Text>
          {isCurrentMonth() && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.monthButton, isCurrentMonth() && styles.monthButtonDisabled]}
          onPress={goToNextMonth}
          disabled={isCurrentMonth()}
          activeOpacity={0.7}
        >
          <ChevronRight color={isCurrentMonth() ? '#CBD5E1' : '#0EA5E9'} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(stats.totalIncome)}</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>↑ Received</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(stats.totalExpenses)}</Text>
          <View style={[styles.summaryBadge, styles.expenseBadge]}>
            <Text style={[styles.summaryBadgeText, styles.expenseBadgeText]}>↓ Spent</Text>
          </View>
        </View>
      </View>

      {/* Net Balance */}
      <View style={[
        styles.balanceCard,
        stats.netBalance >= 0 ? styles.positiveBalance : styles.negativeBalance
      ]}>
        <Text style={styles.balanceLabel}>Net Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(stats.netBalance)}</Text>
        <Text style={styles.balanceSubtext}>
          {stats.transactionCount} transaction{stats.transactionCount !== 1 ? 's' : ''} this month
        </Text>
      </View>

      {/* Top Spending Categories */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Spending</Text>
          <View style={styles.categoriesContainer}>
            {categoryBreakdown.map(([category, amount], index) => {
              const percentage = (amount / stats.totalExpenses) * 100;
              return (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryIconContainer}>
                      <Text style={styles.categoryIcon}>{getCategoryIcon(category)}</Text>
                      <Text style={styles.categoryName}>{category}</Text>
                    </View>
                    <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(category)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}% of spending</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.transactionsContainer}>
            {recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: transaction.type === 'received' ? '#DCFCE7' : '#FEE2E2' }
                ]}>
                  <Text style={styles.transactionIconText}>
                    {transaction.type === 'received' ? '↓' : '↑'}
                  </Text>
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionName} numberOfLines={1}>
                    {transaction.type === 'received' 
                      ? transaction.sender 
                      : transaction.recipient}
                  </Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  transaction.type === 'received' ? styles.positiveAmount : styles.negativeAmount
                ]}>
                  {transaction.type === 'received' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {monthTransactions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No transactions found for this month</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  monthButtonDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  currentBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0EA5E9',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  incomeCard: {
    backgroundColor: '#FFFFFF',
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expenseBadge: {
    backgroundColor: '#FEE2E2',
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  expenseBadgeText: {
    color: '#DC2626',
  },
  balanceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 24,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  positiveBalance: {
    backgroundColor: '#10B981',
  },
  negativeBalance: {
    backgroundColor: '#EF4444',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  categoryItem: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  transactionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  positiveAmount: {
    color: '#10B981',
  },
  negativeAmount: {
    color: '#EF4444',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});

const App = () => {
  // For demo purposes, we'll create mock transactions
  // In a real app, these would come from SMS parsing
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'sent' as 'sent',
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
      type: 'received' as 'received',
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

  const [selectedMonth, setSelectedMonth] = useState(new Date());

  return (
    <LoadingProvider>
      <DashboardScreen 
        transactions={mockTransactions}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
      />
    </LoadingProvider>
  );
};

export default App;