import { QuickSQLiteConnection, open, QueryResult } from 'react-native-quick-sqlite';

const DB_NAME = 'mpesa_analyzer.db';

export interface Transaction {
  id: string;
  sms_id?: string;
  type: 'sent' | 'received' | 'payment' | 'withdrawal' | 'airtime' | 'unknown';
  amount: number;
  recipient: string;
  sender: string;
  balance: number;
  transactionCode: string;
  date: string;
  rawMessage: string;
  category: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  color: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  type: string;
  frequency: string;
}

export interface AccountBalance {
  id: string;
  account_type: 'mpesa' | 'bank' | 'cash';
  balance: number;
  last_updated: string;
}

export interface AIInsight {
  id: string;
  type: 'alert' | 'warning' | 'tip' | 'pattern';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  date: string;
  is_read: boolean;
}

class DatabaseService {
  private db: QuickSQLiteConnection | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      console.log('[DEBUG] Initializing DatabaseService...');

      if (typeof open !== 'function') {
        console.error('[ERROR] react-native-quick-sqlite "open" is not a function. Native module not linked!');
        return;
      }

      console.log('[DEBUG] Opening database:', DB_NAME);
      this.db = open({ name: DB_NAME });

      if (!this.db) {
        console.error('[ERROR] Database open returned null');
        return;
      }

