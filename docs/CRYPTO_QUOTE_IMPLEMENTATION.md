# Crypto Quote Implementation

This document describes the implementation of the crypto quote system that provides real-time pricing for cryptocurrency purchases.

## Overview

The crypto quote system provides two main functionalities:

1. **Quantity-to-Fiat**: User specifies crypto quantity, gets fiat cost
2. **Fiat-to-Quantity**: User specifies fiat amount, gets crypto quantity

Both endpoints provide real-time pricing using external APIs and include platform fees.

## Architecture

### Components

1. **CryptoQuoteService** (`src/application/interfaces/crypto-quote-service.ts`)
   - Interface defining the contract for crypto quotation operations
   - Defines request/response types for both quote types

2. **CryptoQuoteServiceImpl** (`src/infrastructure/services/crypto-quote-service.ts`)
   - Real implementation using CoinGecko and ExchangeRate APIs
   - Includes caching for performance (5-minute cache)
   - Handles API failures gracefully

3. **GetCryptoQuoteUseCase** (`src/domain/use_cases/get-crypto-quote.ts`)
   - Business logic for quote generation
   - Validates requests and supported tokens
   - Handles error cases

4. **CryptoQuoteController** (`src/presentation/controllers/crypto-quote-controller.ts`)
   - HTTP request handling
   - Input validation
   - Response formatting

## API Endpoints

### 1. Quantity-to-Fiat Quote
**POST** `/api/quotes/crypto/quantity-to-fiat`

Get the fiat cost for a specific crypto quantity.

**Request Body:**
```json
{
  "tokenSymbol": "ETH",
  "quantity": 0.5,
  "userCurrency": "KES"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenSymbol": "ETH",
    "quantity": 0.5,
    "pricePerTokenUsd": 2500.00,
    "totalUsd": 1250.00,
    "userCurrency": "KES",
    "exchangeRate": 131.15,
    "totalInUserCurrency": 163937.50,
    "estimatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Fiat-to-Quantity Quote
**POST** `/api/quotes/crypto/fiat-to-quantity`

Get the crypto quantity for a specific fiat amount.

**Request Body:**
```json
{
  "tokenSymbol": "ETH",
  "fiatAmount": 10000,
  "userCurrency": "KES"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenSymbol": "ETH",
    "fiatAmount": 10000,
    "userCurrency": "KES",
    "exchangeRate": 0.007622,
    "fiatAmountUsd": 76.22,
    "pricePerTokenUsd": 2500.00,
    "quantity": 0.03048800,
    "estimatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Health Check
**GET** `/api/quotes/crypto/health`

Check if the crypto quote service is healthy.

## External APIs

### 1. CoinGecko API
- **URL**: `https://api.coingecko.com/api/v3/simple/price`
- **Purpose**: Get real-time cryptocurrency prices in USD
- **Rate Limits**: Free tier allows 30 calls/minute
- **Caching**: 5-minute cache to reduce API calls

**Supported Tokens:**
- BTC (Bitcoin)
- ETH (Ethereum)
- ADA (Cardano)
- SOL (Solana)
- USDT (Tether)
- USDC (USD Coin)

### 2. ExchangeRate API
- **URL**: `https://v6.exchangerate-api.com/v6`
- **Purpose**: Get forex exchange rates
- **Authentication**: API key (optional for free tier)
- **Rate Limits**: 1,500 requests/month on free tier
- **Caching**: 5-minute cache to reduce API calls

## Profit Margin Structure

- **Forex Spread**: 0.5% spread applied to forex rates
- **No Transaction Fees**: No explicit fees charged to users
- **Spread Application**:
  - For quantity-to-fiat: Forex rate increased by 0.5% (user pays more in local currency)
  - For fiat-to-quantity: Forex rate decreased by 0.5% (user gets less USD equivalent)

## Error Handling

### Common Error Responses

1. **Invalid Token Symbol**
```json
{
  "success": false,
  "message": "Unsupported or inactive token"
}
```

2. **Missing Required Fields**
```json
{
  "success": false,
  "message": "Token symbol, quantity, and user currency are required"
}
```

3. **Invalid Amount**
```json
{
  "success": false,
  "message": "Quantity must be a positive number"
}
```

4. **External API Failure**
```json
{
  "success": false,
  "message": "Failed to get price for ETH: CoinGecko API error: 429 Too Many Requests"
}
```

## Configuration

### Environment Variables

```bash
# Optional: ExchangeRate API key for higher limits
EXCHANGE_RATE_API_KEY=your_api_key_here
```

Without the API key, the service uses the free tier with limited requests.

## Testing

Use the provided test file: `tests/crypto-quote-tests.http`

Example test cases:
- Basic quantity-to-fiat quotes
- Basic fiat-to-quantity quotes
- Different currencies (KES, USD, EUR)
- Different tokens (BTC, ETH, SOL, ADA)
- Error cases (invalid tokens, missing fields)
- Edge cases (small amounts, large amounts)

## Performance Considerations

1. **Caching**: Both crypto prices and forex rates are cached for 5 minutes
2. **Parallel Processing**: Price and exchange rate fetching can happen in parallel
3. **Error Recovery**: Graceful handling of API failures with meaningful error messages
4. **Rate Limiting**: Caching reduces external API calls to stay within limits

## Security Considerations

1. **No Authentication Required**: Quote endpoints are public (no sensitive data)
2. **Input Validation**: All inputs are validated for type and range
3. **Rate Limiting**: Application-level rate limiting should be applied
4. **API Keys**: ExchangeRate API key should be kept secure

## Integration with Existing System

The crypto quote system integrates with:

1. **Token Repository**: Validates supported tokens
2. **Container**: Dependency injection for all services
3. **Logging**: Comprehensive logging for debugging
4. **Error Handling**: Consistent error response format

## Future Enhancements

1. **More Tokens**: Add support for additional cryptocurrencies
2. **More Currencies**: Support more fiat currencies
3. **Price History**: Track price changes over time
4. **Advanced Fees**: Dynamic fee structures based on amount/user tier
5. **Price Alerts**: Notify users of significant price changes
6. **Batch Quotes**: Get quotes for multiple tokens at once
