import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Plus, Target, MessageSquare, Lightbulb, TrendingUp, AlertTriangle, Info, CheckCircle, X, ShoppingBag, Key } from 'lucide-react-native';
import DatabaseService, { SavingsGoal, AIInsight } from '../services/DatabaseService';
import GeminiService, { ChatMessage, SpendingInsight } from '../services/GeminiService';
import { getLastNMonthsStats } from '../utils/transactionHelpers';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const AIAssistantScreen = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'goals' | 'insights'>('chat');
  const [loading, setLoading] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Goals State
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', deadline: '' });

  // Insights State
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // FAB & Purchase Planner State
  const [fabOpen, setFabOpen] = useState(false);
  const [showPurchasePlanner, setShowPurchasePlanner] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState({ name: '', cost: '' });

  // API Key State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedGoals = DatabaseService.getSavingsGoals();
    setGoals(loadedGoals);
    const loadedInsights = DatabaseService.getAIInsights();
    setInsights(loadedInsights);
  };

  const handleAIError = (error: any) => {
    setLoading(false);
    if (error.message === 'API_KEY_MISSING') {
      setShowApiKeyModal(true);
    } else {
      Alert.alert('Error', 'AI Operation Failed');
      console.error(error);
    }
  };

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Validation', 'Please enter a valid API Key');
      return;
    }
    GeminiService.setApiKey(apiKeyInput.trim());
    setShowApiKeyModal(false);
    setApiKeyInput('');
    Alert.alert('Success', 'API Key saved! You can now use AI features.');
  };

  // --- Chat Functions ---
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Gather context
      const allTransactions = DatabaseService.getAllTransactions();
      const last3Months = getLastNMonthsStats(allTransactions, 3);
      const avgMonthlySpending = last3Months.reduce((sum, m) => sum + m.totalSpent, 0) / (last3Months.length || 1);
      
      const transactions = DatabaseService.getTransactions(10);
      const incomeSources = DatabaseService.getIncomeSources();
      const accountBalances = DatabaseService.getAccountBalances();
      
      const totalMonthlyIncome = incomeSources.reduce((sum, src) => sum + src.amount, 0);
      const totalNetWorth = accountBalances.reduce((sum, acc) => sum + acc.balance, 0);

      const context = `
        User has ${goals.length} savings goals.
        Total Monthly Income: ${totalMonthlyIncome}.
        Avg Monthly Spending (last 3 months): ${avgMonthlySpending.toFixed(2)}.
        Disposable Income (approx): ${(totalMonthlyIncome - avgMonthlySpending).toFixed(2)}.
        Total Net Worth: ${totalNetWorth}.
        Income Sources: ${incomeSources.map(i => `${i.name} (${i.amount})`).join(', ')}.
        Recent transactions: ${transactions.map(t => `${t.type} ${t.amount} to ${t.recipient}`).join(', ')}.
      `;

      const responseText = await GeminiService.chat(userMsg.text, context);
      const aiMsg: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      handleAIError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Goal Functions ---
  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.target) {
      Alert.alert('Validation', 'Please fill in title and target amount');
      return;
    }

    const goal: SavingsGoal = {
      id: Date.now().toString(),
      title: newGoal.title,
      target_amount: parseFloat(newGoal.target),
      current_amount: 0,
      deadline: newGoal.deadline,
      icon: 'target',
      color: '#6366F1'
    };

    await DatabaseService.saveSavingsGoal(goal);
    setGoals(DatabaseService.getSavingsGoals());
    setShowAddGoal(false);
    setNewGoal({ title: '', target: '', deadline: '' });
  };

  const updateGoalProgress = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    if (goal) {
      const updated = { ...goal, current_amount: Math.min(goal.current_amount + amount, goal.target_amount) };
      await DatabaseService.saveSavingsGoal(updated);
      setGoals(DatabaseService.getSavingsGoals());
    }
  };

  // --- Insight Functions ---
  const categorizeUncategorized = async () => {
    setLoading(true);
    try {
      const allTransactions = DatabaseService.getAllTransactions();
      const uncategorized = allTransactions.filter(t => 
        !t.category || t.category === 'Other' || t.category === 'General'
      ).slice(0, 5); // Process 5 at a time to be safe

      if (uncategorized.length === 0) {
        Alert.alert('Info', 'No uncategorized transactions found!');
        return;
      }

      let count = 0;
      for (const t of uncategorized) {
        const newCategory = await GeminiService.categorizeTransaction(t);
        if (newCategory && newCategory !== 'Other') {
          await DatabaseService.updateTransactionCategory(t.id, newCategory);
          count++;
        }
      }
      
      Alert.alert('Success', `Categorized ${count} transactions.`);
      // Refresh context/data if needed
    } catch (error) {
      handleAIError(error);
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setLoading(true);
    try {
      const transactions = DatabaseService.getTransactions(50);
      const newInsights = await GeminiService.analyzeSpendingPatterns(transactions);
      
      for (const insight of newInsights) {
        await DatabaseService.saveAIInsight({
          id: Date.now().toString() + Math.random(),
          ...insight,
          date: new Date().toISOString(),
          is_read: false
        });
      }
      setInsights(DatabaseService.getAIInsights());
    } catch (error) {
      handleAIError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Purchase Planner Functions ---
  const handlePlanPurchase = async () => {
    if (!purchaseItem.name || !purchaseItem.cost) {
      Alert.alert('Validation', 'Please fill in item name and cost');
      return;
    }

    setShowPurchasePlanner(false);
    setActiveTab('chat');
    
    const cost = parseFloat(purchaseItem.cost);
    const userQuery = `Can I afford to buy ${purchaseItem.name} for KSh ${cost}?`;
    
    const userMsg: ChatMessage = { role: 'user', text: userQuery };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setPurchaseItem({ name: '', cost: '' }); // Reset

    try {
       // Gather context (same as chat)
       const allTransactions = DatabaseService.getAllTransactions();
       const last3Months = getLastNMonthsStats(allTransactions, 3);
       const avgMonthlySpending = last3Months.reduce((sum, m) => sum + m.totalSpent, 0) / (last3Months.length || 1);
       
       const incomeSources = DatabaseService.getIncomeSources();
       const accountBalances = DatabaseService.getAccountBalances();
       
       const totalMonthlyIncome = incomeSources.reduce((sum, src) => sum + src.amount, 0);
       const totalNetWorth = accountBalances.reduce((sum, acc) => sum + acc.balance, 0);
       const disposableIncome = totalMonthlyIncome - avgMonthlySpending;

       const context = `
         User wants to buy: ${purchaseItem.name} for KSh ${cost}.
         Total Net Worth: ${totalNetWorth}.
         Monthly Income: ${totalMonthlyIncome}.
         Avg Monthly Spending: ${avgMonthlySpending.toFixed(2)}.
         Disposable Income: ${disposableIncome.toFixed(2)}.
         Savings Goals: ${goals.map(g => `${g.title} (Target: ${g.target_amount}, Current: ${g.current_amount})`).join(', ')}.
         
         Analyze if the user can afford this purchase. Consider:
         1. If it fits within disposable income.
         2. If it requires dipping into savings/net worth.
         3. Impact on savings goals.
         Provide a recommendation (Yes, No, or Wait).
       `;

       const responseText = await GeminiService.chat(userQuery, context);
       const aiMsg: ChatMessage = { role: 'model', text: responseText };
       setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      handleAIError(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Functions ---
  const renderTabButton = (id: 'chat' | 'goals' | 'insights', icon: any, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === id && styles.activeTabButton]}
      onPress={() => setActiveTab(id)}
    >
      {icon}
      <Text style={[styles.tabLabel, activeTab === id && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderChat = () => (
    <View style={styles.chatContainer}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble,
            item.role === 'user' ? styles.userBubble : styles.aiBubble
          ]}>
            <Text style={[
              styles.messageText,
              item.role === 'user' ? styles.userMessageText : styles.aiMessageText
            ]}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Lightbulb size={48} color="#CBD5E1" />
            <Text style={styles.emptyChatText}>Ask me anything about your finances!</Text>
            <Text style={styles.emptyChatSubtext}>Try "How much did I spend on food?" or "Create a savings plan"</Text>
          </View>
        }
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.disabledSendButton]} 
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Send size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGoals = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity style={styles.addGoalCard} onPress={() => setShowAddGoal(true)}>
        <View style={styles.addGoalIcon}>
          <Plus size={24} color="#6366F1" />
        </View>
        <Text style={styles.addGoalText}>Create New Goal</Text>
      </TouchableOpacity>

      {goals.map(goal => {
        const progress = (goal.current_amount / goal.target_amount) * 100;
        return (
          <View key={goal.id} style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View style={[styles.iconContainer, { backgroundColor: goal.color + '20' }]}>
                <Target size={20} color={goal.color} />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalDeadline}>Due {new Date(goal.deadline).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.goalAmount}>{goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: goal.color }]} />
            </View>
            <View style={styles.goalActions}>
              <TouchableOpacity onPress={() => updateGoalProgress(goal.id, 500)}>
                <Text style={[styles.actionText, { color: goal.color }]}>+ Add 500</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                DatabaseService.deleteSavingsGoal(goal.id);
                loadData();
              }}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderInsights = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity style={styles.refreshButton} onPress={refreshInsights} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.refreshButtonText}>Generate New Insights</Text>}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: '#10B981', marginTop: 10 }]} 
        onPress={categorizeUncategorized} 
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.refreshButtonText}>Auto-Categorize Transactions</Text>}
      </TouchableOpacity>
      
      {insights.length === 0 && (
         <View style={styles.emptyState}>
           <Text style={styles.emptyStateText}>No insights yet. Tap the button to analyze your spending.</Text>
         </View>
      )}

      {insights.map(insight => (
        <View key={insight.id} style={[styles.insightCard, styles[`severity${insight.severity}`]]}>
          <View style={styles.insightHeader}>
            {insight.type === 'alert' && <AlertTriangle size={20} color="#EF4444" />}
            {insight.type === 'warning' && <Info size={20} color="#F59E0B" />}
            {insight.type === 'tip' && <Lightbulb size={20} color="#10B981" />}
            {insight.type === 'pattern' && <TrendingUp size={20} color="#6366F1" />}
            <Text style={styles.insightTitle}>{insight.title}</Text>
          </View>
          <Text style={styles.insightMessage}>{insight.message}</Text>
          <Text style={styles.insightDate}>{new Date(insight.date).toLocaleDateString()}</Text>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
      </View>

      <View style={styles.tabBar}>
        {renderTabButton('chat', <MessageSquare size={20} color={activeTab === 'chat' ? '#6366F1' : '#64748B'} />, 'Chat')}
        {renderTabButton('goals', <Target size={20} color={activeTab === 'goals' ? '#6366F1' : '#64748B'} />, 'Goals')}
        {renderTabButton('insights', <Lightbulb size={20} color={activeTab === 'insights' ? '#6366F1' : '#64748B'} />, 'Insights')}
      </View>

      <View style={styles.content}>
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'goals' && renderGoals()}
        {activeTab === 'insights' && renderInsights()}
      </View>

      {/* Add Goal Modal */}
      <Modal visible={showAddGoal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Savings Goal</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Goal Title (e.g. New Phone)"
              value={newGoal.title}
              onChangeText={t => setNewGoal(prev => ({ ...prev, title: t }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Target Amount"
              keyboardType="numeric"
              value={newGoal.target}
              onChangeText={t => setNewGoal(prev => ({ ...prev, target: t }))}
            />
             <TextInput
              style={styles.modalInput}
              placeholder="Deadline (YYYY-MM-DD)"
              value={newGoal.deadline}
              onChangeText={t => setNewGoal(prev => ({ ...prev, deadline: t }))}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddGoal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddGoal}>
                <Text style={styles.saveButtonText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Purchase Planner Modal */}
      <Modal visible={showPurchasePlanner} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Plan a Purchase</Text>
            <Text style={styles.modalSubtitle}>AI will analyze if you can afford this.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Item Name (e.g. New Laptop)"
              value={purchaseItem.name}
              onChangeText={t => setPurchaseItem(prev => ({ ...prev, name: t }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Cost (KSh)"
              keyboardType="numeric"
              value={purchaseItem.cost}
              onChangeText={t => setPurchaseItem(prev => ({ ...prev, cost: t }))}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPurchasePlanner(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handlePlanPurchase}>
                <Text style={styles.saveButtonText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* API Key Modal */}
      <Modal visible={showApiKeyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gemini API Key Required</Text>
              <Key size={24} color="#F59E0B" />
            </View>
            <Text style={styles.modalSubtitle}>
              To use AI features, you need a free Gemini API Key from Google.
            </Text>
            <Text style={[styles.modalSubtitle, { color: '#6366F1' }]}>
              https://aistudio.google.com/app/apikey
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Paste your API Key here"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowApiKeyModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveApiKey}>
                <Text style={styles.saveButtonText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      {fabOpen && (
        <View style={styles.fabMenu}>
           <TouchableOpacity 
            style={styles.fabMenuItem} 
            onPress={() => { setFabOpen(false); setShowPurchasePlanner(true); }}
          >
            <Text style={styles.fabMenuText}>Plan Purchase</Text>
            <View style={[styles.fabMenuIcon, { backgroundColor: '#10B981' }]}>
              <ShoppingBag size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.fabMenuItem} 
            onPress={() => { setFabOpen(false); setShowAddGoal(true); }}
          >
            <Text style={styles.fabMenuText}>New Goal</Text>
            <View style={[styles.fabMenuIcon, { backgroundColor: '#6366F1' }]}>
              <Target size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.fabMenuItem} 
            onPress={() => { setFabOpen(false); setActiveTab('chat'); }}
          >
            <Text style={styles.fabMenuText}>Ask AI</Text>
            <View style={[styles.fabMenuIcon, { backgroundColor: '#F59E0B' }]}>
              <MessageSquare size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.fab, fabOpen ? styles.fabActive : null]} 
        onPress={() => setFabOpen(!fabOpen)}
      >
        {fabOpen ? <X size={24} color="#fff" /> : <Plus size={24} color="#fff" />}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // ... existing styles ...
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 100,
  },
  fabActive: {
    backgroundColor: '#4F46E5',
    transform: [{ rotate: '45deg' }],
  },
  fabMenu: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    alignItems: 'flex-end',
    zIndex: 99,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fabMenuText: {
    color: '#1E293B',
    fontWeight: '600',
    marginRight: 12,
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    marginTop: -10,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabLabel: {
    color: '#6366F1',
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
  // Chat Styles
  chatContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 80, // Space for bottom tab bar
  },
  messageList: {
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#334155',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    color: '#334155',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: '#CBD5E1',
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  // Goals Styles
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  addGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  addGoalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addGoalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  goalCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  goalDeadline: {
    fontSize: 12,
    color: '#64748B',
  },
  goalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 14,
    color: '#EF4444',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0F172A',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Insights Styles
  refreshButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  severityhigh: {
    borderLeftColor: '#EF4444',
  },
  severitymedium: {
    borderLeftColor: '#F59E0B',
  },
  severitylow: {
    borderLeftColor: '#10B981',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  insightMessage: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  insightDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#64748B',
    textAlign: 'center',
  }
});

export default AIAssistantScreen;
