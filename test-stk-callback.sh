#!/bin/bash

# STK Push Callback Test Script
# Tests the atomic transaction functionality

BASE_URL="http://localhost:3000"
CHECKOUT_REQUEST_ID="ws_CO_test_atomic_$(date +%s)"

echo "🧪 Testing STK Push Callback Atomicity"
echo "Using CheckoutRequestID: $CHECKOUT_REQUEST_ID"
echo ""

# Test 1: Successful STK Push Callback
echo "🚀 Test 1: Sending successful STK Push callback..."

curl -X POST "$BASE_URL/api/mpesa/callback/stk-push" \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "MerchantRequestID": "test-merchant-request-12345",
        "CheckoutRequestID": "'"$CHECKOUT_REQUEST_ID"'",
        "ResultCode": 0,
        "ResultDesc": "The service request is processed successfully.",
        "CallbackMetadata": {
          "Item": [
            {
              "Name": "Amount",
              "Value": 1010
            },
            {
              "Name": "MpesaReceiptNumber",
              "Value": "TEST_RECEIPT_12345"
            },
            {
              "Name": "TransactionDate",
              "Value": "20250910123456"
            },
            {
              "Name": "PhoneNumber",
              "Value": "254700000000"
            }
          ]
        }
      }
    }
  }' \
  -w "\nResponse Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Test 1 completed"
echo ""

# Test 2: Failed STK Push Callback
echo "🚀 Test 2: Sending failed STK Push callback..."

FAILED_CHECKOUT_REQUEST_ID="ws_CO_test_failed_$(date +%s)"

curl -X POST "$BASE_URL/api/mpesa/callback/stk-push" \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "MerchantRequestID": "test-merchant-request-failed",
        "CheckoutRequestID": "'"$FAILED_CHECKOUT_REQUEST_ID"'",
        "ResultCode": 1,
        "ResultDesc": "The balance is insufficient for the transaction."
      }
    }
  }' \
  -w "\nResponse Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Test 2 completed"
echo ""

# Test 3: Invalid callback data
echo "🚀 Test 3: Sending invalid callback data..."

curl -X POST "$BASE_URL/api/mpesa/callback/stk-push" \
  -H "Content-Type: application/json" \
  -d '{
    "invalid": "json"
  }' \
  -w "\nResponse Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Test 3 completed"
echo ""

echo "🎯 All tests completed! Check the server logs for detailed processing information."
echo ""
echo "Key things to verify in the logs:"
echo "  1. Transaction status updates"
echo "  2. User wallet balance updates"
echo "  3. Treasury balance updates (FIAT increased, CRYPTO decreased)"
echo "  4. All operations are wrapped in atomic transactions"
echo "  5. Proper error handling for invalid data"
