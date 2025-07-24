# API Testing Guide

This directory contains test files for the Grey Wallet API.

## HTTP Test File

The `api-tests.http` file contains comprehensive test cases for all API endpoints. You can use this file with:

### VS Code REST Client Extension

1. **Install the Extension**: Install "REST Client" by Huachao Mao
2. **Open the Test File**: Open `tests/api-tests.http`
3. **Select Environment**: Choose between "development" or "production" environment
4. **Run Tests**: Click "Send Request" above any request to execute it

### Alternative Tools

- **Insomnia**: Import the HTTP file
- **Postman**: Convert the HTTP file to Postman collection
- **cURL**: Use the requests as templates for cURL commands

## Test Categories

### ✅ Currently Working
- **Health Check**: `GET /health`
- **Sign Up**: `POST /api/auth/signup` (with validation)

### 🚧 Partially Implemented
- **Sign In**: `POST /api/auth/login` (placeholder)
- **Email Verification**: `POST /api/auth/verify-email` (placeholder)
- **SMS Verification**: `POST /api/auth/verify-sms` (placeholder)

### 📋 Planned
- **Password Reset**: `POST /api/auth/reset-password`
- **User Profile**: `GET /api/auth/me`
- **Wallet Operations**: `GET /api/wallet/*`
- **User Management**: `GET /api/user/*`

## Test Scenarios

### Sign Up Tests
1. **Valid Sign Up**: Complete user registration
2. **Multiple Users**: Different currencies and countries
3. **Validation Errors**: Invalid email, weak password, etc.
4. **Duplicate Users**: Email and phone uniqueness

### Sign In Tests
1. **Valid Credentials**: Successful login
2. **Invalid Credentials**: Wrong password
3. **Non-existent User**: User not found

### Verification Tests
1. **Email Verification**: Token-based email confirmation
2. **SMS Verification**: Token-based phone confirmation

## Environment Variables

The test file uses environment variables for easy customization:

```http
@baseUrl = http://localhost:3000
@contentType = application/json
@testEmail = test@example.com
@testPhone = +1234567890
@testPassword = TestPassword123!
```

## Running Tests

### Prerequisites
1. Start the development server: `npm run dev`
2. Ensure the server is running on `http://localhost:3000`

### Quick Test
1. Open `tests/api-tests.http`
2. Run the "Health Check" test first
3. Run "Valid Sign Up" test
4. Check the response for success

### Validation Testing
1. Run the "Invalid Email" test
2. Run the "Weak Password" test
3. Run the "Duplicate Email" test
4. Verify all return appropriate error messages

## Expected Responses

### Successful Sign Up
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "createdAt": "2025-07-24T..."
    },
    "wallet": {
      "walletId": "uuid",
      "walletBalance": 0,
      "createdAt": "2025-07-24T..."
    },
    "message": "User registered successfully..."
  }
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Server Not Running**
   - Error: `ECONNREFUSED`
   - Solution: Run `npm run dev`

2. **Port Already in Use**
   - Error: `EADDRINUSE`
   - Solution: Change port in `.env` or kill existing process

3. **Validation Errors**
   - Check the request body format
   - Ensure all required fields are present
   - Verify email and phone formats

4. **CORS Issues**
   - Check CORS configuration in `src/index.ts`
   - Verify `CORS_ORIGIN` in environment variables

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your `.env` file.

## Adding New Tests

To add new test cases:

1. Add the request to `api-tests.http`
2. Include a descriptive comment
3. Test both success and failure scenarios
4. Update this README if needed

## Test Data Management

The current implementation uses mock repositories, so:
- Data is stored in memory only
- Data is reset when the server restarts
- No persistent storage between tests
- Perfect for development and testing

For production testing, implement real database repositories. 