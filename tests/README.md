# API Testing Guide

## B2B Payment Tests

This directory contains HTTP test files for testing the B2B payment functionality.

### Setup

1. **Install VS Code REST Client Extension** (recommended) or use any HTTP client that supports `.http` files
2. **Update Variables** in `b2b-payment.http`:
   ```
   @baseUrl = http://localhost:3000
   @authToken = your_actual_jwt_token_here
   ```

### Getting an Auth Token

1. **Sign up or sign in** to get a JWT token:
   ```http
   POST {{baseUrl}}/api/auth/signin
   Content-Type: application/json
   
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```

2. **Copy the token** from the response and update `@authToken` variable

### Test Categories

#### 1. **Basic Functionality Tests**
- Create B2B payment quotes for different recipient types
- Finalize payments using quote IDs
- Test all supported recipient types (paybill, till, pochi)

#### 2. **Validation Tests**
- Missing required fields
- Invalid recipient types
- Invalid business numbers
- Amount limits (too small/large)
- Unsupported tokens

#### 3. **Authentication Tests**
- Missing authorization headers
- Invalid tokens
- Expired tokens

#### 4. **Real-world Scenarios**
- Pay utility bills (KPLC, Water)
- Bank transfers (Equity, KCB)
- Mobile payments (Safaricom)
- Buy goods from till numbers

#### 5. **Integration Flow Tests**
- Complete payment flow (quote → finalize)
- Wallet balance checks
- Transaction status tracking

### Usage Instructions

#### Option 1: VS Code REST Client
1. Open `b2b-payment.http` in VS Code
2. Click "Send Request" above any test
3. View responses in the right panel

#### Option 2: Command Line (using HTTPie)
```bash
# Install HTTPie
pip install httpie

# Example: Create a quote
http POST localhost:3000/api/payments/b2b/quote \
  Authorization:"Bearer your_token_here" \
  tokenSymbol="USDT" \
  fiatAmount:=1000 \
  recipientType="paybill" \
  businessNumber="123456" \
  accountNumber="ACC123" \
  recipientName="Test Company"

# Example: Finalize payment
http POST localhost:3000/api/payments/b2b/finalize \
  Authorization:"Bearer your_token_here" \
  quoteId="quote_id_from_previous_response"
```

#### Option 3: cURL
```bash
# Create quote
curl -X POST http://localhost:3000/api/payments/b2b/quote \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenSymbol": "USDT",
    "fiatAmount": 1000,
    "recipientType": "paybill",
    "businessNumber": "123456",
    "accountNumber": "ACC123",
    "recipientName": "Test Company"
  }'

# Finalize payment
curl -X POST http://localhost:3000/api/payments/b2b/finalize \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "quote_id_from_previous_response"
  }'
```

### Test Flow Recommendations

#### 1. **Start with Health Check**
```http
GET {{baseUrl}}/health
```

#### 2. **Check Wallet Balance**
```http
GET {{baseUrl}}/api/wallet
Authorization: Bearer {{authToken}}
```

#### 3. **Create a Quote**
```http
POST {{baseUrl}}/api/payments/b2b/quote
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "tokenSymbol": "USDT",
  "fiatAmount": 1000,
  "recipientType": "paybill",
  "businessNumber": "123456",
  "accountNumber": "ACC123",
  "recipientName": "Test Company"
}
```

#### 4. **Finalize Payment** (use quoteId from step 3)
```http
POST {{baseUrl}}/api/payments/b2b/finalize
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "quoteId": "b2b_1234567890_abc123"
}
```

#### 5. **Verify Balance Updated**
```http
GET {{baseUrl}}/api/wallet/balance/USDT
Authorization: Bearer {{authToken}}
```

### Expected Responses

#### Successful Quote Creation:
```json
{
  "success": true,
  "data": {
    "quoteId": "b2b_1234567890_abc123",
    "tokenSymbol": "USDT",
    "tokenAmount": 15.5,
    "fiatAmount": 1000,
    "exchangeRate": 64.52,
    "platformFee": 20.0,
    "recipient": {
      "type": "paybill",
      "businessNumber": "123456",
      "accountNumber": "ACC123",
      "name": "Test Company"
    },
    "expiresAt": "2025-01-15T10:30:00Z"
  }
}
```

#### Successful Payment Finalization:
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_987654321",
    "tokenSymbol": "USDT",
    "tokenAmount": 15.5,
    "fiatAmount": 1000,
    "exchangeRate": 64.52,
    "platformFee": 20.0,
    "recipient": {
      "type": "paybill",
      "businessNumber": "123456",
      "accountNumber": "ACC123",
      "name": "Test Company"
    },
    "mpesaResponse": {
      "conversationId": "AG_20250115_123456",
      "originatorConversationId": "12345",
      "responseCode": "0",
      "responseDescription": "Accept the service request successfully."
    },
    "status": "processing"
  }
}
```

### Error Response Examples

#### Validation Error:
```json
{
  "success": false,
  "message": "Account number is required for paybill payments"
}
```

#### Authentication Error:
```json
{
  "success": false,
  "message": "Authorization header with Bearer token is required"
}
```

#### Insufficient Balance:
```json
{
  "success": false,
  "message": "Insufficient USDT balance. Required: 15.500000, Available: 10.250000"
}
```

### Common Kenyan Paybill Numbers for Testing

- **Equity Bank**: 247247
- **KCB Bank**: 522522  
- **Co-operative Bank**: 400200
- **Safaricom Postpaid**: 100100
- **KPLC (Electricity)**: 888880
- **Nairobi Water**: 885885

### Troubleshooting

1. **401 Unauthorized**: Check your JWT token is valid and not expired
2. **400 Bad Request**: Check request body format and required fields
3. **404 Not Found**: Verify the API endpoint URLs are correct
4. **500 Internal Server Error**: Check server logs for detailed error information

### Security Notes

- Never commit actual JWT tokens to version control
- Use test accounts and small amounts for testing
- Rotate tokens regularly in production environments
- Monitor API rate limits during load testing