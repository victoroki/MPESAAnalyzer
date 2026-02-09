import DatabaseService, { Transaction } from './DatabaseService';

const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SpendingInsight {
  type: 'alert' | 'warning' | 'tip' | 'pattern';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

class GeminiService {
  private apiKey: string | null = null;

  constructor() { }

  private getApiKey(): string | null {
    if (this.apiKey) return this.apiKey;
    const storedKey = DatabaseService.getSyncState('GEMINI_API_KEY');
    if (storedKey) {
      this.apiKey = storedKey;
      return storedKey;
    }
    return null;
  }

  public setApiKey(key: string) {
    this.apiKey = key;
    DatabaseService.saveSyncState('GEMINI_API_KEY', key);
  }

  private async callGemini(prompt: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn('Gemini API Key not set');
      throw new Error('API_KEY_MISSING');
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to call Gemini API');
      }

      const data = await response.json();
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }

      return 'No response from AI';
    } catch (error: any) {
      if (error.message === 'API_KEY_MISSING') {
        throw error;
      }
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  public async chat(message: string, context: string = ''): Promise<string> {
    const prompt = `
      You are a helpful financial assistant analyzing M-Pesa transactions.
      Context: ${context}
      
      User: ${message}
      
      Response:
    `;
    return this.callGemini(prompt);
  }

  public async categorizeTransaction(transaction: Transaction): Promise<string> {
    const prompt = `
      Categorize this M-Pesa transaction into one of: Food, Transport, Bills, Shopping, Entertainment, Transfer, Health, Education, Business, Other.
      Return ONLY the category name.
      
      Transaction: ${transaction.rawMessage}
      Recipient: ${transaction.recipient}
      Amount: ${transaction.amount}
    `;

    try {
      const category = await this.callGemini(prompt);
      return category.trim();
    } catch (e) {
      return 'Other';
    }
  }

  public async analyzeSpendingPatterns(transactions: Transaction[]): Promise<SpendingInsight[]> {
    // Limit transactions to save tokens/context
    const recentTransactions = transactions.slice(0, 50).map(t =>
      `${t.date}: ${t.type} ${t.amount} to ${t.recipient} (${t.category || 'Uncategorized'})`
    ).join('\n');

    const prompt = `
      Analyze these recent M-Pesa transactions and provide 3-5 brief financial insights.
      Format the output as a JSON array of objects with keys: type (alert/warning/tip/pattern), title, message, severity (low/medium/high).
      Do not include markdown formatting like \`\`\`json. Just the raw JSON.
      
      Transactions:
      ${recentTransactions}
    `;

    try {
      const response = await this.callGemini(prompt);
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (e) {
      console.error('Failed to parse insights:', e);
      return [];
    }
  }

  public async getSavingsAdvice(transactions: Transaction[], goals: any[]): Promise<string> {
    const txSummary = transactions.slice(0, 30).map(t => `${t.amount} for ${t.category}`).join(', ');
    const goalSummary = goals.map(g => `${g.title}: ${g.current_amount}/${g.target_amount}`).join(', ');

    const prompt = `
      Based on this spending: ${txSummary}
      And these savings goals: ${goalSummary}
      
      Provide a short paragraph of personalized savings advice and a realistic timeline for reaching the goals.
    `;

    return this.callGemini(prompt);
  }
}

export default new GeminiService();
