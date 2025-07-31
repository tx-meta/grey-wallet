# Grey Wallet API Documentation

## Overview

The Grey Wallet API is a comprehensive cryptocurrency wallet backend service built with Node.js, Express, and TypeScript. It provides secure wallet management, authentication, payment processing, and phone verification capabilities.

**Base URL:** `http://localhost:3000` (development)  
**API Version:** 1.0.0  
**Authentication:** Bearer Token (Supabase JWT)

## Table of Contents

- [Authentication](#authentication)
- [Wallet Management](#wallet-management)
- [Payment Processing](#payment-processing)
- [Phone Verification](#phone-verification)
- [Health Check](#health-check)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All authentication endpoints use Supabase Auth for secure user management.

### POST /api/auth/signup

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "country": "United States",
  "currency": "USD"
}
```

**Validation Rules:**
- `email`: Valid email address
- `phone`: Valid phone number format
- `password`: Minimum 8 characters, must contain uppercase, lowercase, and number
- `firstName`: 2-50 characters
- `lastName`: 2-50 characters
- `country`: 2-100 characters
- `currency`: Must be one of: USD, EUR, GBP, KES, NGN, GHS, UGX, TZS

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "phone": "+1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "addresses": [
      {
        "tokenSymbol": "BTC",
        "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      },
      {
        "tokenSymbol": "ETH",
        "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
      }
    ],
    "requiresEmailConfirmation": true,
    "message": "User registered successfully. Please check your email to confirm your account."
  }
}
```

### POST /api/auth/login

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "phone": "+1234567890"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": 1640995200
    }
  }
}
```

### POST /api/auth/logout

Logout user and invalidate session.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "phone": "+1234567890"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": 1640995200
    }
  }
}
```

### POST /api/auth/reset-password

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

### GET /api/auth/me

Get current user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "phone": "+1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Wallet Management

### GET /api/wallet/tokens

Get all supported tokens (public endpoint, no authentication required).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "symbol": "BTC",
        "name": "Bitcoin",
        "icon": "https://example.com/btc-icon.png",
        "decimals": 8,
        "isActive": true,
        "network": "bitcoin"
      },
      {
        "symbol": "ETH",
        "name": "Ethereum",
        "icon": "https://example.com/eth-icon.png",
        "decimals": 18,
        "isActive": true,
        "network": "ethereum"
      }
    ],
    "totalTokens": 10,
    "activeTokens": 8
  }
}
```

### GET /api/wallet

Get comprehensive wallet information for authenticated user.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "userEmail": "user@example.com",
    "totalBalance": "1250.50",
    "totalTokens": 5,
    "addresses": [
      {
        "tokenSymbol": "BTC",
        "tokenName": "Bitcoin",
        "tokenIcon": "https://example.com/btc-icon.png",
        "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "tokenBalance": "0.5",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "tokenSymbol": "ETH",
        "tokenName": "Ethereum",
        "tokenIcon": "https://example.com/eth-icon.png",
        "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        "tokenBalance": "2.5",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /api/wallet/overview

Get wallet overview with summary information.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "userEmail": "user@example.com",
    "totalBalance": "1250.50",
    "totalTokens": 5,
    "supportedTokens": 10,
    "activeTokens": 8,
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

### GET /api/wallet/addresses

Get all wallet addresses for authenticated user.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "addresses": [
      {
        "tokenSymbol": "BTC",
        "tokenName": "Bitcoin",
        "tokenIcon": "https://example.com/btc-icon.png",
        "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "tokenBalance": "0.5",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalAddresses": 1
  }
}
```

### GET /api/wallet/balance/:tokenSymbol

Get balance for a specific token.

**Headers:** `Authorization: Bearer <access_token>`  
**Parameters:** `tokenSymbol` - Token symbol (e.g., BTC, ETH)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "tokenSymbol": "BTC",
    "tokenName": "Bitcoin",
    "userBalance": "0.5",
    "tokenPrice": "45000.00",
    "fiatValue": "22500.00",
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## Payment Processing

### POST /api/payments/crypto/purchase

