/**
 * Simple test script for sign-up functionality
 * Run with: node test-signup.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testSignUp() {
  try {
    console.log('🚀 Testing Grey Wallet Sign-Up API...\n');

    // Test data
    const signUpData = {
      email: 'test@example.com',
      phone: '+1234567890',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      country: 'United States',
      currency: 'USD'
    };

    console.log('📝 Test Data:', JSON.stringify(signUpData, null, 2));
    console.log('\n📤 Sending sign-up request...');

    // Make the sign-up request
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, signUpData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Sign-up successful!');
    console.log('📊 Response Status:', response.status);
    console.log('📄 Response Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Sign-up failed!');
    
    if (error.response) {
      console.error('📊 Error Status:', error.response.status);
      console.error('📄 Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('🌐 Network Error:', error.message);
      console.error('💡 Make sure the server is running on http://localhost:3000');
    } else {
      console.error('💥 Error:', error.message);
    }
  }
}

async function testHealthCheck() {
  try {
    console.log('🏥 Testing health check...');
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Grey Wallet API Tests\n');

  // First check if server is running
  const isHealthy = await testHealthCheck();
  
  if (!isHealthy) {
    console.log('\n💡 To start the server, run: npm run dev');
    return;
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test sign-up
  await testSignUp();

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error); 