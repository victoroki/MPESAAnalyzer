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

export interface MonthlyStats {
  month: string; // YYYY-MM format
  monthName: string; // "October 2025"
  totalSpent: number;
  totalReceived: number;
  netFlow: number;
  transactionCount: number;
  categoryBreakdown: { [key: string]: number };
  transactions: Transaction[];
}

/**
 * Get transactions for a specific month
 */
export const getTransactionsForMonth = (
  transactions: Transaction[],
  year: number,
  month: number // 0-11 (January is 0)
): Transaction[] => {
  return transactions.filter(t => {
    const date = new Date(t.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
};

/**
 * Get transactions for current month
 */
export const getCurrentMonthTransactions = (
  transactions: Transaction[]
): Transaction[] => {
  const now = new Date();
  return getTransactionsForMonth(transactions, now.getFullYear(), now.getMonth());
};

/**
 * Calculate monthly statistics
 */
export const calculateMonthlyStats = (
  transactions: Transaction[],
  year: number,
  month: number
): MonthlyStats => {
  const monthTransactions = getTransactionsForMonth(transactions, year, month);
  
  let totalSpent = 0;
  let totalReceived = 0;
  const categoryBreakdown: { [key: string]: number } = {};

  monthTransactions.forEach(t => {
    if (t.type === 'received') {
      totalReceived += t.amount;
    } else {
      // sent, payment, withdrawal, airtime all count as spending
      totalSpent += t.amount;
      
      // Category breakdown for spending
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = 0;
      }
      categoryBreakdown[t.category] += t.amount;
    }
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return {
    month: `${year}-${String(month + 1).padStart(2, '0')}`,
    monthName: `${monthNames[month]} ${year}`,
    totalSpent,
    totalReceived,
    netFlow: totalReceived - totalSpent,
    transactionCount: monthTransactions.length,
    categoryBreakdown,
    transactions: monthTransactions,
  };
};

/**
 * Get statistics for the current month
 */
export const getCurrentMonthStats = (
  transactions: Transaction[]
): MonthlyStats => {
  const now = new Date();
  return calculateMonthlyStats(transactions, now.getFullYear(), now.getMonth());
};

/**
 * Get statistics for the last N months
 */
export const getLastNMonthsStats = (
  transactions: Transaction[],
  n: number
): MonthlyStats[] => {
  const stats: MonthlyStats[] = [];
  const now = new Date();
  
  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    stats.push(
      calculateMonthlyStats(transactions, date.getFullYear(), date.getMonth())
    );
  }
  
  return stats;
};

/**
 * Get top spending categories for a month
 */
export const getTopCategories = (
  monthlyStats: MonthlyStats,
  limit: number = 5
): Array<{ category: string; amount: number; percentage: number }> => {
  const { categoryBreakdown, totalSpent } = monthlyStats;
  
  return Object.entries(categoryBreakdown)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

/**
 * Format currency (Kenyan Shillings)
 */
export const formatCurrency = (amount: number): string => {
  return `KSh ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Get daily spending average for a month
 */
export const getDailyAverage = (monthlyStats: MonthlyStats): number => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return monthlyStats.totalSpent / daysInMonth;
};

/**
 * Compare current month with previous month
 */
export const compareWithPreviousMonth = (
  transactions: Transaction[]
): {
  current: MonthlyStats;
  previous: MonthlyStats;
  spendingChange: number;
  spendingChangePercentage: number;
} => {
  const now = new Date();
  const current = calculateMonthlyStats(
    transactions,
    now.getFullYear(),
    now.getMonth()
  );
  
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previous = calculateMonthlyStats(
    transactions,
    prevDate.getFullYear(),
    prevDate.getMonth()
  );
  
  const spendingChange = current.totalSpent - previous.totalSpent;
  const spendingChangePercentage =
    previous.totalSpent > 0
      ? (spendingChange / previous.totalSpent) * 100
      : 0;
  
  return {
    current,
    previous,
    spendingChange,
    spendingChangePercentage,
  };
};