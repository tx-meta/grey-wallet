# SMS Notification System Implementation

## Overview

This document describes the implementation of the SMS notification system for the Grey Wallet API using the Celcom Africa SMS API. The system is designed to send OTP messages, welcome messages, and transaction notifications via SMS.

## Architecture

The SMS notification system follows the Clean Architecture pattern and integrates seamlessly with the existing notification service infrastructure.

### Components

1. **NotificationService Interface** - Defines the contract for all notification operations
2. **CelcomSMSService** - Real implementation using Celcom Africa API
3. **MockNotificationService** - Mock implementation for testing
4. **SMS Configuration** - Centralized configuration management

## Celcom Africa API Integration

### API Credentials
- **API Key**: `bed304fc5bc9ce390c20aac616bb54dc`
- **Partner ID**: `113`
- **Shortcode**: `TEXTME`
- **Base URL**: `https://isms.celcomafrica.com/api/services/`

### Endpoints Used

1. **Send SMS**: `POST /api/services/sendsms/`
2. **Get Delivery Report**: `POST /api/services/getdlr/`
3. **Get Account Balance**: `POST /api/services/getbalance/`

### API Response Format

```json
{
  "responses": [
    {
      "respose-code": 200,
      "response-description": "Success",
      "mobile": "254713482448",
      "messageid": "8290842",
      "networkid": "1"
    }
  ]
}
```

### Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 1001 | Invalid sender ID/shortcode |
| 1002 | Network not allowed |
| 1003 | Invalid mobile number |
| 1004 | Low bulk credits |
| 1005 | Failed. System error |
| 1006 | Invalid credentials |
| 1007 | Failed. System error |
| 1008 | No Delivery Report |
| 1009 | Unsupported data type |
| 1010 | Unsupported request type |
| 4090 | Internal Error. Try again after 5 minutes |
| 4091 | No Partner ID is Set |
| 4092 | No API KEY Provided |
| 4093 | Details Not Found |

## Implementation Details

### Message Templates

The service uses configurable message templates for different types of notifications:

```typescript
messageTemplates: {
  otp: 'Your Grey Wallet verification code is: {otp}. Valid for {minutes} minutes. Do not share this code with anyone.',
  welcome: 'Welcome to Grey Wallet, {userName}! Your account has been created successfully.',
  verification: 'Your verification code is: {token}. Valid for 5 minutes.',
  transaction: 'Transaction: {type} {amount} {currency}. Status: {status}',
}
```

### Phone Number Formatting

The service automatically formats phone numbers to the required format:
- Removes non-digit characters (except +)
- Converts local format (0xxx) to international format (254xxx)
- Ensures proper country code prefix

### Error Handling

Comprehensive error handling for:
- Network failures
- API errors
- Invalid responses
- Rate limiting
- Authentication failures

## Usage Examples

### Sending OTP

```typescript
const notificationService = container.getServices().notificationService;
const result = await notificationService.sendSMSOTP('+254700123456', '123456', 300);

if (result.success) {
  console.log('OTP sent successfully, Message ID:', result.messageId);
} else {
  console.error('Failed to send OTP:', result.error);
}
```

### Getting Delivery Report

```typescript
const deliveryReport = await notificationService.getDeliveryReport('8290842');
if (deliveryReport.success) {
  console.log('Message status:', deliveryReport.status);
}
```

### Checking Account Balance

```typescript
const balance = await notificationService.getAccountBalance();
if (balance !== null) {
  console.log('Account balance:', balance);
}
```

## Configuration

The SMS service configuration is centralized in `src/shared/config/sms.ts`:

```typescript
export const smsConfig = {
  celcom: {
    apiUrl: 'https://isms.celcomafrica.com/api/services/sendsms',
    apiKey: 'bed304fc5bc9ce390c20aac616bb54dc',
    partnerID: 113,
    shortcode: 'TEXTME',
    endpoints: { /* ... */ },
    messageTemplates: { /* ... */ },
    errorCodes: { /* ... */ },
  },
};
```

## Testing

### Test Files

1. **`tests/sms-notification-tests.http`** - HTTP tests for SMS endpoints
2. **`tests/phone-otp-tests.http`** - Phone OTP functionality tests

### Test Scenarios

- Valid phone number formats
- Invalid phone numbers
- OTP sending and verification
- Error handling
- Different phone number formats (local, international)

## Security Considerations

1. **API Key Protection**: API credentials are stored in configuration files
2. **Rate Limiting**: Implemented at the application level
3. **Input Validation**: Phone numbers are validated and sanitized
4. **Error Logging**: Sensitive information is not logged

## Monitoring and Logging

The service provides comprehensive logging for:
- SMS sending attempts
- API responses
- Error conditions
- Message delivery status
- Account balance checks

## Dependencies

- **Node.js**: v16 or higher
- **TypeScript**: v4.5 or higher
- **Fetch API**: Available in Node.js 18+ or via polyfill

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Check API key in configuration
2. **Network Errors**: Verify internet connectivity and firewall settings
3. **Rate Limiting**: Check API usage limits
4. **Phone Format**: Ensure phone numbers are in correct format

### Debug Mode

Enable debug logging by setting environment variable:
```bash
NODE_ENV=development
```

## Future Enhancements

1. **Message Scheduling**: Support for delayed message delivery
2. **Bulk SMS**: Optimized for sending multiple messages
3. **Delivery Reports**: Enhanced delivery status tracking
4. **Message Templates**: Dynamic template management
5. **Analytics**: SMS delivery statistics and reporting

## Support

For technical support with the Celcom Africa SMS API, refer to their [developer documentation](https://celcomafrica.com/developers-center).

## License

This implementation is part of the Grey Wallet project and follows the project's licensing terms.