      console.log('[DEBUG] Database opened successfully');
      this.initTables();
    } catch (e) {
      console.error('[ERROR] Exception during database initialization:', e);
    }
  }

  private initTables() {
    if (!this.db) {
      console.error('[ERROR] Cannot initialize tables: No database connection');
      return;
    }

    try {
      // Create Transactions Table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          sms_id TEXT UNIQUE,
          type TEXT,
          amount REAL,
          recipient TEXT,
          sender TEXT,
          balance REAL,
          transaction_code TEXT,
          date TEXT,
          raw_message TEXT,
          category TEXT
        );
      `);

      // Create Savings Goals Table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS savings_goals (
          id TEXT PRIMARY KEY,
          title TEXT,
          target_amount REAL,
          current_amount REAL,
          deadline TEXT,
          icon TEXT,
          color TEXT
        );
      `);

      // Create Income Sources Table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS income_sources (
          id TEXT PRIMARY KEY,
          name TEXT,
          amount REAL,
          type TEXT,
          frequency TEXT
        );
      `);

      // Create Account Balances Table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS account_balances (
          id TEXT PRIMARY KEY,
          account_type TEXT,
          balance REAL,
          last_updated TEXT
        );
      `);

      // Create AI Insights Table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS ai_insights (
          id TEXT PRIMARY KEY,
          type TEXT,
          title TEXT,
          message TEXT,
          severity TEXT,
          date TEXT,
          is_read INTEGER
        );
      `);

      // Create Sync State Table
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS sync_state (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // Create Indexes for performance
      this.db.execute('CREATE INDEX IF NOT EXISTS idx_date ON transactions(date);');
      this.db.execute('CREATE INDEX IF NOT EXISTS idx_type ON transactions(type);');

      this.isInitialized = true;
      console.log('[DEBUG] Database tables and indexes initialized');
    } catch (e) {
      console.error('[ERROR] Failed to initialize tables:', e);
    }
  }

  public getLastScannedTimestamp(): number {
    console.log('[DEBUG] Getting last scanned timestamp');
    if (!this.db) {
      console.log('[DEBUG] No database connection for getLastScannedTimestamp');
      return 0;
    }

    try {
      const result = this.db.execute('SELECT value FROM sync_state WHERE key = ?', ['last_scanned_timestamp']);
      if (result.rows && result.rows.length > 0) {
        const timestamp = parseInt(result.rows.item(0).value, 10);
        console.log('[DEBUG] Last scanned timestamp found:', timestamp);
        return timestamp;
      }
    } catch (e) {
      console.error('[ERROR] Failed to get last scanned timestamp:', e);
    }

    console.log('[DEBUG] No last scanned timestamp found, returning 0');
    return 0;
  }

  public setLastScannedTimestamp(timestamp: number) {
    this.saveSyncState('last_scanned_timestamp', timestamp.toString());
  }

  public getSyncState(key: string): string | null {
    if (!this.db) return null;
    try {
      const result = this.db.execute('SELECT value FROM sync_state WHERE key = ?', [key]);
      if (result.rows && result.rows.length > 0) {
        return result.rows.item(0).value;
      }
    } catch (e) {
      console.error(`[ERROR] Failed to get sync state for ${key}:`, e);
    }
    return null;
  }

  public saveSyncState(key: string, value: string): void {
    if (!this.db) return;
    try {
      this.db.execute('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [key, value]);
    } catch (e) {
      console.error(`[ERROR] Failed to save sync state for ${key}:`, e);
    }
  }

  public async saveTransactions(transactions: Transaction[]): Promise<void> {
    console.log('[DEBUG] Saving transactions to database, count:', transactions.length);
    if (!this.db) {
      console.error('[ERROR] No database connection for saveTransactions');
      return;
    }

    if (transactions.length === 0) {
      console.log('[DEBUG] No transactions to save');
      return;
    }

    try {
      // Use a transaction for bulk insert
      await this.db.transaction((tx) => {
        transactions.forEach(t => {
          tx.execute(
            `INSERT OR IGNORE INTO transactions 
            (id, sms_id, type, amount, recipient, sender, balance, transaction_code, date, raw_message, category) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              t.id,
              t.sms_id || t.id,
              t.type,
              t.amount,
              t.recipient,
              t.sender,
              t.balance,
              t.transactionCode,
              t.date,
              t.rawMessage,
              t.category
            ]
          );
        });
      });
      console.log('[DEBUG] Successfully saved all transactions in batch');
    } catch (e) {
      console.error('[ERROR] Failed to save transactions batch:', e);
    }
  }

  public async updateTransactionCategory(id: string, category: string): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute('UPDATE transactions SET category = ? WHERE id = ?', [category, id]);
    } catch (e) {
      console.error('[ERROR] Failed to update transaction category:', e);
    }
  }

  public getTransactions(limit: number = 50, offset: number = 0): Transaction[] {
    console.log('[DEBUG] Getting transactions from database, limit:', limit, 'offset:', offset);
    if (!this.db) {
      console.log('[DEBUG] No database connection for getTransactions');
      return [];
    }

    try {
      const result = this.db.execute(
        'SELECT * FROM transactions ORDER BY date DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );

      const transactions: Transaction[] = [];
      if (result.rows) {
        console.log('[DEBUG] Database returned rows:', result.rows.length);
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows.item(i);
          transactions.push(this.mapRowToTransaction(row));
        }
      }
      return transactions;
    } catch (e) {
      console.error('[ERROR] Failed to fetch transactions:', e);
      return [];
    }
  }

  public getAllTransactions(startDate?: Date, endDate?: Date): Transaction[] {
    if (!this.db) return [];

    try {
      let query = 'SELECT * FROM transactions';
      const params: any[] = [];

      if (startDate && endDate) {
        query += ' WHERE date >= ? AND date <= ?';
        params.push(startDate.toISOString(), endDate.toISOString());
      }

      query += ' ORDER BY date DESC';

      const result = this.db.execute(query, params);

      const transactions: Transaction[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          transactions.push(this.mapRowToTransaction(result.rows.item(i)));
        }
      }
      return transactions;
    } catch (e) {
      console.error('[ERROR] Failed to fetch all transactions:', e);
      return [];
    }
  }

  public getFrequentContacts(type: 'sent' | 'received', limit: number = 10) {
    if (!this.db) return [];

    try {
      const column = type === 'sent' ? 'recipient' : 'sender';

      const result = this.db.execute(`
        SELECT ${column} as name, COUNT(*) as count, SUM(amount) as total
        FROM transactions
        WHERE type = ? AND ${column} != ''
        GROUP BY ${column}
        ORDER BY count DESC
        LIMIT ?
      `, [type, limit]);

      const contacts: any[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          contacts.push(result.rows.item(i));
        }
      }
      return contacts;
    } catch (e) {
      console.error('[ERROR] Failed to fetch frequent contacts:', e);
      return [];
    }
  }

  public getTopContacts(type: 'sent' | 'received', limit: number = 10) {
    if (!this.db) return [];

    try {
      const column = type === 'sent' ? 'recipient' : 'sender';

      const result = this.db.execute(`
        SELECT ${column} as name, COUNT(*) as count, SUM(amount) as total
        FROM transactions
        WHERE type = ? AND ${column} != ''
        GROUP BY ${column}
        ORDER BY total DESC
        LIMIT ?
      `, [type, limit]);

      const contacts: any[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          contacts.push(result.rows.item(i));
        }
      }
      return contacts;
    } catch (e) {
      console.error('[ERROR] Failed to fetch top contacts:', e);
      return [];
    }
  }

  // Savings Goals
  public async saveSavingsGoal(goal: SavingsGoal): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute(
        `INSERT OR REPLACE INTO savings_goals (id, title, target_amount, current_amount, deadline, icon, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [goal.id, goal.title, goal.target_amount, goal.current_amount, goal.deadline, goal.icon, goal.color]
      );
    } catch (e) {
      console.error('[ERROR] Failed to save savings goal:', e);
    }
  }

  public getSavingsGoals(): SavingsGoal[] {
    if (!this.db) return [];
    try {
      const result = this.db.execute('SELECT * FROM savings_goals');
      const goals: SavingsGoal[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          goals.push(result.rows.item(i));
        }
      }
      return goals;
    } catch (e) {
      console.error('[ERROR] Failed to get savings goals:', e);
      return [];
    }
  }

  public async deleteSavingsGoal(id: string): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute('DELETE FROM savings_goals WHERE id = ?', [id]);
    } catch (e) {
      console.error('[ERROR] Failed to delete savings goal:', e);
    }
  }

  // Income Sources
  public async saveIncomeSource(source: IncomeSource): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute(
        `INSERT OR REPLACE INTO income_sources (id, name, amount, type, frequency)
         VALUES (?, ?, ?, ?, ?)`,
        [source.id, source.name, source.amount, source.type, source.frequency]
      );
    } catch (e) {
      console.error('[ERROR] Failed to save income source:', e);
    }
  }

  public getIncomeSources(): IncomeSource[] {
    if (!this.db) return [];
    try {
      const result = this.db.execute('SELECT * FROM income_sources');
      const sources: IncomeSource[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          sources.push(result.rows.item(i));
        }
      }
      return sources;
    } catch (e) {
      console.error('[ERROR] Failed to get income sources:', e);
      return [];
    }
  }

  public async deleteIncomeSource(id: string): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute('DELETE FROM income_sources WHERE id = ?', [id]);
    } catch (e) {
      console.error('[ERROR] Failed to delete income source:', e);
    }
  }

  // Account Balances
  public async updateAccountBalance(balance: AccountBalance): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute(
        `INSERT OR REPLACE INTO account_balances (id, account_type, balance, last_updated)
         VALUES (?, ?, ?, ?)`,
        [balance.id, balance.account_type, balance.balance, balance.last_updated]
      );
    } catch (e) {
      console.error('[ERROR] Failed to update account balance:', e);
    }
  }

  public getAccountBalances(): AccountBalance[] {
    if (!this.db) return [];
    try {
      const result = this.db.execute('SELECT * FROM account_balances');
      const balances: AccountBalance[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          balances.push(result.rows.item(i));
        }
      }
      return balances;
    } catch (e) {
      console.error('[ERROR] Failed to get account balances:', e);
      return [];
    }
  }

  // AI Insights
  public async saveAIInsight(insight: AIInsight): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute(
        `INSERT OR REPLACE INTO ai_insights (id, type, title, message, severity, date, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [insight.id, insight.type, insight.title, insight.message, insight.severity, insight.date, insight.is_read ? 1 : 0]
      );
    } catch (e) {
      console.error('[ERROR] Failed to save AI insight:', e);
    }
  }

  public getAIInsights(limit: number = 20): AIInsight[] {
    if (!this.db) return [];
    try {
      const result = this.db.execute('SELECT * FROM ai_insights ORDER BY date DESC LIMIT ?', [limit]);
      const insights: AIInsight[] = [];
      if (result.rows) {
        for (let i = 0; i < result.rows.length; i++) {
          const row = result.rows.item(i);
          insights.push({
            ...row,
            is_read: row.is_read === 1
          });
        }
      }
      return insights;
    } catch (e) {
      console.error('[ERROR] Failed to get AI insights:', e);
      return [];
    }
  }

  public async markInsightRead(id: string): Promise<void> {
    if (!this.db) return;
    try {
      this.db.execute('UPDATE ai_insights SET is_read = 1 WHERE id = ?', [id]);
    } catch (e) {
      console.error('[ERROR] Failed to mark insight read:', e);
    }
  }

  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      sms_id: row.sms_id,
      type: row.type as any,
      amount: row.amount,
      recipient: row.recipient,
      sender: row.sender,
      balance: row.balance,
      transactionCode: row.transaction_code,
      date: row.date,
      rawMessage: row.raw_message,
      category: row.category
    };
  }
}

export default new DatabaseService();

