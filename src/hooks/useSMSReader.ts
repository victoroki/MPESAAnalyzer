import { useState, useEffect, useCallback } from 'react';
import { useLoading } from '../contexts/LoadingContext';
import DatabaseService, { Transaction } from '../services/DatabaseService';
import SyncService from '../services/SyncService';

const useSMSReader = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCachedTransactions = useCallback(() => {
    const cached = DatabaseService.getAllTransactions();
    setTransactions(cached);
  }, []);

  const readSMSMessages = useCallback(async () => {
    try {
      console.log('[DEBUG] Starting SMS reading process');
      setIsRefreshing(true);
      setError(null); // Clear previous errors

      // 1. Show cached data immediately (Instant UI)
      loadCachedTransactions();

      // 2. Sync new messages in background
      // Only show loading if we have no data at all
      if (transactions.length === 0) {
        console.log('[DEBUG] Showing loading indicator');
        showLoading('Syncing transactions...');
      }

      console.log('[DEBUG] Calling SyncService.syncMessages()');
      const newCount = await SyncService.syncMessages();
      console.log('[DEBUG] Sync completed, new messages:', newCount);

      if (newCount > 0) {
        console.log('[DEBUG] Reloading cached transactions after sync');
        // Reload from DB to get latest sorted data
        loadCachedTransactions();
      }

      hideLoading();
      setIsRefreshing(false);
      console.log('[DEBUG] SMS reading process completed');
    } catch (err) {
      console.error('[DEBUG] Error in SMS reading:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred while reading SMS messages';
      setError(errorMessage);
      hideLoading();
      setIsRefreshing(false);
    }
  }, [loadCachedTransactions, showLoading, hideLoading, transactions.length]);

  // Initial load
  useEffect(() => {
    loadCachedTransactions();
    readSMSMessages();
  }, []);

  return {
    transactions,
    error,
    readSMSMessages,
    loading: isRefreshing,
  };
};

export default useSMSReader;