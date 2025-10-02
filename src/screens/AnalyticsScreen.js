import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {LineChart, BarChart} from 'react-native-chart-kit';
import {format, subDays, startOfDay, endOfDay} from 'date-fns';

const AnalyticsScreen = ({transactions}) => {
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

      labels.push(format(date, period === 'week' ? 'EEE' : 'dd'));
      spentData.push(spent);
      receivedData.push(received);
    }

    return {labels, spentData, receivedData};
  };

  const getCategoryData = () => {
    const categories = {};
    transactions
      .filter(t => t.type !== 'received')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });

    return {
      labels: Object.keys(categories),
      data: Object.values(categories),
    };
  };

  const getTopPeople = () => {
    const people = {received: {}, sent: {}};

    transactions.forEach(t => {
      if (t.type === 'received' && t.sender) {
        people.received[t.sender] = (people.received[t.sender] || 0) + t.amount;
      }
      if ((t.type === 'sent' || t.type === 'payment') && t.recipient) {
        people.sent[t.recipient] = (people.sent[t.recipient] || 0) + t.amount;
      }
    });

    const topReceivers = Object.entries(people.received)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topSenders = Object.entries(people.sent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {topReceivers, topSenders};
  };

  const periodData = getPeriodData();
  const categoryData = getCategoryData();
  const peopleData = getTopPeople();

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {borderRadius: 16},
    propsForDots: {r: '4', strokeWidth: '2', stroke: '#6366F1'},
  };

  return (
    <ScrollView style={styles.container}>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending vs Income Trend</Text>
        <LineChart
          data={{
            labels: periodData.labels,
            datasets: [
              {data: periodData.spentData, color: () => '#EF4444'},
              {data: periodData.receivedData, color: () => '#10B981'},
            ],
            legend: ['Spent', 'Received'],
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {categoryData.labels.length > 0 ? (
          <BarChart
            data={{
              labels: categoryData.labels,
              datasets: [{data: categoryData.data}],
            }}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`}}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        ) : (
          <Text style={styles.noData}>No category data available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Money Receivers 💸</Text>
        {peopleData.topReceivers.length > 0 ? (
          peopleData.topReceivers.map(([name, amount], index) => (
            <View key={name} style={styles.personCard}>
              <View style={styles.personRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Text style={styles.personName}>{name}</Text>
              <Text style={styles.personAmount}>
                KSh {amount.toLocaleString('en-KE', {minimumFractionDigits: 2})}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No data available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Money Senders 📥</Text>
        {peopleData.topSenders.length > 0 ? (
          peopleData.topSenders.map(([name, amount], index) => (
            <View key={name} style={styles.personCard}>
              <View style={[styles.personRank, styles.senderRank]}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Text style={styles.personName}>{name}</Text>
              <Text style={[styles.personAmount, {color: '#10B981'}]}>
                KSh {amount.toLocaleString('en-KE', {minimumFractionDigits: 2})}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No data available</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTextActive: {
    color: '#fff',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noData: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 20,
    fontSize: 14,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  personRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  senderRank: {
    backgroundColor: '#10B981',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  personName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  personAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
});

export default AnalyticsScreen;