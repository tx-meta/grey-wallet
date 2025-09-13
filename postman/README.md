# B2B Payment API - Postman Collection

## 📋 Overview

This Postman collection provides comprehensive testing for the B2B Payment API, including crypto-funded M-Pesa business payments with automatic treasury management and webhook callbacks.

## 🚀 Features Covered

- **Authentication** - JWT token-based authentication
- **B2B Payment Quotes** - Create quotes for Paybill, Till, and Pochi payments
- **Payment Finalization** - Execute B2B payments using crypto funds
- **Webhook Callbacks** - Simulate M-Pesa callback responses
- **Error Handling** - Test various error scenarios
- **Integration Testing** - Complete end-to-end payment flows
- **Balance Management** - Check wallet balances before/after payments

## 📁 Collection Structure

### 1. **Authentication**
- `Login` - Obtain JWT token for API access

### 2. **B2B Payment Quotes**
- `Create Paybill Quote` - Quote for paybill payments (ReceiverIdentifierType: 4)
- `Create Till Quote` - Quote for till number payments (ReceiverIdentifierType: 2)
- `Create Pochi Quote` - Quote for phone number payments (ReceiverIdentifierType: 1)

### 3. **B2B Payment Finalization**
- `Finalize Paybill Payment` - Execute paybill payment
- `Finalize Till Payment` - Execute till payment
- `Finalize Pochi Payment` - Execute phone payment

### 4. **B2B Payment Callbacks**
- `Successful Payment Callback` - Simulate successful M-Pesa response
- `Failed Payment Callback` - Simulate payment failure
- `Invalid Account Number Callback` - Test account validation errors
- `System Error Callback` - Test M-Pesa system errors
- `Malformed Callback Data` - Test invalid callback handling

### 5. **Error Scenarios**
- `Create Quote - Missing Fields` - Test validation errors
- `Create Quote - Invalid Recipient Type` - Test type validation
- `Finalize - Invalid Quote ID` - Test quote validation
- `Unauthorized Request` - Test authentication requirements

### 6. **Wallet & Balance**
- `Check Wallet Balance` - Get overall wallet information
- `Check USDT Balance` - Get specific token balance

### 7. **Integration Tests**
- `Complete Success Flow` - Full successful payment journey
- `Complete Failure Flow` - Full failed payment with balance restoration

## 🔧 Setup Instructions

### 1. **Import Collection**
1. Open Postman
2. Click "Import" button
3. Select `B2B-Payment-Collection.json`
4. Collection will be imported with all requests and tests

### 2. **Configure Environment**
The collection uses global variables that are automatically set:

| Variable | Description | Auto-Set |
|----------|-------------|----------|
| `baseUrl` | API base URL | ✅ (http://localhost:3000) |
| `jwt_token` | Authentication token | ✅ (from login response) |
| `user_id` | Authenticated user ID | ✅ (from login response) |
| `*_quote_id` | Quote IDs for different payment types | ✅ (from quote responses) |
| `*_transaction_id` | Transaction IDs | ✅ (from finalize responses) |
| `*_originator_conversation_id` | M-Pesa conversation IDs | ✅ (from finalize responses) |

### 3. **Update Base URL (if needed)**
If your API runs on a different URL:
1. Go to collection variables
2. Update `baseUrl` value
3. Save changes

### 4. **Update Login Credentials**
Update the login request with your test credentials:
```json
{
  "email": "your-test-email@example.com",
  "password": "your-test-password"
}
```

## 🏃‍♂️ Running Tests

### **Quick Start - Run All Tests**
1. Right-click on collection name
2. Select "Run collection"
3. Click "Run B2B Payment API"
4. View results in runner

### **Manual Testing**
1. Start with **Authentication** → **Login**
2. Run **B2B Payment Quotes** to create quotes
3. Run **B2B Payment Finalization** to execute payments
4. Run **B2B Payment Callbacks** to simulate M-Pesa responses
5. Check **Wallet & Balance** to verify balances

### **Integration Testing**
Run the complete flows in **Integration Tests**:
1. **Complete Success Flow** - Tests successful payment end-to-end
2. **Complete Failure Flow** - Tests payment failure and balance restoration

## 🧪 Test Scenarios

### **Success Scenarios**
- ✅ Create quotes for all payment types (paybill, till, pochi)
- ✅ Finalize payments successfully
- ✅ Process success callbacks
- ✅ Verify balance updates

### **Failure Scenarios**
- ❌ Handle missing required fields
- ❌ Validate recipient types
- ❌ Process payment failures
- ❌ Restore balances on failure
- ❌ Handle malformed callback data

### **Error Handling**
- 🔒 Authentication required
- 📝 Input validation
- 🔍 Quote not found errors
- 🚫 Invalid callback structure

## 📊 Callback Testing

### **M-Pesa Callback Structure**
The collection simulates real M-Pesa callback payloads:

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "29115-34620561-1",
    "ConversationID": "AG_20231213_1234567890abcdef",
    "TransactionID": "NLJ7RT61SV",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "TransactionID",
          "Value": "NLJ7RT61SV"
        },
        {
          "Key": "TransactionAmount", 
          "Value": "1000.00"
        }
      ]
    }
  }
}
```

### **Result Codes**
- `0` - Success
- `1` - Insufficient balance
- `2` - Invalid account number
- `1001` - System busy/locked subscriber

## 🔍 Automated Testing

### **Test Scripts**
Each request includes automated tests that verify:
- HTTP status codes
- Response structure
- Required fields presence
- Business logic correctness
- Variable extraction for chaining

### **Example Test Script**
```javascript
pm.test("Payment finalized successfully", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.transactionId).to.exist;
    
    // Store for callback testing
    pm.globals.set("transaction_id", jsonData.data.transactionId);
});
```

## 🔄 Variable Chaining

The collection automatically chains requests using variables:

1. **Login** → Stores `jwt_token`
2. **Create Quote** → Stores `quote_id`
3. **Finalize Payment** → Stores `transaction_id` and `originator_conversation_id`
4. **Callback** → Uses `originator_conversation_id` for realistic testing

## 🚨 Troubleshooting

### **Common Issues**

1. **401 Unauthorized**
   - Run Login request first
   - Check if JWT token is stored in global variables

2. **Quote Not Found**
   - Ensure quote creation succeeded
   - Check if quote has expired (5 minutes)
   - Verify quote ID is stored correctly

3. **Callback Not Processing**
   - Verify `OriginatorConversationID` matches finalize response
   - Check callback payload structure
   - Ensure server is running and accessible

### **Debug Tips**
- Check Console tab for variable values
- Use `pm.globals.get("variable_name")` to inspect variables
- Enable "Save responses" in runner for detailed debugging

## 🎯 Best Practices

1. **Run Login First** - Always authenticate before other requests
2. **Check Variables** - Verify variables are set correctly between requests
3. **Use Folders** - Run folders sequentially for logical flow
4. **Monitor Responses** - Check response times and status codes
5. **Clean State** - Clear variables between test runs if needed

## 📝 Notes

- Collection is configured for local development (`localhost:3000`)
- All requests include response time and content-type tests
- Variables are automatically managed between requests
- Callback requests simulate real M-Pesa webhook calls
- Integration tests provide complete end-to-end validation

## 🔗 Related Files

- `B2B-Payment-Collection.json` - Main Postman collection
- `../tests/b2b-payment.http` - HTTP client test file
- `../src/presentation/routes/mpesa-callback-routes.ts` - Callback routes
- `../src/domain/use_cases/process-b2b-payment-callback.ts` - Callback processing

---

**Happy Testing! 🎉**

For issues or questions, check the API documentation or server logs for detailed error information.
