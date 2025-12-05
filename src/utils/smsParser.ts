export interface ParsedTransaction {
    type: 'sent' | 'received' | 'payment' | 'withdrawal' | 'airtime' | 'unknown';
    amount: number;
    recipient: string;
    sender: string;
    balance: number;
    transactionCode: string;
    date: string; // ISO string
    rawMessage: string;
    category: string;
}

export const parseMPesaMessage = (message: string, timestamp: number): ParsedTransaction | null => {
    console.log('[DEBUG] Parsing M-Pesa message:', message);
    // Common patterns
    const patterns = {
        sent: /([A-Z0-9]+) Confirmed\. Ksh([\d,]+\.?\d*) sent to (.+?) on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)\. New M-PESA balance is Ksh([\d,]+\.?\d*)\./,
        received: /([A-Z0-9]+) Confirmed\. You have received Ksh([\d,]+\.?\d*) from (.+?) on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)\. New M-PESA balance is Ksh([\d,]+\.?\d*)\./,
        payment: /([A-Z0-9]+) Confirmed\. Ksh([\d,]+\.?\d*) paid to (.+?) on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)\. New M-PESA balance is Ksh([\d,]+\.?\d*)\./,
        withdrawal: /([A-Z0-9]+) Confirmed\. Ksh([\d,]+\.?\d*) withdrawn from (.+?) on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)\. New M-PESA balance is Ksh([\d,]+\.?\d*)\./,
        airtime: /([A-Z0-9]+) Confirmed\. You bought Ksh([\d,]+\.?\d*) of airtime on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)\. New M-PESA balance is Ksh([\d,]+\.?\d*)\./,
    };

    // Helper to parse date
    const parseDate = (dateStr: string, timeStr: string) => {
        console.log('[DEBUG] Parsing date:', dateStr, timeStr);
        // dateStr: DD/MM/YY
        // timeStr: HH:MM AM/PM
        try {
            const [day, month, year] = dateStr.split('/').map(Number);
            const [time, period] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            // Assuming 20xx for year
            const fullYear = 2000 + year;
            const result = new Date(fullYear, month - 1, day, hours, minutes).toISOString();
            console.log('[DEBUG] Parsed date result:', result);
            return result;
        } catch (e) {
            console.log('[DEBUG] Date parsing failed, using timestamp fallback:', timestamp);
            return new Date(timestamp).toISOString();
        }
    };

    for (const [type, pattern] of Object.entries(patterns)) {
        const match = message.match(pattern);
        if (match) {
            console.log('[DEBUG] Matched pattern type:', type);
            const transactionCode = match[1];
            let amount = 0;
            let otherParty = '';
            let dateStr = '';
            let timeStr = '';
            let balance = 0;

            if (type === 'sent') {
                amount = parseFloat(match[2].replace(/,/g, ''));
                otherParty = match[3];
                dateStr = match[4];
                timeStr = match[5];
                balance = parseFloat(match[6].replace(/,/g, ''));
            } else if (type === 'received') {
                amount = parseFloat(match[2].replace(/,/g, ''));
                otherParty = match[3];
                dateStr = match[4];
                timeStr = match[5];
                balance = parseFloat(match[6].replace(/,/g, ''));
            } else if (type === 'payment') {
                amount = parseFloat(match[2].replace(/,/g, ''));
                otherParty = match[3];
                dateStr = match[4];
                timeStr = match[5];
                balance = parseFloat(match[6].replace(/,/g, ''));
            } else if (type === 'withdrawal') {
                amount = parseFloat(match[2].replace(/,/g, ''));
                otherParty = match[3];
                dateStr = match[4];
                timeStr = match[5];
                balance = parseFloat(match[6].replace(/,/g, ''));
            } else if (type === 'airtime') {
                amount = parseFloat(match[2].replace(/,/g, ''));
                otherParty = 'Safaricom';
                dateStr = match[3];
                timeStr = match[4];
                balance = parseFloat(match[5].replace(/,/g, ''));
            }

            const result = {
                type: type as any,
                amount,
                recipient: type === 'received' ? '' : otherParty,
                sender: type === 'received' ? otherParty : '',
                balance,
                transactionCode,
                date: parseDate(dateStr, timeStr),
                rawMessage: message,
                category: determineCategory(type, otherParty),
            };
            console.log('[DEBUG] Parsed transaction result:', result);
            return result;
        }
    }

    console.log('[DEBUG] No pattern matched for message');
    return null;
};

const determineCategory = (type: string, otherParty: string): string => {
    console.log('[DEBUG] Determining category for type:', type, 'party:', otherParty);
    if (type === 'airtime') return 'Airtime';
    if (type === 'withdrawal') return 'Withdrawal';
    if (type === 'payment') {
        if (otherParty.toLowerCase().includes('kplc')) return 'Bills';
        if (otherParty.toLowerCase().includes('internet')) return 'Bills';
        if (otherParty.toLowerCase().includes('supermarket')) return 'Shopping';
        return 'Shopping';
    }
    if (type === 'sent') return 'Transfer';
    if (type === 'received') return 'Income';
    return 'General';
};
