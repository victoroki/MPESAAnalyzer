import { QuickSQLiteConnection, open } from 'react-native-quick-sqlite';

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

class DatabaseService {
  private db: QuickSQLiteConnection | null = null;

  constructor() {
    try {
      this.db = open({ name: DB_NAME });
      this.init();
    } catch (e) {
      console.error('Failed to open database', e);
    }
  }

  private init() {
    if (!this.db) return;

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
  }

  public getLastScannedTimestamp(): number {
    console.log('[DEBUG] Getting last scanned timestamp');
    if (!this.db) {
      console.log('[DEBUG] No database connection');
      return 0;
    }
    const result = this.db.execute('SELECT value FROM sync_state WHERE key = ?', ['last_scanned_timestamp']);
    if (result.rows && result.rows.length > 0) {
      const timestamp = parseInt(result.rows.item(0).value, 10);
      console.log('[DEBUG] Last scanned timestamp:', timestamp);
      return timestamp;
    }
    console.log('[DEBUG] No last scanned timestamp found, returning 0');
    return 0;
  }

  public setLastScannedTimestamp(timestamp: number) {
    console.log('[DEBUG] Setting last scanned timestamp:', timestamp);
    if (!this.db) {
      console.log('[DEBUG] No database connection');
      return;
    }
    this.db.execute('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', ['last_scanned_timestamp', timestamp.toString()]);
    console.log('[DEBUG] Last scanned timestamp set');
  }

  public saveTransactions(transactions: Transaction[]) {
    console.log('[DEBUG] Saving transactions to database, count:', transactions.length);
    if (!this.db || transactions.length === 0) {
      console.log('[DEBUG] No database or no transactions to save');
      return;
    }

    // Use a transaction for bulk insert
    this.db.transaction((tx) => {
      transactions.forEach(t => {
        console.log('[DEBUG] Saving transaction:', t);
        tx.execute(
          `INSERT OR IGNORE INTO transactions 
          (id, sms_id, type, amount, recipient, sender, balance, transaction_code, date, raw_message, category) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.sms_id || t.id, // Fallback if sms_id is missing
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
    console.log('[DEBUG] Finished saving transactions');
  }

  public getTransactions(limit: number = 50, offset: number = 0): Transaction[] {
    console.log('[DEBUG] Getting transactions from database, limit:', limit, 'offset:', offset);
    if (!this.db) {
      console.log('[DEBUG] No database connection');
      return [];
    }
    
    const result = this.db.execute(
      'SELECT * FROM transactions ORDER BY date DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const transactions: Transaction[] = [];
    if (result.rows) {
      console.log('[DEBUG] Found rows in database:', result.rows.length);
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        transactions.push({
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
        });
      }
    } else {
      console.log('[DEBUG] No rows found in database');
    }
    console.log('[DEBUG] Returning transactions count:', transactions.length);
    return transactions;
  }
  
  public getAllTransactions(startDate?: Date, endDate?: Date): Transaction[] {
    if (!this.db) return [];
    
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
        const row = result.rows.item(i);
        transactions.push({
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
        });
      }
    }
    return transactions;
  }
  
  public getFrequentContacts(type: 'sent' | 'received', limit: number = 10) {
    if (!this.db) return [];
    
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
  }
}

export default new DatabaseService();
