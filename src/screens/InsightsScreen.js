import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const InsightsScreen = ({ transactions }) => {
  const generateInsights = () => {
    if (transactions.length === 0) return [];

    const insights = [];

    const spending = transactions
      .filter(t => t.type === 'sent' || t.type === 'payment' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    const income = transactions
      .filter(t => t.type === 'received')
      .reduce((sum, t) => sum + t.amount, 0);

    const categorySpending = {};
    transactions
      .filter(t => t.type !== 'received')
      .forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      });

    const topCategory = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])[0];

    const avgTransaction = spending / transactions.filter(t => t.type !== 'received').length || 0;

    const senders = {};
    transactions
      .filter(t => t.type === 'received' && t.sender)
      .forEach(t => {
        senders[t.sender] = (senders[t.sender] || 0) + 1;
      });
    const topSender = Object.entries(senders).sort((a, b) => b[1] - a[1])[0];

    const recipients = {};
    transactions
      .filter(t => (t.type === 'sent' || t.type === 'payment') && t.recipient)
      .forEach(t => {
        recipients[t.recipient] = (recipients[t.recipient] || 0) + 1;
      });
    const topRecipient = Object.entries(recipients).sort((a, b) => b[1] - a[1])[0];

    if (income > spending) {
      insights.push({
        type: 'positive',
        icon: '🎉',
        title: 'Great Job!',
        message: `You're saving money! Your income (KSh ${income.toFixed(2)}) exceeds spending (KSh ${spending.toFixed(2)}).`,
      });
    } else {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Watch Your Spending',
        message: `You're spending more (KSh ${spending.toFixed(2)}) than you're earning (KSh ${income.toFixed(2)}). Consider reducing expenses.`,
      });
    }

    if (topCategory) {
      const percentage = ((topCategory[1] / spending) * 100).toFixed(1);
      insights.push({
        type: 'info',
        icon: '📊',
        title: 'Top Spending Category',
        message: `You spend the most on ${topCategory[0]} (${percentage}% of total spending). This amounts to KSh ${topCategory[1].toFixed(2)}.`,
      });
    }

    insights.push({
      type: 'info',
      icon: '💰',
      title: 'Average Transaction',
      message: `Your average transaction amount is KSh ${avgTransaction.toFixed(2)}. This helps you understand your spending patterns.`,
    });

    if (topSender) {
      insights.push({
        type: 'positive',
        icon: '📥',
        title: 'Most Frequent Sender',
        message: `${topSender[0]} has sent you money ${topSender[1]} times. They're your top income source!`,
      });
    }

    if (topRecipient) {
      insights.push({
        type: 'info',
        icon: '📤',
        title: 'Most Frequent Recipient',
        message: `You've sent money to ${topRecipient[0]} ${topRecipient[1]} times. This is your most common transaction recipient.`,
      });
    }

    // Withdrawal pattern
    const withdrawals = transactions.filter(t => t.type === 'withdrawal');
    if (withdrawals.length > 0) {
      const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
      insights.push({
        type: 'info',
        icon: '🏧',
        title: 'Cash Withdrawals',
        message: `You've withdrawn KSh ${totalWithdrawals.toFixed(2)} in cash across ${withdrawals.length} transactions.`,
      });
    }

    // Savings tip
    const savingsRate = ((income - spending) / income * 100);
    if (savingsRate > 0) {
      insights.push({
        type: 'positive',
        icon: '💡',
        title: 'Savings Rate',
        message: `You're saving ${savingsRate.toFixed(1)}% of your income. Experts recommend saving at least 20%. ${savingsRate >= 20 ? 'Great work!' : 'Try to increase your savings rate.'}`,
      });
    }

    // Biggest Purchase
    const biggestPurchase = transactions
      .filter(t => t.type === 'sent' || t.type === 'payment')
      .sort((a, b) => b.amount - a.amount)[0];

    if (biggestPurchase) {
      insights.push({
        type: 'warning',
        icon: '💸',
        title: 'Biggest Purchase',
        message: `Your biggest spend was KSh ${biggestPurchase.amount.toLocaleString('en-KE')} to ${biggestPurchase.recipient || 'Unknown'} on ${new Date(biggestPurchase.date).toLocaleDateString()}.`,
      });
    }

    // Day you spend the most
    const daySpending = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    transactions
      .filter(t => t.type === 'sent' || t.type === 'payment')
      .forEach(t => {
        const day = days[new Date(t.date).getDay()];
        daySpending[day] = (daySpending[day] || 0) + t.amount;
      });

    const peakDay = Object.entries(daySpending).sort((a, b) => b[1] - a[1])[0];
    if (peakDay) {
      insights.push({
        type: 'info',
        icon: '📅',
        title: 'Peak Spending Day',
        message: `You tend to spend the most on ${peakDay[0]}s. Total spent on this day: KSh ${peakDay[1].toLocaleString('en-KE')}.`,
      });
    }

    // Weekly Comparison
    const now = new Date();
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thisWeekSpending = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= startOfThisWeek && (t.type === 'sent' || t.type === 'payment');
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const lastWeekSpending = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= startOfLastWeek && d < startOfThisWeek && (t.type === 'sent' || t.type === 'payment');
      })
      .reduce((sum, t) => sum + t.amount, 0);

    if (lastWeekSpending > 0) {
      const change = ((thisWeekSpending - lastWeekSpending) / lastWeekSpending) * 100;
      const isIncrease = change > 0;
      insights.push({
        type: isIncrease ? 'warning' : 'positive',
        icon: isIncrease ? '📈' : '📉',
        title: 'Weekly Comparison',
        message: `Your spending is ${isIncrease ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% compared to last week.`,
      });
    }

    return insights;
  };

  const insights = generateInsights();

  const getGradientColors = type => {
    switch (type) {
      case 'positive':
        return ['#10B981', '#059669'];
      case 'warning':
        return ['#F59E0B', '#D97706'];
      case 'info':
        return ['#6366F1', '#4F46E5'];
      default:
        return ['#6B7280', '#4B5563'];
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💡 Financial Insights</Text>
        <Text style={styles.headerSubtitle}>
          Personalized tips based on your spending
        </Text>
      </View>

      {insights.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Insights Yet</Text>
          <Text style={styles.emptyMessage}>
            Start making transactions to get personalized financial insights
          </Text>
        </View>
      ) : (
        insights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <LinearGradient
              colors={getGradientColors(insight.type)}
              style={styles.insightHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <Text style={styles.insightTitle}>{insight.title}</Text>
            </LinearGradient>
            <View style={styles.insightBody}>
              <Text style={styles.insightMessage}>{insight.message}</Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💰 Money-Saving Tips</Text>

        <View style={styles.tipCard}>
          <Text style={styles.tipNumber}>1</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Track Every Expense</Text>
            <Text style={styles.tipText}>
              Review your transactions weekly to identify unnecessary spending
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipNumber}>2</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Set Category Budgets</Text>
            <Text style={styles.tipText}>
              Allocate specific amounts for categories like food, transport, and entertainment
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipNumber}>3</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Build an Emergency Fund</Text>
            <Text style={styles.tipText}>
              Try to save 3-6 months of expenses for unexpected situations
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipNumber}>4</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Reduce Impulse Spending</Text>
            <Text style={styles.tipText}>
              Wait 24 hours before making non-essential purchases
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipNumber}>5</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Use the 50/30/20 Rule</Text>
            <Text style={styles.tipText}>
              50% needs, 30% wants, 20% savings - a simple budgeting framework
            </Text>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  insightCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  insightBody: {
    padding: 16,
  },
  insightMessage: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  tipsSection: {
    padding: 16,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default InsightsScreen;