Initiate crypto purchase via M-Pesa.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "tokenSymbol": "BTC",
  "fiatAmount": "1000",
  "phoneNumber": "+254712345678"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn-uuid",
    "checkoutRequestId": "ws_CO_123456789",
    "merchantRequestId": "29115-34600561-1",
    "amount": "1000",
    "phoneNumber": "+254712345678",
    "tokenSymbol": "BTC",
    "status": "pending",
    "message": "Payment request sent to M-Pesa",
    "expiresAt": "2024-01-01T12:15:00.000Z"
  }
}
```

### GET /api/payments/purchase/:purchaseId

Get purchase status.

**Headers:** `Authorization: Bearer <access_token>`  
**Parameters:** `purchaseId` - Transaction ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn-uuid",
    "checkoutRequestId": "ws_CO_123456789",
    "merchantRequestId": "29115-34600561-1",
    "amount": "1000",
    "phoneNumber": "+254712345678",
    "tokenSymbol": "BTC",
    "status": "completed",
    "mpesaReceiptNumber": "QK12345678",
    "transactionDate": "2024-01-01T12:10:00.000Z",
    "cryptoAmount": "0.022",
    "fiatAmount": "1000",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:10:00.000Z"
  }
}
```

### POST /api/payments/mpesa/callback

Handle M-Pesa payment callbacks (no authentication required).

**Request Body:**
```json
{
  "CheckoutRequestID": "ws_CO_123456789",
  "MerchantRequestID": "29115-34600561-1",
  "ResultCode": "0",
  "ResultDesc": "The service request is processed successfully.",
  "Amount": "1000",
  "MpesaReceiptNumber": "QK12345678",
  "TransactionDate": "20240101121000",
  "PhoneNumber": "254712345678"
}
```

**Response (200):**
```json
{
  "ResultCode": "0",
  "ResultDesc": "Callback processed"
}
```

---

## Phone Verification

### POST /api/phone/send-otp

Send OTP to user's phone number.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 300,
    "phoneNumber": "+254712345678"
  }
}
```

### POST /api/phone/verify-otp

Verify OTP and mark phone as verified.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Phone number verified successfully",
    "phoneNumber": "+254712345678",
    "verifiedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## Health Check

### GET /health

Check API health status.

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "grey-wallet-api",
  "version": "1.0.0"
}
```

---

## Error Handling

All API endpoints return consistent error responses:

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Rate Limit Error (429)
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP address
- **Applies to:** All `/api/` endpoints
- **Headers:** Rate limit information is included in response headers

---

## Authentication

### Bearer Token

Most endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Format

Access tokens are JWT tokens issued by Supabase Auth with the following structure:
- **Issuer:** Supabase
- **Audience:** Your project
- **Expiration:** 1 hour (configurable)
- **Refresh:** Available via refresh endpoint

### Token Refresh

When access tokens expire, use the refresh endpoint to get a new token:

1. Call `POST /api/auth/refresh` with the refresh token
2. Use the new access token for subsequent requests
3. Store the new refresh token for future use

---

## Supported Currencies

The API supports the following fiat currencies:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- KES (Kenyan Shilling)
- NGN (Nigerian Naira)
- GHS (Ghanaian Cedi)
- UGX (Ugandan Shilling)
- TZS (Tanzanian Shilling)

---

## Development

### Running the API

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

Required environment variables (see `env.example` for full list):
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `VAULT_URL` - HashiCorp Vault URL
- `VAULT_TOKEN` - HashiCorp Vault token

---

## Testing

### API Tests

Test files are available in the `tests/` directory:
- `api-tests.http` - General API tests
- `crypto-purchase-tests.http` - Payment flow tests
- `phone-otp-tests.http` - Phone verification tests
- `wallet-api-tests.http` - Wallet management tests

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request throttling
- **Input Validation** - Request sanitization
- **JWT Authentication** - Secure token-based auth
- **HashiCorp Vault** - Secure key management
- **HTTPS** - Encrypted communication (production)

---

## Support

For API support and questions:
- **Documentation:** This file
- **Issues:** GitHub repository
- **Email:** support@greywallet.com

---

*Last updated: January 2024*
*API Version: 1.0.0* 