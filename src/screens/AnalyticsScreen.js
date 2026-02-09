import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;

const AnalyticsScreen = ({ transactions = [] }) => {
  const [period, setPeriod] = useState('week');

  const getPeriodData = () => {
    const now = new Date();
    let days = 7;
    if (period === 'month') days = 30;
    if (period === 'year') days = 365;

    const labels = [];
    const spentData = [];
    const receivedData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfDay(date) && tDate <= endOfDay(date);
      });

      const spent = dayTransactions
        .filter(t => t.type === 'sent' || t.type === 'payment' || t.type === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0);

      const received = dayTransactions
        .filter(t => t.type === 'received')
        .reduce((sum, t) => sum + t.amount, 0);

      // Add labels at intervals
      if (period === 'week') {
        labels.push(format(date, 'EEE'));
      } else if (period === 'month' && i % 5 === 0) {
        labels.push(format(date, 'dd'));
      } else if (period === 'year' && i % 30 === 0) {
        labels.push(format(date, 'MMM'));
      }

      spentData.push(spent);
      receivedData.push(received);
    }

    return { labels, spentData, receivedData };
  };

  const categorySpending = useMemo(() => {
    const categories = {};
    transactions
      .filter(t => t.type !== 'received' && t.category)
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [transactions]);

  // All-time top recipients (people you send money to)
  const topRecipients = useMemo(() => {
    const recipients = {};
    transactions
      .filter(t => (t.type === 'sent' || t.type === 'payment') && t.recipient)
      .forEach(t => {
        if (!recipients[t.recipient]) {
          recipients[t.recipient] = { amount: 0, count: 0 };
        }
        recipients[t.recipient].amount += t.amount;
        recipients[t.recipient].count += 1;
      });
    return Object.entries(recipients)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 3);
  }, [transactions]);

  // All-time top senders (people you receive money from)
  const topSenders = useMemo(() => {
    const senders = {};
    transactions
      .filter(t => t.type === 'received' && t.sender)
      .forEach(t => {
        if (!senders[t.sender]) {
          senders[t.sender] = { amount: 0, count: 0 };
        }
        senders[t.sender].amount += t.amount;
        senders[t.sender].count += 1;
      });
    return Object.entries(senders)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 3);
  }, [transactions]);

  const periodData = getPeriodData();
  const maxSpending = Math.max(...categorySpending.map(([_, amount]) => amount), 1);

  const totalSpentInPeriod = periodData.spentData.reduce((sum, val) => sum + val, 0);
  const totalReceivedInPeriod = periodData.receivedData.reduce((sum, val) => sum + val, 0);
  const changePercentage = totalReceivedInPeriod > 0
    ? ((totalSpentInPeriod / totalReceivedInPeriod) * 100).toFixed(0)
    : 0;

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate;

    if (period === 'week') {
      startDate = subDays(now, 6);
    } else if (period === 'month') {
      startDate = subDays(now, 29);
    } else {
      startDate = subDays(now, 364);
    }

    return {
      from: format(startDate, 'MMM dd, yyyy'),
      to: format(now, 'MMM dd, yyyy')
    };
  };

  const dateRange = getDateRange();

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>

          {/* Custom Pill Selector */}
          <View style={styles.periodSelector}>
            {['week', 'month', 'year'].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              >
                <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Range Card */}
        <View style={styles.dateRangeCard}>
          <View style={styles.dateColumn}>
            <Text style={styles.dateLabel}>FROM</Text>
            <Text style={styles.dateValue}>{dateRange.from}</Text>
          </View>
          <View style={styles.arrowIcon}>
            <Text style={styles.arrowText}>→</Text>
          </View>
          <View style={styles.dateColumn}>
            <Text style={styles.dateLabel}>TO</Text>
            <Text style={styles.dateValue}>{dateRange.to}</Text>
          </View>
        </View>

        {/* Spending Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartLabel}>Spending in Range</Text>
              <Text style={styles.chartAmount}>
                KSh {totalSpentInPeriod.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
              </Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Spending</Text>
                </View>
              </View>
            </View>
            {totalReceivedInPeriod > 0 && (
              <View style={styles.growthBadge}>
                <Text style={styles.growthText}>📊 {changePercentage}%</Text>
              </View>
            )}
          </View>

          <LineChart
            data={{
              labels: periodData.labels,
              datasets: [
                {
                  data: periodData.spentData.length > 0 ? periodData.spentData : [0, 0, 0],
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red for spending
                  strokeWidth: 2
                },
                {
                  data: periodData.receivedData.length > 0 ? periodData.receivedData : [0, 0, 0],
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green for income
                  strokeWidth: 2
                }
              ],
              legend: ['Spending', 'Income']
            }}
            width={SCREEN_WIDTH - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`, // Default axis label color
              labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '0' }
            }}
            bezier
            withVerticalLines={false}
            withHorizontalLines={true}
            style={styles.lineChart}
          />
        </View>

        {/* Top 5 Categories */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📊</Text>
            <Text style={styles.sectionTitle}>Top 5 Categories</Text>
          </View>
          {categorySpending.length > 0 ? (
            categorySpending.map(([name, amount], i) => (
              <View key={name} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{name}</Text>
                  <Text style={styles.categoryAmount}>KSh {amount.toLocaleString()}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {
                    width: `${(amount / maxSpending) * 100}%`,
                    backgroundColor: i === 0 ? '#10B981' : i === 1 ? '#6366F1' : '#F59E0B'
                  }]} />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No category data available</Text>
            </View>
          )}
        </View>

        {/* Top Recipients - People You Send To */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleLarge}>Top Recipients</Text>
          <Text style={styles.sectionSubtitle}>People you send money to most (All-time)</Text>

          {topRecipients.length > 0 ? (
            topRecipients.map(([name, stats], index) => (
              <View key={name} style={styles.recipientRow}>
                <View style={[styles.avatar, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={styles.avatarText}>{getInitials(name)}</Text>
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>{name}</Text>
                  <View style={styles.barContainer}>
                    <View style={[styles.barFill, { 
                      width: `${(stats.amount / topRecipients[0][1].amount) * 100}%`,
                      backgroundColor: '#EF4444'
                    }]} />
                  </View>
                  <Text style={styles.recipientSub}>
                    {stats.count} transaction{stats.count > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.recipientAmount}>KSh {stats.amount.toLocaleString()}</Text>
                  <Text style={styles.sentLabel}>Sent</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recipient data available</Text>
            </View>
          )}
        </View>

        {/* Top Senders - People You Receive From */}
        <View style={[styles.sectionCard, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitleLarge}>Top Senders</Text>
          <Text style={styles.sectionSubtitle}>People who send you money most (All-time)</Text>

          {topSenders.length > 0 ? (
            topSenders.map(([name, stats]) => (
              <View key={name} style={styles.recipientRow}>
                <View style={[styles.avatar, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.avatarText, { color: '#10B981' }]}>{getInitials(name)}</Text>
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>{name}</Text>
                  <View style={styles.barContainer}>
                    <View style={[styles.barFill, { 
                      width: `${(stats.amount / topSenders[0][1].amount) * 100}%`,
                      backgroundColor: '#10B981'
                    }]} />
                  </View>
                  <Text style={styles.recipientSub}>
                    {stats.count} transaction{stats.count > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={[styles.recipientAmount, { color: '#10B981' }]}>KSh {stats.amount.toLocaleString()}</Text>
                  <Text style={styles.receivedLabel}>Received</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No sender data available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    padding: 5,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  periodBtnActive: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  periodBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
  },
  dateRangeCard: {
    marginHorizontal: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  dateColumn: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  arrowIcon: {
    paddingHorizontal: 15,
  },
  arrowText: {
    fontSize: 20,
    color: '#CBD5E1',
  },
  chartCard: {
    marginHorizontal: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 5,
  },
  chartAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EF4444',
  },
  legendRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
  },
  growthBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  lineChart: {
    marginRight: -10,
    marginLeft: -10,
  },
  sectionCard: {
    marginHorizontal: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionIcon: {
    fontSize: 18,
    color: '#6366F1',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryRow: {
    marginBottom: 15,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitleLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  recipientSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  barContainer: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginVertical: 4,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  recipientAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  sentLabel: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
    fontWeight: '600',
  },
  receivedLabel: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});

export default AnalyticsScreen;