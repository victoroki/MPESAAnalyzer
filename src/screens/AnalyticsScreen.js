import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import DateRangePicker from '../components/DateRangePicker';

const AnalyticsScreen = ({ transactions = [] }) => {
  const [period, setPeriod] = useState('week');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());

  const handleDateRangeChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Calculate spending within date range
  const dateRangeSpending = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return isWithinInterval(tDate, { start: startDate, end: endDate });
      })
      .filter(t => t.type === 'sent' || t.type === 'payment' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, startDate, endDate]);

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

      labels.push(format(date, period === 'week' ? 'EEE' : 'dd'));
      spentData.push(spent);
      receivedData.push(received);
    }

    return { labels, spentData, receivedData };
  };

  const getCategoryData = () => {
    const categories = {};
    transactions
      .filter(t => t.type !== 'received' && t.category)
      .forEach(t => {
        const cat = t.category || 'Other';
        categories[cat] = (categories[cat] || 0) + t.amount;
      });

    // Sort by amount and take top 5 categories to avoid overlap
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: sortedCategories.map(([label]) => label),
      data: sortedCategories.map(([, value]) => value),
    };
  };

  const getTopPeople = () => {
    const people = { received: {}, sent: {} };

    transactions.forEach(t => {
      if (t.type === 'received' && t.sender) {
        if (!people.received[t.sender]) {
          people.received[t.sender] = { amount: 0, count: 0 };
        }
        people.received[t.sender].amount += t.amount;
        people.received[t.sender].count += 1;
      }
      if ((t.type === 'sent' || t.type === 'payment') && t.recipient) {
        if (!people.sent[t.recipient]) {
          people.sent[t.recipient] = { amount: 0, count: 0 };
        }
        people.sent[t.recipient].amount += t.amount;
        people.sent[t.recipient].count += 1;
      }
    });

    const topReceivers = Object.entries(people.sent)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);

    const topSenders = Object.entries(people.received)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);

    return { topReceivers, topSenders };
  };

  const periodData = getPeriodData();
  const categoryData = getCategoryData();
  const peopleData = getTopPeople();

  const screenWidth = Dimensions.get('window').width;

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '3', stroke: '#4F46E5' },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1,
    },
    strokeWidth: 3,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Range Picker */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* Date Range Spending Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Spending in Selected Range</Text>
        <Text style={styles.summaryAmount}>KSh {dateRangeSpending.toLocaleString('en-KE')}</Text>
        <Text style={styles.summaryPeriod}>
          {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
        </Text>
      </View>

      {/* Spending vs Income Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Cash Flow</Text>
          <View style={styles.legend}>
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
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: periodData.labels,
              datasets: [
                {
                  data: periodData.receivedData.length > 0 ? periodData.receivedData : [0],
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  strokeWidth: 3,
                },
                {
                  data: periodData.spentData.length > 0 ? periodData.spentData : [0],
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={screenWidth - 64}
            height={250}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              strokeWidth: 2,
              barPercentage: 0.5,
            }}
            bezier
            style={styles.chart}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            segments={5}
            yAxisLabel="KSh"
            yAxisSuffix=""
            withScrollableDot={false}
            onDataPointClick={(data) => {
              console.log('Data point clicked:', data);
            }}
          />
        </View>
      </View>

      {/* Category Spending Chart */}
      {categoryData.labels.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Top 5 Categories</Text>
          <View style={styles.chartContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={{
                  labels: categoryData.labels.map(label => {
                    // Truncate long labels and add line breaks for better spacing
                    if (label.length > 8) {
                      return label.substring(0, 8) + '...';
                    }
                    return label;
                  }),
                  datasets: [
                    {
                      data: categoryData.data,
                      colors: [
                        () => '#10B981',
                        () => '#3B82F6',
                        () => '#8B5CF6',
                        () => '#F59E0B',
                        () => '#EF4444',
                      ]
                    }
                  ],
                }}
                width={Math.max(screenWidth - 64, categoryData.labels.length * 80)}
                height={250}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  barPercentage: 0.6,
                  strokeWidth: 2,
                }}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                withInnerLines={true}
                segments={5}
                fromZero={true}
                yAxisLabel="KSh "
                yAxisSuffix=""
                withCustomBarColorFromData={true}
                flatColor={true}
              />
            </ScrollView>
          </View>
        </View>
      )}

      {/* Top Money Receivers */}
      {peopleData.topReceivers.length > 0 && (
        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Top Recipients</Text>
            <Text style={styles.listSubtitle}>People you send money to most</Text>
          </View>
          {peopleData.topReceivers.map(([name, stats], index) => (
            <View key={name} style={styles.personRow}>
              <View style={styles.personLeft}>
                <View style={[styles.rankBadge, styles.spentBadge]}>
                  <Text style={styles.rankNumber}>{getInitials(name)}</Text>
                </View>
                <View>
                  <Text style={styles.personName} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.personCount}>
                    {stats.count} transactions
                  </Text>
                </View>
              </View>
              <Text style={[styles.personAmount, { color: '#EF4444' }]}>
                KSh {stats.amount.toLocaleString('en-KE')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Money Senders */}
      {peopleData.topSenders.length > 0 && (
        <View style={[styles.listCard, { marginBottom: 24 }]}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Top Senders</Text>
            <Text style={styles.listSubtitle}>People who send you money most</Text>
          </View>
          {peopleData.topSenders.map(([name, stats], index) => (
            <View key={name} style={styles.personRow}>
              <View style={styles.personLeft}>
                <View style={[styles.rankBadge, styles.incomeBadge]}>
                  <Text style={styles.rankNumber}>{getInitials(name)}</Text>
                </View>
                <View>
                  <Text style={styles.personName} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.personCount}>
                    {stats.count} transactions
                  </Text>
                </View>
              </View>
              <Text style={[styles.personAmount, { color: '#10B981' }]}>
                KSh {stats.amount.toLocaleString('en-KE')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {peopleData.topReceivers.length === 0 && peopleData.topSenders.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transaction data yet</Text>
          <Text style={styles.emptySubtext}>
            Your M-Pesa transaction analytics will appear here
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  periodButtonActive: {
    backgroundColor: '#4F46E5',
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  chart: {
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chartContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listHeader: {
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  listSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  spentBadge: {
    backgroundColor: '#FEE2E2',
  },
  incomeBadge: {
    backgroundColor: '#D1FAE5',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  personCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  personAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 12,
    letterSpacing: -1,
  },
  summaryPeriod: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default AnalyticsScreen;