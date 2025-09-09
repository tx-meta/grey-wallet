# Zao Wallet API Test Suite

This directory contains comprehensive test files for the Zao Wallet API, including the new M-Pesa integration for both buy and sell crypto transactions.

## Test Files

### 1. Authentication Tests
- **File**: `signup-auth-tests.http`
- **Description**: Tests user registration, login, and authentication flows
- **Endpoints**: `/api/auth/signup`, `/api/auth/login`

### 2. Buy Crypto Tests (New Quote System)
- **File**: `buy-crypto-tests.http`
- **Description**: Tests the new quote-based buy crypto system with M-Pesa STK Push
- **Endpoints**: 
  - `/api/buy/crypto/fiat-to-quantity-quote` - Get quote for fiat amount
  - `/api/buy/crypto/quantity-to-fiat-quote` - Get quote for token quantity
  - `/api/buy/crypto/finalize` - Finalize purchase with M-Pesa STK Push

### 3. Sell Crypto Tests (Quote System)
- **File**: `sell-crypto-tests.http`
- **Description**: Tests the quote-based sell crypto system with M-Pesa B2C disbursements
- **Endpoints**:
  - `/api/sell/crypto/quantity-to-fiat-quote` - Get quote for token quantity
  - `/api/sell/crypto/fiat-to-quantity-quote` - Get quote for fiat amount
  - `/api/sell/crypto/finalize` - Finalize sale with M-Pesa B2C

### 4. M-Pesa Callback Tests
- **File**: `mpesa-callback-tests.http`
- **Description**: Tests M-Pesa payment callbacks for both STK Push and B2C
- **Endpoints**:
  - `/api/mpesa/callback/stk-push` - STK Push callbacks (buy crypto)
  - `/api/mpesa/callback/b2c` - B2C callbacks (sell crypto)

### 5. Legacy Crypto Purchase Tests
- **File**: `crypto-purchase-tests.http`
- **Description**: Tests the deprecated crypto purchase endpoint (redirects to new system)
- **Endpoints**: `/api/payments/crypto/purchase` (deprecated)

### 6. Other Test Files
- `crypto-quote-tests.http` - General crypto quote tests
- `wallet-api-tests.http` - Wallet management tests
- `phone-otp-tests.http` - Phone verification tests
- `terms-of-service-tests.http` - Terms of service tests
- `sms-notification-tests.http` - SMS notification tests

## Test Environment Setup

### Prerequisites
1. **Node.js** and **npm** installed
2. **Postman** or **VS Code REST Client** extension
3. **M-Pesa Sandbox** credentials (for production testing)

### Environment Variables
Create a `.env` file with the following M-Pesa credentials:

```bash
# M-Pesa API Configuration
DARAJA_CONSUMER_KEY=your_consumer_key
DARAJA_CONSUMER_SECRET=your_consumer_secret
DARAJA_SHORTCODE=your_shortcode
DARAJA_API_PASSKEY=your_api_passkey
DARAJA_TOKEN_URL=https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials

# STK Push Configuration (Buy Crypto)
DARAJA_STK_PUSH_URL=https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
DARAJA_STK_PUSH_PARTY_B=your_shortcode
DARAJA_STK_PUSH_RESULT_URL=https://your-domain.com/api/mpesa/callback/stk-push
DARAJA_STK_PUSH_TIMEOUT_URL=https://your-domain.com/api/mpesa/callback/stk-push

# B2C Configuration (Sell Crypto)
DARAJA_B2C_API_URL=https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest
DARAJA_B2C_SHORTCODE=your_b2c_shortcode
DARAJA_B2C_INITIATOR_NAME=your_initiator_name
DARAJA_B2C_INITIATOR_PASSWORD=your_initiator_password
DARAJA_B2C_RESULT_URL=https://your-domain.com/api/mpesa/callback/b2c
DARAJA_B2C_QUEUE_TIMEOUT_URL=https://your-domain.com/api/mpesa/callback/b2c
DARAJA_SECURITY_CREDENTIAL=your_encrypted_security_credential

# B2B Configuration (Business Payments)
DARAJA_B2B_API_URL=https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest
DARAJA_B2B_PARTY_A=your_b2b_party_a
DARAJA_B2B_INITIATOR_NAME=your_b2b_initiator_name
DARAJA_B2B_SENDER_IDENTIFIER_TYPE=4
DARAJA_B2B_RECEIVER_IDENTIFIER_TYPE=4
DARAJA_B2B_RESULT_URL=https://your-domain.com/api/mpesa/callback/b2b
DARAJA_B2B_QUEUE_TIMEOUT_URL=https://your-domain.com/api/mpesa/callback/b2b
```

