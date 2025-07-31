# Grey Wallet API Documentation

This directory contains comprehensive API documentation for the Grey Wallet backend service.

## Documentation Files

- **`../API_DOCUMENTATION.md`** - Complete API documentation in Markdown format
- **`../openapi.yaml`** - OpenAPI/Swagger specification for machine-readable documentation
- **`index.html`** - Interactive HTML documentation with examples

## Quick Start

### View HTML Documentation

1. Start the documentation server:
   ```bash
   node ../serve-docs.js
   ```

2. Open your browser and navigate to:
   - **HTML Documentation**: http://localhost:8080/docs/
   - **Markdown Documentation**: http://localhost:8080/api-docs
   - **OpenAPI Spec**: http://localhost:8080/openapi

### Alternative: Direct File Access

- **HTML Documentation**: Open `index.html` in your browser
- **Markdown Documentation**: View `../API_DOCUMENTATION.md` in any Markdown viewer
- **OpenAPI Spec**: Use `../openapi.yaml` with Swagger UI or other OpenAPI tools

## API Overview

The Grey Wallet API provides the following main functionalities:

### 🔐 Authentication
- User registration and login via Supabase Auth
- JWT token-based authentication
- Password reset functionality
- Session management

### 💰 Wallet Management
- Multi-token wallet support (BTC, ETH, etc.)
- Real-time balance tracking
- Address generation and management
- Token price integration

### 💳 Payment Processing
- M-Pesa integration for crypto purchases
- Payment status tracking
- Callback handling
- Transaction history

### 📱 Phone Verification
- SMS OTP verification
- Phone number validation
- Secure verification flow

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | ❌ |
| POST | `/api/auth/signup` | User registration | ❌ |
| POST | `/api/auth/login` | User login | ❌ |
| POST | `/api/auth/logout` | User logout | ✅ |
| GET | `/api/auth/me` | Get current user | ✅ |
| GET | `/api/wallet/tokens` | Get supported tokens | ❌ |
| GET | `/api/wallet` | Get wallet info | ✅ |
| GET | `/api/wallet/balance/{token}` | Get token balance | ✅ |
| POST | `/api/payments/crypto/purchase` | Initiate purchase | ✅ |
| GET | `/api/payments/purchase/{id}` | Get purchase status | ✅ |
| POST | `/api/phone/send-otp` | Send OTP | ✅ |
| POST | `/api/phone/verify-otp` | Verify OTP | ✅ |

## Authentication

Most endpoints require authentication using Bearer tokens:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/wallet
```

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All `/api/` endpoints
- **Headers**: Rate limit info included in response headers

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

## Development

### Testing the API

Use the provided test files in the `../tests/` directory:

```bash
# Run all tests
npm test

# Run specific test files
npm test -- api-tests.http
npm test -- crypto-purchase-tests.http
npm test -- phone-otp-tests.http
npm test -- wallet-api-tests.http
```

### Environment Setup

1. Copy environment variables:
   ```bash
   cp ../env.example ../.env
   ```

2. Configure required variables:
   - `DATABASE_URL` - PostgreSQL connection
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_ANON_KEY` - Supabase anonymous key
   - `VAULT_URL` - HashiCorp Vault URL
   - `VAULT_TOKEN` - HashiCorp Vault token

3. Run database migrations:
   ```bash
   npm run db:migrate
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Integration Examples

### User Registration Flow

```bash
# 1. Register user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+1234567890",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe",
    "country": "United States",
    "currency": "USD"
  }'

# 2. Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# 3. Use token for authenticated requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/wallet
```

### Crypto Purchase Flow

```bash
# 1. Initiate purchase
curl -X POST http://localhost:3000/api/payments/crypto/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenSymbol": "BTC",
    "fiatAmount": "1000",
    "phoneNumber": "+254712345678"
  }'

# 2. Check purchase status
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/payments/purchase/PURCHASE_ID
```

## Support

For API support and questions:
- **Documentation**: This directory
- **Issues**: GitHub repository
- **Email**: support@greywallet.com

---

*Last updated: January 2024*
*API Version: 1.0.0* 