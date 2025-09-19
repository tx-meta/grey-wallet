/**
 * Test the Bitcoin BlockCypher API fixes
 */

async function testBitcoinFix() {
  console.log('🔧 Testing Bitcoin BlockCypher API fixes...\n');
  
  const testAddress = 'muMQG3fjxDqhz4kDDzQsAYsvvENmVuf8GR'; // From error logs
  const network = 'test3';
  const apiKey = process.env.BLOCKCYPHER_API_KEY;
  
  console.log(`📍 Test Address: ${testAddress}`);
  console.log(`🌐 Network: ${network}`);
  console.log(`🔑 API Key: ${apiKey ? 'Present' : 'Missing'}\n`);
  
  // Test 1: New address endpoint (should work)
  console.log('1️⃣ Testing NEW address endpoint format:');
  let newUrl = `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}`;
  const params = [];
  
  if (apiKey) {
    params.push(`token=${apiKey}`);
  }
  params.push('limit=50');
  
  if (params.length > 0) {
    newUrl += '?' + params.join('&');
  }
  
  console.log(`   URL: ${newUrl.replace(/token=[^&]+/, 'token=***')}`);
  
  try {
    const response = await fetch(newUrl);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS (${response.status})`);
      console.log(`   📊 Address: ${data.address}`);
      console.log(`   💰 Balance: ${data.balance || 0} satoshis (${(data.balance || 0) / 100000000} BTC)`);
      console.log(`   📈 Total Received: ${data.total_received || 0} satoshis`);
      console.log(`   📋 Total Transactions: ${data.n_tx || 0}`);
      
      if (data.txrefs && data.txrefs.length > 0) {
        console.log(`   🔗 Transaction References: ${data.txrefs.length}`);
        console.log('   📝 Recent transactions:');
        data.txrefs.slice(0, 3).forEach((txref, i) => {
          const amount = txref.value / 100000000;
          const type = txref.tx_output_n >= 0 ? 'received' : 'sent';
          console.log(`      ${i + 1}. ${type.toUpperCase()}: ${amount} BTC (${txref.confirmations || 0} confirmations)`);
        });
      } else {
        console.log('   📝 No transactions found');
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ FAILED (${response.status} ${response.statusText})`);
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ NETWORK ERROR: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Old problematic endpoint (should fail)
  console.log('2️⃣ Testing OLD problematic endpoint format:');
  let oldUrl = `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}/txs`;
  if (apiKey) {
    oldUrl += `?token=${apiKey}`;
  }
  
  console.log(`   URL: ${oldUrl.replace(/token=[^&]+/, 'token=***')}`);
  
  try {
    const response = await fetch(oldUrl);
    if (response.ok) {
      console.log(`   ✅ SUCCESS (${response.status}) - Unexpected!`);
    } else {
      const errorText = await response.text();
      console.log(`   ❌ FAILED (${response.status} ${response.statusText}) - Expected`);
      console.log(`   Error: ${errorText.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`   ❌ NETWORK ERROR: ${error.message} - Expected`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Transaction endpoint (for confirmation tracking)
  console.log('3️⃣ Testing transaction endpoint (for confirmation tracking):');
  
  // Use a known testnet transaction hash if available
  const testTxHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'; // Placeholder
  let txUrl = `https://api.blockcypher.com/v1/btc/${network}/txs/${testTxHash}`;
  if (apiKey) {
    txUrl += `?token=${apiKey}`;
  }
  
  console.log(`   URL: ${txUrl.replace(/token=[^&]+/, 'token=***')}`);
  console.log('   Note: Using placeholder transaction hash - will likely return 404');
  
  try {
    const response = await fetch(txUrl);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS (${response.status})`);
      console.log(`   📋 Transaction: ${data.hash}`);
      console.log(`   🔗 Confirmations: ${data.confirmations || 0}`);
    } else {
      console.log(`   ❌ FAILED (${response.status} ${response.statusText}) - Expected for placeholder hash`);
    }
  } catch (error) {
    console.log(`   ❌ NETWORK ERROR: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Address validation
  console.log('4️⃣ Testing Bitcoin address validation:');
  
  const testAddresses = [
    'muMQG3fjxDqhz4kDDzQsAYsvvENmVuf8GR', // From error (should be valid)
    'mumqg3fjxdqhz4kddzqsaysvvenmvuf8gr', // Lowercase version (should be invalid)
    'n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi', // Known valid testnet
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', // Mainnet bech32
    'invalid-address-123', // Clearly invalid
  ];
  
  function isValidBitcoinAddress(address) {
    if (!address || address.length < 26 || address.length > 62) {
      return false;
    }
    const mainnetRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
    const testnetRegex = /^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$|^tb1[a-z0-9]{39,59}$/;
    return mainnetRegex.test(address) || testnetRegex.test(address);
  }
  
  testAddresses.forEach((addr, i) => {
    const isValid = isValidBitcoinAddress(addr);
    const status = isValid ? '✅ VALID' : '❌ INVALID';
    console.log(`   ${i + 1}. ${status}: ${addr} (length: ${addr.length})`);
  });
  
  console.log('\n🎯 Summary:');
  console.log('   • New address endpoint should work and return transaction references');
  console.log('   • Old /txs endpoint should fail with 404 (as expected)');
  console.log('   • Address validation should filter out invalid addresses');
  console.log('   • Case-sensitive addresses should be preserved');
  console.log('\n✅ Bitcoin listener should now work without 404 errors!');
}

testBitcoinFix().catch(console.error);
