/**
 * Test M-Pesa Callback Script
 * Helps debug M-Pesa callback issues by sending test callbacks
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test callback data formats
const testCallbacks = [
  {
    name: 'M-Pesa STK Callback (Success) - Real Format',
    data: {
      Body: {
        stkCallback: {
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 1 },
              { Name: "MpesaReceiptNumber", Value: "TH38PTPPR2" },
              { Name: "Balance", Value: "{Amount={CurrencyCode=KES, MinimumAmount=8900, BasicAmount=89.00}}" },
              { Name: "TransactionDate", Value: 20250803135929 },
              { Name: "PhoneNumber", Value: 254726367035 }
            ]
          },
          CheckoutRequestID: "ws_CO_1754218759724726367035",
          MerchantRequestID: "7986-42b4-afaa-21a08f7aefcc1800839",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully"
        }
      }
    }
  },
  {
    name: 'Standard M-Pesa Callback (Success)',
    data: {
      CheckoutRequestID: "ws_CO_123456789",
      MerchantRequestID: "12345-67890-12345",
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully.",
      Amount: 1025,
      MpesaReceiptNumber: "QK123456789",
      TransactionDate: "20241230123456",
      PhoneNumber: "254700000000"
    }
  },
  {
    name: 'Standard M-Pesa Callback (Failed)',
    data: {
      CheckoutRequestID: "ws_CO_123456790",
      MerchantRequestID: "12345-67890-12346",
      ResultCode: "1",
      ResultDesc: "The balance is insufficient for the transaction.",
      Amount: 1025,
      PhoneNumber: "254700000000"
    }
  },
  {
    name: 'Missing CheckoutRequestID',
    data: {
      MerchantRequestID: "12345-67890-12347",
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully.",
      Amount: 1025,
      PhoneNumber: "254700000000"
    }
  },
  {
    name: 'Empty CheckoutRequestID',
    data: {
      CheckoutRequestID: "",
      MerchantRequestID: "12345-67890-12348",
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully.",
      Amount: 1025,
      PhoneNumber: "254700000000"
    }
  },
  {
    name: 'Null CheckoutRequestID',
    data: {
      CheckoutRequestID: null,
      MerchantRequestID: "12345-67890-12349",
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully.",
      Amount: 1025,
      PhoneNumber: "254700000000"
    }
  },
  {
    name: 'CamelCase Field Names',
    data: {
      checkoutRequestId: "ws_CO_123456791",
      merchantRequestId: "12345-67890-12350",
      resultCode: "0",
      resultDesc: "The service request is processed successfully.",
      amount: 1025,
      phoneNumber: "254700000000"
    }
  },
  {
    name: 'Mixed Case Field Names',
    data: {
      checkoutRequestID: "ws_CO_123456792",
      merchantRequestID: "12345-67890-12351",
      resultCode: "0",
      resultDesc: "The service request is processed successfully.",
      amount: 1025,
      phoneNumber: "254700000000"
    }
  }
];

async function testCallback(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('📤 Sending data:', JSON.stringify(testCase.data, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/payments/mpesa/callback`, testCase.data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('📥 Error Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runTests() {
  console.log('🚀 Starting M-Pesa Callback Tests');
  console.log('📍 Target URL:', `${BASE_URL}/api/payments/mpesa/callback`);
  
  for (const testCase of testCallbacks) {
    await testCallback(testCase);
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 All tests completed');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCallbacks, testCallback, runTests }; 