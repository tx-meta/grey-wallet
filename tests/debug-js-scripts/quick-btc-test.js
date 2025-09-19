/**
 * Quick test of current Bitcoin listener issue
 */

async function quickTest() {
  console.log('🔍 Quick BlockCypher API test...');
  
  // Test the exact URL format our code is using
  const address = 'muMQG3fjxDqhz4kDDzQsAYsvvENmVuf8GR';
  const network = 'test3';
  const apiKey = process.env.BLOCKCYPHER_API_KEY;
  
  // Current format (failing)
  let currentUrl = `https://api.blockcypher.com/v1/btc/${network}/addrs/${address}/txs`;
  if (apiKey) {
    currentUrl += `?token=${apiKey}`;
  }
  
  // Alternative format (recommended)
  let altUrl = `https://api.blockcypher.com/v1/btc/${network}/addrs/${address}`;
  if (apiKey) {
    altUrl += `?token=${apiKey}`;
  }
  
  console.log('1. Testing current format (failing):');
  console.log(`   ${currentUrl.replace(/token=[^&]+/, 'token=***')}`);
  
  try {
    const response1 = await fetch(currentUrl);
    if (response1.ok) {
      console.log(`   ✅ SUCCESS: ${response1.status}`);
    } else {
      const error1 = await response1.text();
      console.log(`   ❌ FAILED: ${response1.status} ${response1.statusText}`);
      console.log(`   Error: ${error1}`);
    }
  } catch (err) {
    console.log(`   ❌ NETWORK ERROR: ${err.message}`);
  }
  
  console.log('\n2. Testing alternative format:');
  console.log(`   ${altUrl.replace(/token=[^&]+/, 'token=***')}`);
  
  try {
    const response2 = await fetch(altUrl);
    if (response2.ok) {
      const data = await response2.json();
      console.log(`   ✅ SUCCESS: ${response2.status}`);
      console.log(`   Balance: ${data.balance || 0} satoshis`);
      console.log(`   Total Received: ${data.total_received || 0} satoshis`);
      console.log(`   Transaction Count: ${data.n_tx || 0}`);
      
      if (data.txrefs && data.txrefs.length > 0) {
        console.log(`   Recent Transactions: ${data.txrefs.length}`);
        console.log('   📋 This endpoint provides transaction references, not full transaction data');
      }
    } else {
      const error2 = await response2.text();
      console.log(`   ❌ FAILED: ${response2.status} ${response2.statusText}`);
      console.log(`   Error: ${error2}`);
    }
  } catch (err) {
    console.log(`   ❌ NETWORK ERROR: ${err.message}`);
  }
  
  // Test a simple address info endpoint
  console.log('\n3. Testing basic address info:');
  const basicUrl = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`;
  
  try {
    const response3 = await fetch(basicUrl);
    if (response3.ok) {
      const data = await response3.json();
      console.log(`   ✅ SUCCESS: ${response3.status}`);
      console.log(`   Address: ${data.address}`);
      console.log(`   Balance: ${data.balance} satoshis`);
      console.log(`   Total Received: ${data.total_received} satoshis`);
    } else {
      const error3 = await response3.text();
      console.log(`   ❌ FAILED: ${response3.status} ${response3.statusText}`);
    }
  } catch (err) {
    console.log(`   ❌ NETWORK ERROR: ${err.message}`);
  }
}

quickTest();
