/**
 * Test Error Handling for User Sign-up
 * Tests the standardized error responses when signing up existing users
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PHONE = '+254712345678';

async function testExistingUserSignUp() {
  console.log('🧪 Testing Error Handling for Existing User Sign-up\n');
  
  try {
    // First, try to sign up a user
    console.log('1️⃣ Attempting to sign up user...');
    const signUpResponse = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
      email: TEST_EMAIL,
      phone: TEST_PHONE,
      password: 'TestPassword123',
      country: 'Kenya',
      currency: 'KES'
    });
    
    console.log('✅ First sign-up successful:', signUpResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ First sign-up failed (expected):', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      console.log('❌ First sign-up failed with network error:', error.message);
    }
  }
  
  // Now try to sign up the same user again
  console.log('\n2️⃣ Attempting to sign up the same user again...');
  
  try {
    const duplicateSignUpResponse = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
      email: TEST_EMAIL,
      phone: TEST_PHONE,
      password: 'TestPassword123',
      country: 'Kenya',
      currency: 'KES'
    });
    
    console.log('❌ Unexpected success on duplicate sign-up:', duplicateSignUpResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.log('✅ Duplicate sign-up correctly rejected:', {
        status: error.response.status,
        data: error.response.data
      });
      
      // Verify the error response structure
      const { data } = error.response;
      console.log('\n📋 Error Response Analysis:');
      console.log(`   Success: ${data.success}`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Code: ${data.code}`);
      console.log(`   Timestamp: ${data.timestamp}`);
      
      if (data.errors) {
        console.log(`   Validation Errors: ${data.errors.length}`);
        data.errors.forEach((err, index) => {
          console.log(`     ${index + 1}. Field: ${err.field}, Message: ${err.message}, Code: ${err.code}`);
        });
      }
      
      // Check if this is the expected error
      if (data.code === 'USER_EXISTS' && data.message.includes('already exists')) {
        console.log('\n🎯 SUCCESS: Correct error response for existing user!');
      } else {
        console.log('\n⚠️  WARNING: Unexpected error response format');
      }
      
    } else {
      console.log('❌ Duplicate sign-up failed with network error:', error.message);
    }
  }
}

async function testValidationErrors() {
  console.log('\n\n🧪 Testing Validation Error Handling\n');
  
  try {
    console.log('3️⃣ Testing validation errors with invalid data...');
    const validationResponse = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
      email: 'invalid-email',
      phone: '123', // Too short
      password: 'weak', // Too weak
      // Missing required fields
    });
    
    console.log('❌ Unexpected success on invalid data:', validationResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.log('✅ Validation errors correctly caught:', {
        status: error.response.status,
        data: error.response.data
      });
      
      const { data } = error.response;
      console.log('\n📋 Validation Error Response:');
      console.log(`   Success: ${data.success}`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Code: ${data.code}`);
      
      if (data.errors && data.errors.length > 0) {
        console.log(`   Field Errors: ${data.errors.length}`);
        data.errors.forEach((err, index) => {
          console.log(`     ${index + 1}. Field: ${err.field}, Message: ${err.message}, Code: ${err.code}`);
        });
      }
      
      if (data.code === 'VALIDATION_ERROR') {
        console.log('\n🎯 SUCCESS: Correct validation error response!');
      } else {
        console.log('\n⚠️  WARNING: Unexpected validation error response format');
      }
      
    } else {
      console.log('❌ Validation test failed with network error:', error.message);
    }
  }
}

async function runTests() {
  try {
    await testExistingUserSignUp();
    await testValidationErrors();
    
    console.log('\n\n✨ All tests completed!');
    console.log('\n📝 Summary:');
    console.log('   - Existing user sign-up should return 409 status with USER_EXISTS code');
    console.log('   - Validation errors should return 400 status with VALIDATION_ERROR code');
    console.log('   - All errors should have consistent structure with user-friendly messages');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testExistingUserSignUp, testValidationErrors };
