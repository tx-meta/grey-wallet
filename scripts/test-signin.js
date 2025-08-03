/**
 * Sign In Test Script
 * Tests the sign-in functionality of the Grey Wallet API
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

async function testSignIn() {
  console.log('🧪 Testing Sign In Functionality\n');

  try {
    // Test 1: Valid Sign In
    console.log('1. Testing valid sign in...');
    const signInResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (signInResponse.data.success) {
      console.log('✅ Sign in successful!');
      console.log('   User ID:', signInResponse.data.data.user.id);
      console.log('   Email:', signInResponse.data.data.user.email);
      console.log('   Access Token:', signInResponse.data.data.session.accessToken.substring(0, 20) + '...');
      
      const accessToken = signInResponse.data.data.session.accessToken;
      const refreshToken = signInResponse.data.data.session.refreshToken;

      // Test 2: Get Current User with valid token
      console.log('\n2. Testing get current user with valid token...');
      const currentUserResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (currentUserResponse.data.success) {
        console.log('✅ Get current user successful!');
        console.log('   User ID:', currentUserResponse.data.data.user.id);
        console.log('   Email:', currentUserResponse.data.data.user.email);
      } else {
        console.log('❌ Get current user failed:', currentUserResponse.data.message);
      }

      // Test 3: Refresh Token
      console.log('\n3. Testing token refresh...');
      const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken: refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.data.success) {
        console.log('✅ Token refresh successful!');
        console.log('   New Access Token:', refreshResponse.data.data.session.accessToken.substring(0, 20) + '...');
      } else {
        console.log('❌ Token refresh failed:', refreshResponse.data.message);
      }

      // Test 4: Logout
      console.log('\n4. Testing logout...');
      const logoutResponse = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (logoutResponse.data.success) {
        console.log('✅ Logout successful!');
      } else {
        console.log('❌ Logout failed:', logoutResponse.data.message);
      }

    } else {
      console.log('❌ Sign in failed:', signInResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data.message);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }

  // Test 5: Invalid credentials
  console.log('\n5. Testing invalid credentials...');
  try {
    const invalidSignInResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: 'WrongPassword123!',
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!invalidSignInResponse.data.success) {
      console.log('✅ Invalid credentials properly rejected:', invalidSignInResponse.data.message);
    } else {
      console.log('❌ Invalid credentials should have been rejected');
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Invalid credentials properly rejected');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 6: Missing required fields
  console.log('\n6. Testing missing required fields...');
  try {
    const missingFieldsResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      // password missing
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!missingFieldsResponse.data.success) {
      console.log('✅ Missing fields properly rejected:', missingFieldsResponse.data.message);
    } else {
      console.log('❌ Missing fields should have been rejected');
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Missing fields properly rejected');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\n🎉 Sign In Tests Completed!');
}

// Run the test
testSignIn().catch(console.error); 