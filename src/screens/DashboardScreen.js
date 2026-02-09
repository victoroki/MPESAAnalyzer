import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  FlatList
} from 'react-native';
import { useLoading } from '../contexts/LoadingContext';
import { PieChart } from 'react-native-chart-kit';
import ArcChart from '../components/ArcChart';
import DatabaseService from '../services/DatabaseService';
import {
  calculateMonthlyStats,
  formatCurrency,
  getDailyAverage,
  getTopCategories,
} from '../utils/transactionHelpers';
import MonthSelector from '../components/MonthSelector';
import { format } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;

const DashboardScreen = ({ transactions = [], onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { showLoading, hideLoading } = useLoading();
  
  // Financial Tracking State
  const [incomeSources, setIncomeSources] = useState([]);
  const [accountBalances, setAccountBalances] = useState([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newIncome, setNewIncome] = useState({ name: '', amount: '', type: 'salary' });
  const [bankBalance, setBankBalance] = useState('');

  // Load financial data
  React.useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = () => {
    setIncomeSources(DatabaseService.getIncomeSources());
    setAccountBalances(DatabaseService.getAccountBalances());
    const bank = DatabaseService.getAccountBalances().find(b => b.account_type === 'bank');
    if (bank) setBankBalance(bank.balance.toString());
  };

  const handleSaveIncome = async () => {
    if (!newIncome.name || !newIncome.amount) return;
    await DatabaseService.saveIncomeSource({
      id: Date.now().toString(),
      name: newIncome.name,
      amount: parseFloat(newIncome.amount),
      type: newIncome.type,
      frequency: 'monthly'
    });
    setNewIncome({ name: '', amount: '', type: 'salary' });
    loadFinancialData();
  };

  const handleUpdateBankBalance = async () => {
    if (!bankBalance) return;
    await DatabaseService.updateAccountBalance({
      id: 'bank_main',
      account_type: 'bank',
      balance: parseFloat(bankBalance),
      last_updated: new Date().toISOString()
    });
    loadFinancialData();
    Alert.alert('Success', 'Bank balance updated');
  };

  const handleDeleteIncome = async (id) => {
    await DatabaseService.deleteIncomeSource(id);
    loadFinancialData();
  };

  const currentMonthStats = calculateMonthlyStats(
    transactions,
    selectedDate.getFullYear(),
    selectedDate.getMonth()
  );

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

  const topCategories = getTopCategories(currentMonthStats, 5);
  const dailyAverage = getDailyAverage(currentMonthStats);

  const latestBalance = transactions.length > 0
    ? transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].balance
    : 0;

  // Calculate Net Worth
  const bankBal = accountBalances.find(b => b.account_type === 'bank')?.balance || 0;
  const cashBal = accountBalances.find(b => b.account_type === 'cash')?.balance || 0;
  const totalNetWorth = latestBalance + bankBal + cashBal;

  // Calculate Total Monthly Income (Sources + Received Transactions)
  const monthlyIncomeSources = incomeSources.reduce((sum, src) => sum + src.amount, 0);

  const chartColors = ['#C5A358', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#4B5563'];
  const pieData = Object.entries(currentMonthStats.categoryBreakdown)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount], i) => ({
      name,
      amount,
      color: chartColors[i % 5],
      legendFontColor: '#6B7280',
      legendFontSize: 12,
    }));

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

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Generate month tabs
  const getMonthTabs = () => {
    const tabs = [];
    for (let i = 0; i < 4; i++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      tabs.push({
        label: format(date, 'MMMM').toUpperCase(),
        date: date,
        isActive: i === 0
      });
    }
    return tabs;
  };

  const monthTabs = getMonthTabs();

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#080D1D" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Dark Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.portfolioLabel}>PORTFOLIO ACCOUNT</Text>
              <Text style={styles.welcomeText}>
                Welcome, <Text style={styles.nameText}>Victor</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <View style={styles.notificationDot} />
              <Text style={styles.bellIcon}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <TouchableOpacity style={styles.balanceCard} onPress={() => setShowManageModal(true)}>
            <Text style={styles.balanceLabel}>TOTAL NET WORTH</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.currencyLabel}>KSh</Text>
              <Text style={styles.balanceAmount}>
                {totalNetWorth.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.goldLine} />
            <View style={styles.verifiedContainer}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedText}>MPESA: {latestBalance.toLocaleString()} • BANK: {bankBal.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>

          {/* Month Tabs */}
          <View style={styles.monthTabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthTabsScroll}
            >
              {monthTabs.map((tab, idx) => (
                <TouchableOpacity
                  key={tab.label}
                  style={[
                    styles.monthTab,
                    idx === 0 ? styles.monthTabActive : styles.monthTabInactive
                  ]}
                  onPress={() => setSelectedDate(tab.date)}
                >
                  <Text style={[
                    styles.monthTabText,
                    idx === 0 ? styles.activeMonthText : styles.inactiveMonthText
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* White Content Section */}
        <View style={styles.content}>
          {/* Net Flow Card */}
          <View style={styles.netFlowCard}>
            <View style={styles.netFlowTop}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>{displayStats.netBalance >= 0 ? '💼' : '📉'}</Text>
              </View>
              <View style={styles.netFlowHeader}>
                <Text style={styles.netFlowTitle}>Net Flow</Text>
                <Text style={styles.netFlowSubtitle}>MONTHLY ANALYTICS</Text>
              </View>
              {selectedPeriod === 'month' && previousMonthStats.totalSpent > 0 && (
                <View style={[
                  styles.growthBadge,
                  spendingChange > 0 ? styles.growthBadgeNegative : styles.growthBadgePositive
                ]}>
                  <Text style={[
                    styles.growthText,
                    spendingChange > 0 ? styles.growthTextNegative : styles.growthTextPositive
                  ]}>
                    {spendingChange > 0 ? '📈' : '📉'} +{Math.abs(spendingChangePercentage).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.netFlowAmountContainer}>
              <Text style={styles.kshSymbol}>KSh</Text>
              <Text style={[
                styles.netFlowAmount,
                displayStats.netBalance >= 0 ? styles.positiveAmount : styles.negativeAmount
              ]}>
                {displayStats.netBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            {/* Simple Bar Chart */}
            <View style={styles.simpleBarChart}>
              {[0.3, 0.4, 0.5, 0.6, 0.8, 0.4, 0.3, 0.5].map((h, i) => (
                <View key={i} style={[styles.bar, {
                  height: h * 40,
                  backgroundColor: i === 4 ? '#F3E8D2' : '#E8E8E8'
                }]} />
              ))}
            </View>
          </View>

          {/* Inflow/Outflow Row */}
          <View style={styles.statsRow}>
            <View style={styles.statSquare}>
              <View style={styles.arrowCircle}>
                <Text style={styles.arrowIcon}>↓</Text>
              </View>
              <Text style={styles.statSquareLabel}>INFLOW</Text>
              <Text style={styles.statSquareAmount}>
                KSh {displayStats.totalReceived.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statSquare}>
              <View style={styles.arrowCircle}>
                <Text style={styles.arrowIcon}>↑</Text>
              </View>
              <Text style={styles.statSquareLabel}>OUTFLOW</Text>
              <Text style={styles.statSquareAmount}>
                KSh {displayStats.totalSpent.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Spending by Category - Dark Navy Theme */}
          <View style={styles.categoryCardDark}>
            <View style={styles.categoryHeaderDark}>
              <Text style={styles.categoryIconDark}>📊</Text>
              <Text style={styles.categoryCardTitleDark}>Spending by Category</Text>
            </View>

            {pieData.length > 0 ? (
              <>
                <View style={styles.doughnutContainerDark}>
                  <ArcChart
                    percentage={topCategories[0]?.percentage || 0}
                    size={180}
                    strokeWidth={18}
                    color="#8B7FFF"
                    backgroundColor="rgba(139, 127, 255, 0.15)"
                  />
                  <View style={styles.doughnutInnerDark}>
                    <Text style={styles.totalSpentLabelDark}>TOTAL SPENT</Text>
                    <Text style={styles.totalSpentAmountDark}>
                      KSh {displayStats.totalSpent.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.legendContainerDark}>
                  {topCategories.slice(0, 1).map((cat, i) => (
                    <View key={cat.category}>
                      <View style={styles.legendRowDark}>
                        <View style={styles.legendLeftDark}>
                          <View style={styles.legendDotDark} />
                          <Text style={styles.legendNameDark}>{cat.category}</Text>
                        </View>
                        <Text style={styles.legendAmountDark}>KSh {cat.amount.toLocaleString()}</Text>
                      </View>
                      <View style={styles.progressBarDark}>
                        <View style={[styles.progressBarFillDark, { width: `${cat.percentage}%` }]} />
                      </View>
                      <Text style={styles.percentageTextDark}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyStateDark}>
                <Text style={styles.emptyStateIcon}>📊</Text>
                <Text style={styles.emptyStateTextDark}>No transactions this month</Text>
              </View>
            )}
          </View>

          {/* Quick Stats - Dark Navy Theme */}
          <View style={styles.quickStatsSectionDark}>
            <View style={styles.quickStatsHeaderDark}>
              <Text style={styles.quickStatsIconDark}>⚡</Text>
              <Text style={styles.quickStatsTitleDark}>Quick Stats</Text>
            </View>
            <View style={styles.quickStatsRowDark}>
              <View style={styles.quickStatCardDark}>
                <Text style={styles.quickStatIconEmojiDark}>📄</Text>
                <Text style={styles.quickStatValueDark}>{displayStats.transactionCount}</Text>
                <Text style={styles.quickStatLabelDark}>Monthly Transactions</Text>
              </View>
              <View style={styles.quickStatCardDark}>
                <Text style={styles.quickStatIconEmojiDark}>📊</Text>
                <Text style={styles.quickStatValueDark}>KSh {dailyAverage.toFixed(0)}</Text>
                <Text style={styles.quickStatLabelDark}>Daily Average</Text>
              </View>
            </View>
          </View>
          {/* Manage Finances Modal */}
          <Modal
            visible={showManageModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowManageModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Manage Finances</Text>
                  <TouchableOpacity 
                    onPress={() => setShowManageModal(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Bank Balance Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionHeader}>Bank Balance</Text>
                    <View style={styles.inputRow}>
                      <Text style={styles.currencyPrefix}>KSh</Text>
                      <TextInput
                        style={styles.input}
                        value={bankBalance}
                        onChangeText={setBankBalance}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity 
                        style={styles.saveButton}
                        onPress={handleUpdateBankBalance}
                      >
                        <Text style={styles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Income Sources Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionHeader}>Income Sources</Text>
                    <Text style={styles.sectionSubHeader}>Regular monthly income</Text>
                    
                    {/* Add New Income */}
                    <View style={styles.addIncomeForm}>
                      <TextInput
                        style={styles.nameInput}
                        value={newIncome.name}
                        onChangeText={(text) => setNewIncome({...newIncome, name: text})}
                        placeholder="Source Name (e.g. Salary)"
                        placeholderTextColor="#9CA3AF"
                      />
                      <View style={styles.amountRow}>
                        <Text style={styles.currencyPrefix}>KSh</Text>
                        <TextInput
                          style={styles.amountInput}
                          value={newIncome.amount}
                          onChangeText={(text) => setNewIncome({...newIncome, amount: text})}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <TouchableOpacity 
                        style={styles.addButton}
                        onPress={handleSaveIncome}
                      >
                        <Text style={styles.addButtonText}>+ Add Income Source</Text>
                      </TouchableOpacity>
                    </View>

                    {/* List Existing Income */}
                    <View style={styles.incomeList}>
                      {incomeSources.map((source) => (
                        <View key={source.id} style={styles.incomeItem}>
                          <View>
                            <Text style={styles.incomeName}>{source.name}</Text>
                            <Text style={styles.incomeType}>{source.type}</Text>
                          </View>
                          <View style={styles.incomeRight}>
                            <Text style={styles.incomeAmount}>
                              KSh {source.amount.toLocaleString()}
                            </Text>
                            <TouchableOpacity 
                              onPress={() => handleDeleteIncome(source.id)}
                              style={styles.deleteButton}
                            >
                              <Text style={styles.deleteButtonText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                      {incomeSources.length === 0 && (
                        <Text style={styles.emptyText}>No income sources added yet</Text>
                      )}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... existing styles ...
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionSubHeader: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#0A1128',
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    marginBottom: 32,
  },
  addIncomeForm: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nameInput: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addButton: {
    backgroundColor: '#C5A358',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  incomeList: {
    gap: 12,
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  incomeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  incomeType: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  incomeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: -2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },

  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Slightly lighter grey for better contrast
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    backgroundColor: '#0A1128', // Deeper navy
    paddingTop: 50,
    paddingBottom: 90, // Increased to allow more overlap
    paddingHorizontal: 24,
    borderBottomLeftRadius: 50, // More rounded
    borderBottomRightRadius: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  portfolioLabel: {
    color: '#94A3B8',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '300',
  },
  nameText: {
    fontWeight: '600',
    color: '#F8FAFC',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C5A358',
    borderWidth: 1,
    borderColor: '#0A1128',
    zIndex: 1,
  },
  bellIcon: {
    fontSize: 20,
    color: '#F1F5F9',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  currencyLabel: {
    color: '#C5A358',
    fontSize: 24,
    marginRight: 8,
    fontWeight: '400',
    fontFamily: 'serif',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  goldLine: {
    width: 40,
    height: 2,
    backgroundColor: '#C5A358',
    marginVertical: 12,
    borderRadius: 1,
    opacity: 0.5,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  monthTabsContainer: {
    marginTop: 4,
  },
  monthTabsScroll: {
    paddingRight: 24,
  },
  monthTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
  },
  monthTabActive: {
    backgroundColor: '#C5A358',
    borderColor: '#C5A358',
  },
  monthTabInactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  monthTabText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeMonthText: {
    color: '#0A1128',
  },
  inactiveMonthText: {
    color: '#94A3B8',
  },
  content: {
    paddingHorizontal: 24,
    marginTop: -50, // Pull up to overlap header
  },
  netFlowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  netFlowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconEmoji: {
    fontSize: 22,
  },
  netFlowHeader: {
    flex: 1,
  },
  netFlowTitle: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 2,
  },
  netFlowSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  growthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  growthBadgePositive: {
    backgroundColor: '#DCFCE7',
  },
  growthBadgeNegative: {
    backgroundColor: '#FEE2E2',
  },
  growthText: {
    fontSize: 11,
    fontWeight: '700',
  },
  growthTextPositive: {
    color: '#15803D',
  },
  growthTextNegative: {
    color: '#B91C1C',
  },
  netFlowAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  kshSymbol: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 6,
  },
  netFlowAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -1,
  },
  positiveAmount: {
    color: '#0F172A',
  },
  negativeAmount: {
    color: '#EF4444',
  },
  simpleBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 48,
    gap: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 6, // Softer bars
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statSquare: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrowIcon: {
    color: '#D97706',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statSquareLabel: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statSquareAmount: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  // Reverted to White Theme for Category
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9', // Very light grey for icon bg
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryCardTitle: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '700',
  },
  italicGold: {
    fontStyle: 'italic',
    color: '#D97706', // Gold/Amber
    fontFamily: 'serif',
  },
  doughnutContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  doughnutInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalSpentLabel: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  totalSpentAmount: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  legendContainer: {
    gap: 16,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  legendName: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  legendRight: {
    alignItems: 'flex-end',
  },
  legendAmount: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 2,
  },
  legendPercent: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
  },

  quickStatsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 4,
  },
  quickStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickStatsIcon: {
    fontSize: 20,
  },
  quickStatsTitle: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '700',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
  },
  quickStatIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickStatIconEmoji: {
    fontSize: 16,
  },
  quickStatValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  // Dark Navy Theme Styles
  categoryCardDark: {
    backgroundColor: '#1E293B',
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  categoryHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryIconDark: {
    fontSize: 22,
    marginRight: 12,
  },
  categoryCardTitleDark: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  doughnutContainerDark: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  doughnutInnerDark: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalSpentLabelDark: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  totalSpentAmountDark: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  legendContainerDark: {
    marginTop: 10,
  },
  legendRowDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendLeftDark: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendDotDark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B7FFF',
    marginRight: 12,
  },
  legendNameDark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  legendAmountDark: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressBarDark: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBarFillDark: {
    height: '100%',
    backgroundColor: '#8B7FFF',
    borderRadius: 3,
  },
  percentageTextDark: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    fontWeight: '600',
  },
  emptyStateDark: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateTextDark: {
    fontSize: 14,
    color: '#94A3B8',
  },
  quickStatsSectionDark: {
    backgroundColor: '#1E293B',
    borderRadius: 32,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  quickStatsHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickStatsIconDark: {
    fontSize: 22,
    marginRight: 12,
  },
  quickStatsTitleDark: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  quickStatsRowDark: {
    flexDirection: 'row',
    gap: 16,
  },
  quickStatCardDark: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  quickStatIconEmojiDark: {
    fontSize: 32,
    marginBottom: 12,
  },
  quickStatValueDark: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 6,
  },
  quickStatLabelDark: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default DashboardScreen;