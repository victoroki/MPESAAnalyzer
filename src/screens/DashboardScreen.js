import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useLoading } from '../contexts/LoadingContext';
import { PieChart } from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import {
  calculateMonthlyStats,
  compareWithPreviousMonth,
  formatCurrency,
  getDailyAverage,
  getTopCategories,
} from '../utils/transactionHelpers';
import MonthSelector from '../components/MonthSelector';

const DashboardScreen = ({ transactions = [], onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { showLoading, hideLoading } = useLoading();

  // Get current month statistics based on selectedDate
  const currentMonthStats = calculateMonthlyStats(
    transactions,
    selectedDate.getFullYear(),
    selectedDate.getMonth()
  );

  console.log('[DEBUG] DashboardScreen transactions count:', transactions.length);
  console.log('[DEBUG] Current month stats:', currentMonthStats);

  const handleRefresh = async () => {
    console.log('[DEBUG] Manual refresh triggered');
    if (onRefresh) {
      await onRefresh();
    }
  };

  // For comparison, we need to pass the selected date to compareWithPreviousMonth
  // But compareWithPreviousMonth currently uses "now". We might need to update it or just manually calculate previous month here.
  // Let's manually calculate for flexibility
  const prevDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
  const previousMonthStats = calculateMonthlyStats(
    transactions,
    prevDate.getFullYear(),
    prevDate.getMonth()
  );

  const spendingChange = currentMonthStats.totalSpent - previousMonthStats.totalSpent;
  const spendingChangePercentage = previousMonthStats.totalSpent > 0
    ? (spendingChange / previousMonthStats.totalSpent) * 100
    : 0;

  const comparison = {
    current: currentMonthStats,
    previous: previousMonthStats,
    spendingChange,
    spendingChangePercentage,
  };

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

  // Prepare pie chart data with better colors
  const chartColors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  const pieData = Object.entries(displayStats.categorySpending)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount], i) => ({
      name,
      amount,
      color: chartColors[i % 6],
      legendFontColor: '#6B7280',
      legendFontSize: 12,
    }));

  // Get last balance from most recent transaction
  const latestBalance = transactions.length > 0
    ? transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].balance
    : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Manual Refresh Button */}
      {transactions.length === 0 && (
        <View style={styles.refreshContainer}>
          <Text style={styles.noDataText}>No transaction data found</Text>
          <Text style={styles.noDataSubtext}>Make sure you have M-Pesa SMS messages and have granted permission</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hero Header with Gradient */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.headerTitle}>Welcome Back!</Text>
            <Text style={styles.headerSubtitle}>
              {selectedPeriod === 'month'
                ? `${currentMonthStats.monthName} Financial Overview`
                : 'Your Complete Financial Journey'}
            </Text>
          </View>
        </View>

        {/* Balance Card - Floating on gradient */}
        <View style={styles.balanceCardFloat}>
          <LinearGradient
            colors={['#1F2937', '#374151']}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>💰 M-PESA Balance</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(latestBalance)}
            </Text>
            <Text style={styles.balanceSubtext}>
              Updated from latest transaction
            </Text>
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* Period Selector - Modern Tabs */}
      <View style={styles.periodSelectorContainer}>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
              📅 Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'all' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'all' && styles.periodButtonTextActive]}>
              ⏳ All Time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Selector (Only visible when Monthly is selected) */}
      {selectedPeriod === 'month' && (
        <View style={styles.monthSelectorContainer}>
          <MonthSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>
      )}

      <View style={styles.content}>
        {/* Net Flow - Hero Card */}
        <LinearGradient
          colors={displayStats.netBalance >= 0 ? ['#ECFDF5', '#D1FAE5'] : ['#FEF2F2', '#FEE2E2']}
          style={styles.netFlowCard}
        >
          <View style={styles.netFlowHeader}>
            <View style={styles.netFlowIcon}>
              <Text style={styles.netFlowIconText}>
                {displayStats.netBalance >= 0 ? '📈' : '📉'}
              </Text>
            </View>
            <Text style={styles.netFlowLabel}>
              {selectedPeriod === 'month' ? 'Net Flow' : 'All-Time Net Flow'}
            </Text>
          </View>
          <Text style={[
            styles.netFlowAmount,
            displayStats.netBalance >= 0 ? styles.positiveAmount : styles.negativeAmount
          ]}>
            {displayStats.netBalance >= 0 ? '+' : ''}{formatCurrency(displayStats.netBalance)}
          </Text>
          {selectedPeriod === 'month' && comparison.previous.totalSpent > 0 && (
            <View style={[
              styles.comparisonBadge,
              comparison.spendingChange > 0 ? styles.comparisonBadgeNegative : styles.comparisonBadgePositive
            ]}>
              <Text style={styles.comparisonText}>
                {comparison.spendingChange > 0 ? '↑' : '↓'}
                {Math.abs(comparison.spendingChangePercentage).toFixed(1)}% vs last month
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Income and Spending Cards - Side by side */}
        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#ECFDF5', '#D1FAE5']}
            style={[styles.statCard, styles.statCardLeft]}
          >
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>💵</Text>
            </View>
            <Text style={styles.statLabel}>Money Received</Text>
            <Text style={[styles.statAmount, styles.positiveAmount]}>
              {formatCurrency(displayStats.totalReceived)}
            </Text>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>
                {selectedPeriod === 'month' ? 'This Month' : 'All Time'}
              </Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            style={[styles.statCard, styles.statCardRight]}
          >
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>💳</Text>
            </View>
            <Text style={styles.statLabel}>Money Spent</Text>
            <Text style={[styles.statAmount, styles.negativeAmount]}>
              {formatCurrency(displayStats.totalSpent)}
            </Text>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>
                {selectedPeriod === 'month' ? 'This Month' : 'All Time'}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📊</Text>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
          </View>

          {pieData.length > 0 ? (
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                width={Dimensions.get('window').width - 40}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
              />

              <View style={styles.categoriesList}>
                {topCategories.map((cat, index) => (
                  <View key={cat.category} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <View style={[styles.categoryColorDot, { backgroundColor: chartColors[index % 6] }]} />
                        <Text style={styles.categoryName}>{cat.category}</Text>
                      </View>
                      <View style={styles.categoryBarContainer}>
                        <View style={styles.categoryBar}>
                          <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.categoryBarFill, { width: `${cat.percentage}%` }]}
                          />
                        </View>
                      </View>
                    </View>
                    <View style={styles.categoryAmounts}>
                      <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                      <Text style={styles.categoryPercentage}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateText}>
                {selectedPeriod === 'month'
                  ? 'No transactions this month yet'
                  : 'No transactions yet'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Start making transactions to see insights
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>⚡</Text>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.quickStatCard}>
              <LinearGradient
                colors={['#EEF2FF', '#E0E7FF']}
                style={styles.quickStatGradient}
              >
                <Text style={styles.quickStatIcon}>📝</Text>
                <Text style={styles.quickStatValue}>{displayStats.transactionCount}</Text>
                <Text style={styles.quickStatLabel}>
                  {selectedPeriod === 'month' ? 'Monthly' : 'Total'} Transactions
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.quickStatCard}>
              <LinearGradient
                colors={['#FEE2E2', '#FECACA']}
                style={styles.quickStatGradient}
              >
                <Text style={styles.quickStatIcon}>💳</Text>
                <Text style={styles.quickStatValue}>
                  {formatCurrency(dailyAverage)}
                </Text>
                <Text style={styles.quickStatLabel}>Daily Average</Text>
              </LinearGradient>
            </View>
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
  refreshContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    height: 250,
    paddingTop: 60,
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerContent: {
    zIndex: 2,
  },
  welcomeEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    maxWidth: '80%',
  },
  balanceCardFloat: {
    position: 'absolute',
    bottom: -40,
    left: 20,
    right: 20,
    zIndex: 3,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 6,
    letterSpacing: -1,
  },
  balanceSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  periodSelectorContainer: {
    paddingHorizontal: 20,
    marginTop: -50,
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  monthSelectorContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  netFlowCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  netFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  netFlowIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  netFlowIconText: {
    fontSize: 20,
  },
  netFlowLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  netFlowAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: -1,
  },
  positiveAmount: {
    color: '#10B981',
  },
  negativeAmount: {
    color: '#EF4444',
  },
  comparisonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  comparisonBadgePositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  comparisonBadgeNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  comparisonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statCardLeft: {
    marginRight: 8,
  },
  statCardRight: {
    marginLeft: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  statBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  chartContainer: {
    alignItems: 'center',
  },
  categoriesList: {
    width: '100%',
    marginTop: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoryBarContainer: {
    width: '100%',
    marginTop: 6,
  },
  categoryBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  quickStatCard: {
    flex: 1,
  },
  quickStatGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DashboardScreen;