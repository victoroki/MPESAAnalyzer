import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {PieChart} from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';

const DashboardScreen = ({transactions}) => {
  const calculateStats = () => {
    let totalSpent = 0;
    let totalReceived = 0;
    let categorySpending = {};

    transactions.forEach(t => {
      if (t.type === 'sent' || t.type === 'payment' || t.type === 'withdrawal') {
        totalSpent += t.amount;
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      }
      if (t.type === 'received') {
        totalReceived += t.amount;
      }
    });

    return {totalSpent, totalReceived, categorySpending, balance: totalReceived - totalSpent};
  };

  const stats = calculateStats();

  const pieData = Object.entries(stats.categorySpending).map(([name, amount], i) => ({
    name,
    amount,
    color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384'][i % 7],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Back! 👋</Text>
        <Text style={styles.headerSubtitle}>Here's your financial overview</Text>
      </LinearGradient>

      <View style={styles.cardsContainer}>
        <View style={[styles.card, styles.balanceCard]}>
          <Text style={styles.cardLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            KSh {stats.balance.toLocaleString('en-KE', {minimumFractionDigits: 2})}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.smallCard, styles.incomeCard]}>
            <Text style={styles.cardIcon}>📈</Text>
            <Text style={styles.cardLabel}>Received</Text>
            <Text style={styles.cardAmount}>
              KSh {stats.totalReceived.toLocaleString('en-KE', {minimumFractionDigits: 2})}
            </Text>
          </View>

          <View style={[styles.card, styles.smallCard, styles.expenseCard]}>
            <Text style={styles.cardIcon}>📉</Text>
            <Text style={styles.cardLabel}>Spent</Text>
            <Text style={styles.cardAmount}>
              KSh {stats.totalSpent.toLocaleString('en-KE', {minimumFractionDigits: 2})}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {pieData.length > 0 ? (
          <PieChart
            data={pieData}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        ) : (
          <Text style={styles.noData}>No transactions yet</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Total Transactions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {transactions.filter(t => t.type === 'payment').length}
            </Text>
            <Text style={styles.statLabel}>Payments Made</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {transactions.filter(t => t.type === 'received').length}
            </Text>
            <Text style={styles.statLabel}>Money Received</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Object.keys(stats.categorySpending).length}
            </Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  cardsContainer: {
    padding: 20,
    marginTop: -20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceCard: {
    backgroundColor: '#1F2937',
  },
  cardLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    flex: 1,
    marginRight: 8,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  expenseCard: {
    marginRight: 0,
    marginLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  noData: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 40,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default DashboardScreen;