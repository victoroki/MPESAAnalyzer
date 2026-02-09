import { PermissionsAndroid, Platform, Alert } from 'react-native';
// @ts-ignore
import SmsAndroid from 'react-native-get-sms-android';
import DatabaseService, { Transaction } from './DatabaseService';
import { parseMPesaMessage } from '../utils/smsParser';

class SyncService {
    private isSyncing = false;

    public async syncMessages(): Promise<number> {
        console.log('[DEBUG] SyncService.syncMessages() called');
        if (this.isSyncing) {
            console.log('[DEBUG] Sync already in progress, returning early');
            return 0;
        }
        this.isSyncing = true;

        try {
            console.log('[DEBUG] Checking SMS permissions');
            const hasPermission = await this.requestSMSPermission();
            console.log('[DEBUG] SMS permission result:', hasPermission);
            if (!hasPermission) {
                throw new Error('SMS permission not granted. Please allow SMS access in app permissions to read M-Pesa transactions.');
            }

            const lastScanned = DatabaseService.getLastScannedTimestamp();
            console.log('[DEBUG] Last scanned timestamp:', lastScanned);

            console.log('[DEBUG] Fetching messages');
            const newMessages = await this.fetchMessages(lastScanned);
            console.log('[DEBUG] Fetched messages count:', newMessages.length);

            if (newMessages.length === 0) {
                console.log('[DEBUG] No new messages found');
                this.isSyncing = false;
                return 0;
            }

            const transactions: Transaction[] = [];
            let maxTimestamp = lastScanned;

            console.log('[DEBUG] Processing messages');
            newMessages.forEach((msg: any) => {
                console.log('[DEBUG] Processing message:', msg.body);
                const parsed = parseMPesaMessage(msg.body, msg.date);
                console.log('[DEBUG] Parsed transaction:', parsed);
                if (parsed) {
                    transactions.push({
                        id: msg._id,
                        sms_id: msg._id,
                        ...parsed
                    });
                }
                if (msg.date > maxTimestamp) {
                    maxTimestamp = msg.date;
                }
            });

            console.log('[DEBUG] Processed transactions count:', transactions.length);
            if (transactions.length > 0) {
                console.log('[DEBUG] Saving transactions to database');
                await DatabaseService.saveTransactions(transactions);
                DatabaseService.setLastScannedTimestamp(maxTimestamp);
                console.log('[DEBUG] Saved transactions and updated timestamp');
            }

            this.isSyncing = false;
            console.log('[DEBUG] Sync completed, returning transaction count:', transactions.length);
            return transactions.length;
        } catch (error) {
            console.error('[DEBUG] Sync failed', error);
            this.isSyncing = false;
            throw error;
        }
    }

    private async requestSMSPermission(): Promise<boolean> {
        if (Platform.OS === 'android') {
            try {
                // Check if permission is already granted
                const grantedStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
                if (grantedStatus) {
                    return true;
                }

                // Request permission
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_SMS,
                    {
                        title: 'SMS Permission Required',
                        message: 'This app needs access to your SMS to read M-Pesa transactions and provide financial insights.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'Allow',
                    },
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    }

    private fetchMessages(minDate: number): Promise<any[]> {
        console.log('[DEBUG] Fetching messages with minDate:', minDate);
        return new Promise((resolve, reject) => {
            // Remove bodyRegex filter as it's too restrictive
            // We'll filter for M-Pesa messages in code instead
            const filter: any = {
                box: 'inbox',
            };

            // Only add minDate if it's greater than 0
            // For first sync, fetch all messages (limited by default to recent messages)
            if (minDate > 0) {
                filter.minDate = minDate;
            }

            console.log('[DEBUG] SMS filter:', filter);

            SmsAndroid.list(
                JSON.stringify(filter),
                (fail: string) => {
                    console.error('[DEBUG] Failed to list SMS', fail);
                    // Check if it's a permission error
                    if (fail.includes('permission') || fail.includes('denied')) {
                        reject(new Error('SMS permission denied. Please allow SMS access in app permissions.'));
                    } else {
                        reject(new Error(fail || 'Failed to read SMS messages'));
                    }
                },
                (count: number, smsList: string) => {
                    try {
                        console.log('[DEBUG] SMS list response - count:', count);
                        const allMessages = JSON.parse(smsList);
                        console.log('[DEBUG] Parsed all messages count:', allMessages.length);

                        // Filter for M-Pesa messages in code (case-insensitive)
                        const mpesaMessages = allMessages.filter((msg: any) => {
                            const body = msg.body || '';
                            const isMpesa = /m-?pesa/i.test(body);
                            if (isMpesa) {
                                console.log('[DEBUG] Found M-Pesa message:', body.substring(0, 50) + '...');
                            }
                            return isMpesa;
                        });

                        console.log('[DEBUG] Filtered M-Pesa messages count:', mpesaMessages.length);
                        resolve(mpesaMessages);
                    } catch (e) {
                        console.error('[DEBUG] Failed to parse SMS messages', e);
                        reject(new Error('Failed to parse SMS messages'));
                    }
                }
            );
        });
    }
}

export default new SyncService();