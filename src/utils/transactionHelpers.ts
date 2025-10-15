export const getTransactionsForMonth = (transactions, year, month) => {
  return transactions.filter(t => {
    const date = new Date(t.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
};

export const getCurrentMonthTransactions = (transactions) => {
  const now = new Date();
  return getTransactionsForMonth(transactions, now.getFullYear(), now.getMonth());
};

export const calculateMonthlyStats = (transactions, year, month) => {
  const monthTransactions = getTransactionsForMonth(transactions, year, month);
  
  let totalSpent = 0;
  let totalReceived = 0;
  const categoryBreakdown = {};

  monthTransactions.forEach(t => {
    if (t.type === 'received') {
      totalReceived += t.amount;
    } else {
      totalSpent += t.amount;
      
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

export const getCurrentMonthStats = (transactions) => {
  const now = new Date();
  return calculateMonthlyStats(transactions, now.getFullYear(), now.getMonth());
};

export const getLastNMonthsStats = (transactions, n) => {
  const stats = [];
  const now = new Date();
  
  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    stats.push(
      calculateMonthlyStats(transactions, date.getFullYear(), date.getMonth())
    );
  }
  
  return stats;
};

export const getTopCategories = (monthlyStats, limit = 5) => {
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

export const formatCurrency = (amount) => {
  return `KSh ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const getDailyAverage = (monthlyStats) => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return monthlyStats.totalSpent / daysInMonth;
};

export const compareWithPreviousMonth = (transactions) => {
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