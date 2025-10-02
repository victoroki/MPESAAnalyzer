declare module 'react-native-sms-android' {
  export default class SmsAndroid {
    static list(
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void,
    ): void;
  }
}
