# Wallet API Implementation

## Overview

The Wallet API provides comprehensive functionality for viewing wallet information, addresses, balances, and supported tokens. The implementation follows Clean Architecture principles with proper separation of concerns and robust error handling.

## 🏗️ Architecture

### Domain Layer
- **GetWalletInfoUseCase** - Retrieves comprehensive wallet information
- **GetTokenBalanceUseCase** - Gets detailed balance for specific tokens
- **GetSupportedTokensUseCase** - Lists all supported tokens

### Infrastructure Layer
- **WalletRepository** - Data access for wallet operations
- **TokenRepository** - Data access for token information
- **UserRepository** - Data access for user verification

### Presentation Layer
- **WalletController** - HTTP request/response handling
- **Wallet Routes** - API endpoint definitions
- **AuthMiddleware** - Route protection and authentication

## 🔐 Authentication

### Protected Endpoints
Most wallet endpoints require authentication via Bearer token:
- `GET /api/wallet` - Complete wallet information
- `GET /api/wallet/overview` - Wallet overview
- `GET /api/wallet/addresses` - All addresses
- `GET /api/wallet/balance/:tokenSymbol` - Token balance

### Public Endpoints
- `GET /api/wallet/tokens` - Supported tokens (no auth required)

## 📋 API Endpoints

### 1. Get Supported Tokens (Public)
```http
GET /api/wallet/tokens
```

**Purpose**: Retrieve all supported cryptocurrencies and their metadata.

**Response**:
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "tokenId": "uuid",
        "name": "Bitcoin",
        "symbol": "BTC",
        "icon": "/icons/bitcoin.svg",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalTokens": 4,
    "activeTokens": 4,
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Wallet Overview
```http
GET /api/wallet/overview
Authorization: Bearer <token>
```

**Purpose**: Get summary information about the user's wallet.

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "userEmail": "user@example.com",
    "totalBalance": 0,
    "totalTokens": 4,
    "supportedTokens": 4,
    "activeTokens": 4,
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Get Complete Wallet Information
```http
GET /api/wallet
Authorization: Bearer <token>
```

