# 📊 M-Pesa Transaction Analyzer

A React Native mobile application that automatically analyzes your M-Pesa transaction history by reading SMS messages and providing insightful spending analytics.

## ✨ Features

- 📱 **Automatic SMS Reading** - Scans and parses M-Pesa SMS messages
- 💰 **Transaction Categorization** - Automatically categorizes expenses (Shopping, Food, Transport, Bills, etc.)
- 📈 **Analytics Dashboard** - Visual representation of spending patterns with pie charts
- 📊 **Transaction History** - Detailed view of all your M-Pesa transactions
- 🔍 **Spending Insights** - Get personalized insights into your spending habits
- 💾 **Local Storage** - Securely stores transaction data on your device
- ⏳ **Date Range Filtering** - Analyze spending within specific date ranges
- 🔄 **Enhanced Loading Experience** - Beautiful animations during SMS processing
- 📅 **Custom Date Selection** - Choose specific periods for analysis


## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [React Native CLI](https://reactnative.dev/docs/environment-setup)
- [Android Studio](https://developer.android.com/studio) (for Android development)
- A physical Android device or emulator

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/victoroki/MPESAAnalyzer
cd mpesa-analyzer
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Install iOS dependencies** (if building for iOS)

```bash
cd ios && pod install && cd ..
```

4. **Run the app**

For Android:
```bash
npm run android
# or
yarn android
```

For iOS:
```bash
npm run ios
# or
yarn ios
```

## 🏗️ Project Structure

```
mpesa-analyzer/
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx      # Home screen with overview
│   │   ├── TransactionsScreen.tsx   # List of all transactions
│   │   ├── AnalyticsScreen.tsx      # Charts and analytics
│   │   └── InsightsScreen.tsx       # Spending insights
│   ├── components/                   # Reusable components
│   │   ├── LoadingScreen.tsx        # Animated loading screen
│   │   ├── DateRangePicker.tsx      # Date range selection component
│   │   └── SMSReaderDemo.tsx        # Demo component for SMS reading
│   ├── contexts/                    # React contexts
│   │   └── LoadingContext.tsx       # Loading state management
│   ├── hooks/                       # Custom React hooks
│   │   └── useSMSReader.ts          # Hook for reading SMS messages
│   └── utils/                       # Utility functions
├── App.tsx                           # Main app component
└── package.json
```

## 🛠️ Built With

- **[React Native](https://reactnative.dev/)** - Mobile framework
- **[React Navigation](https://reactnavigation.org/)** - Navigation library
- **[react-native-get-sms-android](https://www.npmjs.com/package/react-native-get-sms-android)** - SMS reading functionality
- **[@react-native-async-storage/async-storage](https://www.npmjs.com/package/@react-native-async-storage/async-storage)** - Local data persistence
- **React Native Charts** - Data visualization (specify which library you're using)

## 📱 Permissions

The app requires the following permissions:

- **READ_SMS** - To read M-Pesa transaction messages

The app only reads messages from M-Pesa (sender contains "MPESA") and does not access or store any other SMS messages.

## 🔒 Privacy & Security

- All transaction data is stored **locally** on your device
- No data is sent to external servers
- Only M-Pesa messages are parsed and analyzed
- You have full control over your data

## 🧪 How It Works

### SMS Parsing

The app identifies M-Pesa transactions by parsing SMS messages with patterns like:

- **Sent Money**: `"XXX Confirmed. KshXX.XX sent to [Name] on..."`
- **Received Money**: `"XXX Confirmed. You have received KshXX.XX from [Name]..."`
- **Payments**: `"XXX Confirmed. KshXX.XX paid to [Merchant]..."`
- **Withdrawals**: `"XXX Confirmed. KshXX.XX withdrawn from..."`

### Categorization

Transactions are automatically categorized based on keywords:

- 🛒 **Shopping** - Shops, stores, supermarkets
- 🍔 **Food** - Restaurants, cafes
- 🚗 **Transport** - Fuel, petrol stations
- 💊 **Health** - Hospitals, clinics, pharmacies
- 💡 **Bills** - Utilities, rent
- 📚 **Education** - Schools, universities
- 💵 **Cash** - ATM withdrawals
- 💰 **Income** - Money received
- 📦 **Other** - Unclassified transactions

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/Feature`)
3. Commit your Changes (`git commit -m 'Add some Feature'`)
4. Push to the Branch (`git push origin feature/Feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 🐛 Known Issues

- Currently only supports Android (iOS support coming soon)
- SMS parsing patterns are optimized for Safaricom M-Pesa Kenya format

## 📝 TODO / Roadmap

- [ ] Add iOS support
- [ ] Export transactions to CSV/PDF
- [ ] Budget setting and tracking
- [x] Enhanced loading animations
- [x] Date range filtering for analytics
- [ ] Monthly/yearly spending comparisons
- [ ] More granular category customization
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Backup and restore functionality

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@Victoroki](https://github.com/victoroki)

## 🙏 Acknowledgments

- Thanks to the React Native community
- M-Pesa for their transaction SMS format
- All contributors who help improve this project

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/victoroki/MPESAAnalyzer/issues) page
2. Create a new issue if your problem isn't already listed
3. Provide as much detail as possible (device, Android version, error messages)

---

⭐ **Star this repo** if you find it helpful!