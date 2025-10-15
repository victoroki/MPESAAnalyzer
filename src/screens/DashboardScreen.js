import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import {
  getCurrentMonthStats,
  compareWithPreviousMonth,
  formatCurrency,
  getDailyAverage,
  getTopCategories,
  getLastNMonthsStats,
} from '../utils/transactionHelpers';

const DashboardScreen = ({ transactions }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Get current month statistics
  const currentMonthStats = getCurrentMonthStats(transactions);
  const comparison = compareWithPreviousMonth(transactions);
  const topCategories = getTopCategories(currentMonthStats, 5);
  const dailyAverage = getDailyAverage(currentMonthStats);

  // Calculate all-time stats
  const calculateAllTimeStats = () => {
    let totalSpent = 0;
    let totalReceived = 0;
    let categorySpending = {};

    transactions.forEach(t => {
      if (t.type === 'sent' || t.type === 'payment' || t.type === 'withdrawal' || t.type === 'airtime') {
        totalSpent += t.amount;
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      }
      if (t.type === 'received') {
        totalReceived += t.amount;
      }
    });

    return { totalSpent, totalReceived, categorySpending, netBalance: totalReceived - totalSpent };
  };

  const allTimeStats = calculateAllTimeStats();

  // Determine which stats to display
  const displayStats = selectedPeriod === 'month' ? {
    totalSpent: currentMonthStats.totalSpent,
    totalReceived: currentMonthStats.totalReceived,
    categorySpending: currentMonthStats.categoryBreakdown,
    netBalance: currentMonthStats.netFlow,
    transactionCount: currentMonthStats.transactionCount,
  } : {
    totalSpent: allTimeStats.totalSpent,
    totalReceived: allTimeStats.totalReceived,
    categorySpending: allTimeStats.categorySpending,
    netBalance: allTimeStats.netBalance,
    transactionCount: transactions.length,
  };

  // Prepare pie chart data
  const pieData = Object.entries(displayStats.categorySpending)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount], i) => ({
      name,
      amount,
      color: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'][i % 6],
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    }));

  // Get last balance from most recent transaction
  const latestBalance = transactions.length > 0 
    ? transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].balance 
    : 0;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Back! 👋</Text>
        <Text style={styles.headerSubtitle}>
          {selectedPeriod === 'month' 
            ? `${currentMonthStats.monthName} Overview`
            : 'All-Time Overview'}
        </Text>
      </LinearGradient>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('month')}>
          <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'all' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('all')}>
          <Text style={[styles.periodButtonText, selectedPeriod === 'all' && styles.periodButtonTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardsContainer}>
        {/* Latest M-PESA Balance */}
        <View style={[styles.card, styles.balanceCard]}>
          <Text style={styles.cardLabel}>Latest M-PESA Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(latestBalance)}
          </Text>
          <Text style={styles.balanceSubtext}>
            From most recent transaction
          </Text>
        </View>

        {/* Net Flow Card */}
        <View style={[styles.card, styles.netFlowCard]}>
          <Text style={styles.cardLabel}>
            {selectedPeriod === 'month' ? 'Monthly Net Flow' : 'All-Time Net Flow'}
          </Text>
          <Text style={[
            styles.netFlowAmount,
            displayStats.netBalance >= 0 ? styles.positiveAmount : styles.negativeAmount
          ]}>
            {displayStats.netBalance >= 0 ? '+' : ''}{formatCurrency(displayStats.netBalance)}
          </Text>
          {selectedPeriod === 'month' && comparison.previous.totalSpent > 0 && (
            <View style={styles.comparisonBadge}>
              <Text style={[
                styles.comparisonText,
                comparison.spendingChange > 0 ? styles.increaseText : styles.decreaseText
              ]}>
                {comparison.spendingChange > 0 ? '↑' : '↓'} 
                {Math.abs(comparison.spendingChangePercentage).toFixed(1)}% vs last month
              </Text>
            </View>
          )}
        </View>

        {/* Income and Spending Row */}
        <View style={styles.row}>
          <View style={[styles.card, styles.smallCard, styles.incomeCard]}>
            <Text style={styles.cardIcon}>📈</Text>
            <Text style={styles.cardLabel}>Received</Text>
            <Text style={styles.cardAmount}>
              {formatCurrency(displayStats.totalReceived)}
            </Text>
          </View>

          <View style={[styles.card, styles.smallCard, styles.expenseCard]}>
            <Text style={styles.cardIcon}>📉</Text>
            <Text style={styles.cardLabel}>Spent</Text>
            <Text style={styles.cardAmount}>
              {formatCurrency(displayStats.totalSpent)}
            </Text>
          </View>
        </View>

        {/* Daily Average (only for monthly view) */}
        {selectedPeriod === 'month' && (
          <View style={[styles.card, styles.dailyCard]}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardLabel}>Daily Average Spending</Text>
            <Text style={styles.cardAmount}>
              {formatCurrency(dailyAverage)}
            </Text>
            <Text style={styles.cardSubtext}>
              Based on {currentMonthStats.transactionCount} transactions
            </Text>
          </View>
        )}
      </View>

      {/* Spending by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {pieData.length > 0 ? (
          <>
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
            
            {/* Top Categories List */}
            {selectedPeriod === 'month' && topCategories.length > 0 && (
              <View style={styles.categoriesList}>
                <Text style={styles.categoriesTitle}>Top Spending Categories:</Text>
                {topCategories.map((cat, index) => (
                  <View key={cat.category} style={styles.categoryItem}>
                    <View style={styles.categoryRank}>
                      <Text style={styles.categoryRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{cat.category}</Text>
                      <View style={styles.categoryBar}>
                        <View 
                          style={[
                            styles.categoryBarFill, 
                            { width: `${cat.percentage}%` }
                          ]} 
                        />
                      </View>
                    </View>
                    <View style={styles.categoryAmounts}>
                      <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                      <Text style={styles.categoryPercentage}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noData}>
            {selectedPeriod === 'month' 
              ? 'No transactions this month yet' 
              : 'No transactions yet'}
          </Text>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{displayStats.transactionCount}</Text>
            <Text style={styles.statLabel}>
              {selectedPeriod === 'month' ? 'This Month' : 'Total'} Transactions
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {selectedPeriod === 'month' 
                ? currentMonthStats.transactions.filter(t => t.type === 'sent' || t.type === 'payment').length
                : transactions.filter(t => t.type === 'sent' || t.type === 'payment').length}
            </Text>
            <Text style={styles.statLabel}>Payments Made</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {selectedPeriod === 'month'
                ? currentMonthStats.transactions.filter(t => t.type === 'received').length
                : transactions.filter(t => t.type === 'received').length}
            </Text>
            <Text style={styles.statLabel}>Money Received</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Object.keys(displayStats.categorySpending).length}
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
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  cardsContainer: {
    padding: 20,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  balanceSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  netFlowCard: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  netFlowAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#10B981',
  },
  negativeAmount: {
    color: '#EF4444',
  },
  comparisonBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  increaseText: {
    color: '#EF4444',
  },
  decreaseText: {
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
  dailyCard: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
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
  categoriesList: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryRankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6B7280',
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
    shadowOffset: { width: 0, height: 1 },
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