**Purpose**: Get comprehensive wallet information including all addresses and balances.

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "userEmail": "user@example.com",
    "totalBalance": 0,
    "totalTokens": 4,
    "addresses": [
      {
        "tokenSymbol": "BTC",
        "tokenName": "Bitcoin",
        "tokenIcon": "/icons/bitcoin.svg",
        "address": "bc1q...",
        "tokenBalance": 0,
        "walletBalance": 0,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Get Wallet Addresses
```http
GET /api/wallet/addresses
Authorization: Bearer <token>
```

**Purpose**: Get all wallet addresses for the authenticated user.

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "addresses": [
      {
        "tokenSymbol": "BTC",
        "tokenName": "Bitcoin",
        "tokenIcon": "/icons/bitcoin.svg",
        "address": "bc1q...",
        "tokenBalance": 0,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalAddresses": 4
  }
}
```

### 5. Get Token Balance
```http
GET /api/wallet/balance/:tokenSymbol
Authorization: Bearer <token>
```

**Purpose**: Get detailed balance information for a specific token.

**Parameters**:
- `tokenSymbol` - The token symbol (e.g., BTC, ETH, ADA, SOL)

**Response**:
```json
{
  "success": true,
  "data": {
    "tokenSymbol": "BTC",
    "tokenName": "Bitcoin",
    "tokenIcon": "/icons/bitcoin.svg",
    "address": "bc1q...",
    "userBalance": 0,
    "walletBalance": 0,
    "isActive": true,
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🛡️ Error Handling

### Authentication Errors
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Not Found Errors
```json
{
  "success": false,
  "message": "User not found"
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Token symbol is required"
}
```

### Server Errors
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## 🔧 Implementation Details

### Use Cases

#### GetWalletInfoUseCase
- Validates user exists
- Retrieves user addresses from wallet repository
- Fetches token metadata from token repository
- Calculates total balances
- Returns comprehensive wallet information

#### GetTokenBalanceUseCase
- Validates user and token exist
- Checks token is active
- Retrieves specific token balance
- Returns detailed token information

#### GetSupportedTokensUseCase
- Retrieves all tokens from repository
- Calculates active token count
- Returns token list with metadata

### Data Flow

1. **Request** → Controller receives HTTP request
2. **Authentication** → Middleware validates Bearer token
3. **Validation** → Controller validates request parameters
4. **Business Logic** → Use case executes business logic
5. **Data Access** → Repository fetches data from database
6. **Response** → Controller formats and returns response

### Database Schema

The wallet API uses the following database tables:

- **users** - User account information
- **wallets** - Pooled wallet information (one per token)
- **user_addresses** - User-specific addresses linked to pooled wallets
- **supported_tokens** - Token metadata and configuration

## 🧪 Testing

### Test File
Comprehensive tests are available in `tests/wallet-api-tests.http`

### Test Categories
1. **Authentication Tests** - Valid/invalid tokens
2. **Public Endpoint Tests** - Supported tokens endpoint
3. **Protected Endpoint Tests** - All authenticated endpoints
4. **Error Handling Tests** - Invalid parameters and edge cases
5. **Performance Tests** - Concurrent request handling
6. **Integration Tests** - Complete user flows

### Running Tests
1. Set up environment variables
2. Get authentication token from sign-in
3. Update `@authToken` variable in test file
4. Run individual tests or complete test suite

## 🚀 Usage Examples

### Frontend Integration

#### React Hook Example
```typescript
const useWalletInfo = () => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWalletInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setWalletInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch wallet info:', error);
    } finally {
      setLoading(false);
    }
  };

  return { walletInfo, loading, fetchWalletInfo };
};
```

#### Vue.js Composition API Example
```javascript
import { ref, onMounted } from 'vue';

export function useWallet() {
  const walletInfo = ref(null);
  const loading = ref(false);

  const fetchWalletInfo = async () => {
    loading.value = true;
    try {
      const response = await fetch('/api/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        walletInfo.value = data.data;
      }
    } catch (error) {
      console.error('Failed to fetch wallet info:', error);
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchWalletInfo);

  return { walletInfo, loading, fetchWalletInfo };
}
```

### Mobile App Integration

#### React Native Example
```javascript
const fetchTokenBalance = async (tokenSymbol) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wallet/balance/${tokenSymbol}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to fetch token balance:', error);
    return null;
  }
};
```

## 🔄 Future Enhancements

### Planned Features
1. **Real-time Balance Updates** - WebSocket integration for live balance updates
2. **Transaction History** - Get transaction history for each token
3. **Send Transactions** - Implement transaction sending functionality
4. **Address Generation** - Generate new addresses for existing tokens
5. **Balance Alerts** - Set up balance threshold notifications

### Performance Optimizations
1. **Caching** - Implement Redis caching for frequently accessed data
2. **Pagination** - Add pagination for large address lists
3. **Compression** - Enable response compression
4. **Rate Limiting** - Implement API rate limiting

## 📊 Monitoring and Logging

### Logging
All wallet operations are logged with structured data:
- User ID for tracking
- Token symbols for analysis
- Balance amounts for monitoring
- Error details for debugging

### Metrics
Key metrics to monitor:
- API response times
- Error rates by endpoint
- User activity patterns
- Token usage statistics

## 🔒 Security Considerations

### Authentication
- All sensitive endpoints require valid Bearer tokens
- Tokens are validated on every request
- Expired tokens are properly handled

### Data Protection
- User data is isolated by user ID
- No cross-user data access
- Input validation on all parameters

### Rate Limiting
- Implement rate limiting to prevent abuse
- Monitor for suspicious activity patterns
- Log security events for analysis

## 📝 API Versioning

The current implementation is version 1.0. Future versions will maintain backward compatibility where possible.

### Versioning Strategy
- URL-based versioning: `/api/v1/wallet/`
- Header-based versioning: `Accept: application/vnd.wallet.v1+json`
- Deprecation notices in response headers

## 🎯 Best Practices

### For Developers
1. **Error Handling** - Always handle API errors gracefully
2. **Loading States** - Show loading indicators during API calls
3. **Caching** - Cache token lists and user data appropriately
4. **Retry Logic** - Implement retry logic for failed requests

### For API Consumers
1. **Authentication** - Store tokens securely
2. **Token Refresh** - Handle token expiration properly
3. **Error Messages** - Display user-friendly error messages
4. **Offline Support** - Handle network connectivity issues

## 📚 Additional Resources

- [Authentication API Documentation](./SIGN_IN_IMPLEMENTATION.md)
- [Database Schema Documentation](./README.md#database-schema)
- [Clean Architecture Overview](./README.md#architecture)
- [Testing Guide](./tests/README.md) 