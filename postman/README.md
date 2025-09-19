# Crypto Deposit API - Postman Collection

This directory contains Postman collections and environments for testing the Crypto Deposit API feature.

## Files

- `Crypto_Deposit_API.postman_collection.json` - Main collection with all API endpoints
- `Crypto_Deposit_Environment.postman_environment.json` - Environment variables for testing
- `README.md` - This documentation file

## Import Instructions

### 1. Import Collection
1. Open Postman
2. Click "Import" button
3. Select `Crypto_Deposit_API.postman_collection.json`
4. Click "Import"

### 2. Import Environment
1. Click the gear icon (⚙️) in the top right
2. Click "Import"
3. Select `Crypto_Deposit_Environment.postman_environment.json`
4. Click "Import"
5. Select "Crypto Deposit Environment" from the environment dropdown

## Setup

### Environment Variables
Update the following variables in your environment:

- `baseUrl`: Your API server URL (default: http://localhost:3000)
- `testUserEmail`: Valid user email for authentication
- `testUserPassword`: Valid user password for authentication
- `webhookSecret`: Your webhook secret key (if using webhook endpoints)

### Authentication
1. Run the "Login" request first to get an access token
2. The token will be automatically stored in `accessToken` variable
3. All authenticated endpoints will use this token automatically

## Collection Structure

### 1. Authentication
- **Login**: Get access token for protected endpoints

### 2. Deposit Addresses
- **Get User Deposit Addresses**: Retrieve all deposit addresses for user

### 3. Deposit History
- **Get All Deposit History**: Retrieve complete deposit history
- **Get Filtered Deposit History**: Retrieve filtered/paginated results

### 4. Deposit Details
- **Get Specific Deposit**: Retrieve details for a specific deposit
- **Get Non-Existent Deposit**: Test error handling

### 5. Blockchain Webhooks
- **Webhook Health Check**: Verify webhook endpoint is working
- **Bitcoin Deposit Webhook**: Simulate Bitcoin deposit notification
- **Ethereum Deposit Webhook**: Simulate ETH deposit notification
- **USDT Deposit Webhook**: Simulate USDT (ERC20) deposit notification

### 6. Error Handling Tests
- **Unauthorized Request**: Test authentication requirements
- **Invalid UUID Format**: Test input validation

## Test Scripts

Each request includes automated test scripts that verify:
- Response status codes
- Response structure and data types
- Required fields presence
- Error handling scenarios

## Usage Workflow

### Basic Testing Flow
1. **Authentication**: Run "Login" to get access token
2. **Get Addresses**: Retrieve user's deposit addresses
3. **Check History**: View existing deposits
4. **Test Webhooks**: Simulate incoming deposits
5. **Verify Updates**: Check that deposits appear in history

### Advanced Testing
1. **Pagination**: Test different page sizes and filters
2. **Error Cases**: Test invalid inputs and unauthorized access
3. **Webhook Verification**: Test different blockchain networks
4. **Real Deposits**: Use actual testnet transactions

## Webhook Testing

The collection includes webhook simulation requests for:

### Bitcoin Deposits
- Simulates BlockCypher-style webhook payload
- Includes transaction details, confirmations, and addresses

### Ethereum Deposits
- Simulates native ETH transfer
- Includes gas details, block information, and confirmations

### USDT Deposits
- Simulates ERC20 token transfer
- Includes contract address, token details, and decimal handling

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API server URL | `http://localhost:3000` |
| `accessToken` | JWT token (auto-set) | `eyJhbGciOiJIUzI1NiIs...` |
| `testUserEmail` | Test user email | `user@example.com` |
| `testUserPassword` | Test user password | `SecurePass123` |
| `testUserId` | User UUID | `66607a7d-f4ee-406a-...` |
| `testDepositId` | Deposit UUID (auto-set) | `deposit-uuid-here` |
| `webhookSecret` | Webhook verification key | `your-secret-key` |
| `sepoliaUSDTContract` | Sepolia USDT address | `0xBbFf793a9A074408A...` |
| `sepoliaUSDCContract` | Sepolia USDC address | `0x1c7D4B196Cb0C7B01...` |
| `testWalletAddress` | Test deposit address | `0x217F087bEd898eDC8...` |
| `testBTCAddress` | Test Bitcoin address | `bc1qxy2kgdygjrsqtzq...` |

## Expected Responses

### Successful Deposit Address Response
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "addresses": [
      {
        "tokenSymbol": "BTC",
        "tokenName": "Bitcoin",
        "address": "bc1q...",
        "qrCode": "data:image/png;base64,...",
        "tokenBalance": 0.00000000,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### Successful Deposit History Response
```json
{
  "success": true,
  "data": {
    "deposits": [
      {
        "id": "deposit-uuid",
        "txHash": "0x123...",
        "tokenSymbol": "USDT",
        "amount": 10.000000,
        "status": "confirmed",
        "confirmations": 15,
        "detectedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure you run "Login" first
   - Check that `accessToken` is set in environment
   - Verify user credentials are correct

2. **Server Connection**
   - Verify `baseUrl` points to running server
   - Check server is running on correct port
   - Ensure no firewall blocking requests

3. **Webhook Testing**
   - Verify webhook secret is configured
   - Check server logs for webhook processing
   - Ensure payload format matches expected structure

### Debug Tips

1. **Check Environment Variables**
   - Click eye icon (👁️) to view current values
   - Ensure all required variables are set

2. **Review Test Results**
   - Check "Test Results" tab after each request
   - Failed tests indicate response issues

3. **Monitor Server Logs**
   - Watch server console for error messages
   - Check database connection status
   - Verify blockchain listener status

## Security Notes

- Never commit real API keys or passwords
- Use testnet addresses and tokens only
- Rotate webhook secrets regularly
- Validate all webhook signatures in production

## Support

For issues or questions:
1. Check server logs for errors
2. Verify environment configuration
3. Test individual endpoints manually
4. Review API documentation for expected formats