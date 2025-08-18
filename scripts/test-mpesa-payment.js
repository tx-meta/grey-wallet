const { MpesaPaymentService } = require('../dist/src/infrastructure/services/mpesa-payment-service');

async function testMpesaPayment() {
  try {
    console.log('Testing M-Pesa payment service...');
    
    const paymentService = new MpesaPaymentService();
    
    // Test access token generation
    console.log('Testing access token generation...');
    const token = await paymentService.getAccessToken();
    console.log('Access token:', token ? 'SUCCESS' : 'FAILED');
    
    // Test payment initiation (with a small test amount)
    console.log('Testing payment initiation...');
    const result = await paymentService.initiateMpesaPayment({
      amount: 1, // 1 KES test amount
      phoneNumber: '254700000000', // Test phone number
      accountReference: 'test-transaction-123',
      transactionDesc: 'Test payment',
      callbackUrl: 'https://23cf386557fb.ngrok-free.app/api/payments/mpesa/callback'
    });
    
    console.log('Payment initiation result:', result);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMpesaPayment(); 