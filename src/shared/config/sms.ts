/**
 * SMS Service Configuration
 * Configuration for SMS notification services
 */

export const smsConfig = {
  celcom: {
    apiUrl: 'https://isms.celcomafrica.com/api/services/sendsms',
    apiKey: 'bed304fc5bc9ce390c20aac616bb54dc',
    partnerID: 113,
    shortcode: 'TEXTME',
    endpoints: {
      sendSMS: 'https://isms.celcomafrica.com/api/services/sendsms/',
      getDLR: 'https://isms.celcomafrica.com/api/services/getdlr/',
      getBalance: 'https://isms.celcomafrica.com/api/services/getbalance/',
    },
    messageTemplates: {
      otp: 'Your Grey Wallet verification code is: {otp}. Valid for {minutes} minutes. Do not share this code with anyone.',
      welcome: 'Welcome to Grey Wallet, {userName}! Your account has been created successfully.',
      verification: 'Your verification code is: {token}. Valid for 5 minutes.',
      transaction: 'Transaction: {type} {amount} {currency}. Status: {status}',
    },
    errorCodes: {
      200: 'Success',
      1001: 'Invalid sender ID/shortcode',
      1002: 'Network not allowed',
      1003: 'Invalid mobile number',
      1004: 'Low bulk credits',
      1005: 'Failed. System error',
      1006: 'Invalid credentials',
      1007: 'Failed. System error',
      1008: 'No Delivery Report',
      1009: 'Unsupported data type',
      1010: 'Unsupported request type',
      4090: 'Internal Error. Try again after 5 minutes',
      4091: 'No Partner ID is Set',
      4092: 'No API KEY Provided',
      4093: 'Details Not Found',
    },
  },
} as const;

export type SMSErrorCode = keyof typeof smsConfig.celcom.errorCodes;