### Running Tests

1. **Start the API server**:
   ```bash
   npm run dev
   ```

2. **Run tests using VS Code REST Client**:
   - Open any `.http` file in VS Code
   - Install the "REST Client" extension
   - Click "Send Request" above each test

3. **Run tests using Postman**:
   - Import the collection: `docs/Zao_Wallet_API.postman_collection.json`
   - Import the environment: `docs/Zao_Wallet_Environment.postman_environment.json`
   - Set the environment variables
   - Run the tests

## Test Scenarios

### Buy Crypto Flow
1. **Get Quote**: Request a quote for buying crypto with fiat amount
2. **Finalize Purchase**: Use the quote ID to initiate M-Pesa STK Push
3. **M-Pesa Callback**: Simulate M-Pesa callback for payment confirmation
4. **Verify**: Check that crypto was added to user's wallet

### Sell Crypto Flow
1. **Get Quote**: Request a quote for selling crypto
2. **Finalize Sale**: Use the quote ID to initiate the sale
3. **M-Pesa B2C**: System initiates M-Pesa B2C disbursement
4. **M-Pesa Callback**: Simulate M-Pesa callback for disbursement confirmation
5. **Verify**: Check that crypto was removed from user's wallet

### Error Scenarios
- Invalid quote IDs
- Expired quotes
- Insufficient balances
- Invalid phone numbers
- M-Pesa payment failures
- Network timeouts

## M-Pesa Integration Testing

### STK Push Testing (Buy Crypto)
- **Success Case**: User enters PIN, payment succeeds
- **Failure Case**: Insufficient balance, user cancels, timeout
- **Callback Format**: JSON with `Body.stkCallback` structure

### B2C Testing (Sell Crypto)
- **Success Case**: Disbursement to user's phone succeeds
- **Failure Case**: Invalid phone, insufficient balance
- **Callback Format**: JSON with `Result` structure

### Callback URLs
- **STK Push**: `https://your-domain.com/api/mpesa/callback/stk-push`
- **B2C**: `https://your-domain.com/api/mpesa/callback/b2c`

## Postman Collection

The Postman collection includes:
- **Authentication**: User registration and login
- **Buy Crypto**: New quote-based system with M-Pesa STK Push
- **Sell Crypto**: Quote-based system with M-Pesa B2C
- **M-Pesa Callbacks**: STK Push and B2C callback testing
- **Wallet Management**: Balance and token management
- **Legacy Endpoints**: Deprecated endpoints for backward compatibility

## Environment Variables

The Postman environment includes:
- **Base URL**: API server URL
- **Authentication**: User credentials and tokens
- **M-Pesa**: All M-Pesa configuration variables
- **Test Data**: Sample data for testing

## Notes

- All M-Pesa credentials should be from the sandbox environment for testing
- Callback URLs must be publicly accessible for M-Pesa to send callbacks
- Test phone numbers should be valid M-Pesa registered numbers
- Quote IDs are generated by the system and expire after 5 minutes
- Transaction IDs are used to track the complete flow

## Troubleshooting

### Common Issues
1. **Authentication Errors**: Ensure valid auth token in headers
2. **Quote Expired**: Generate new quotes for testing
3. **M-Pesa Errors**: Check sandbox credentials and callback URLs
4. **Network Issues**: Ensure API server is running and accessible

### Debug Tips
- Check server logs for detailed error messages
- Use the health check endpoint to verify server status
- Test with small amounts first
- Verify M-Pesa sandbox credentials are correct