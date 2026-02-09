import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { format } from 'date-fns';

const TransactionsScreen = ({ transactions = [] }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions
    .filter(t => {
      if (filter === 'all') return true;
      if (filter === 'received') return t.type === 'received';
      if (filter === 'sent') return t.type === 'sent' || t.type === 'payment' || t.type === 'withdrawal';
      return t.type === filter;
    })
    .filter(t => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        t.recipient?.toLowerCase().includes(searchLower) ||
        t.sender?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const getArrowIcon = (type) => {
    return type === 'received' ? '↙' : '↗';
  };

  const getTypeColor = (type) => {
    return type === 'received' ? '#10B981' : '#EF4444';
  };

  const getBgColor = (type) => {
    return type === 'received' ? '#ECFDF5' : '#FEF2F2';
  };

  const renderTransaction = ({ item }) => {
    const isReceived = item.type === 'received';
    const amountColor = getTypeColor(item.type);
    const bgColor = getBgColor(item.type);

    return (
      <View style={styles.transactionCard}>
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <Text style={[styles.arrowIcon, { color: amountColor }]}>
            {getArrowIcon(item.type)}
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.transactionTitle} numberOfLines={1}>
            {isReceived ? item.sender : item.recipient || 'Transaction'}
          </Text>
          <Text style={styles.transactionDate}>
            {format(new Date(item.date), 'MMM dd, yyyy • hh:mm a')}
          </Text>
          <View style={styles.tagRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category?.toUpperCase() || 'OTHER'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {isReceived ? '+' : '-'}KSh {item.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.balanceText}>
            Bal: KSh {item.balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Search Bar */}
      <View style={styles.searchHeader}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', 'Received', 'Sent', 'Payment']}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.toLowerCase())}
              style={[
                styles.filterChip,
                filter === item.toLowerCase() && styles.filterChipActive
              ]}
            >
              <Text style={[
                styles.filterChipText,
                filter === item.toLowerCase() && styles.filterChipTextActive
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
        />
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.transactionsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchIcon: {
    marginRight: 10,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 15,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    padding: 20,
    paddingTop: 10,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  arrowIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailsContainer: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 5,
  },
  tagRow: {
    flexDirection: 'row',
  },
  categoryTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
  },
});

export default TransactionsScreen;