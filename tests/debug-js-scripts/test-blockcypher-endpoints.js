/**
 * Test BlockCypher API endpoints to find the correct one
 */

async function testBlockCypherEndpoints() {
  const testAddress = 'muMQG3fjxDqhz4kDDzQsAYsvvENmVuf8GR'; // From the error log
  const network = 'test3'; // Bitcoin testnet
  const apiKey = process.env.BLOCKCYPHER_API_KEY;
  
  // Different endpoint variations to test
  const endpoints = [
    // Current endpoint that's failing
    `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}/txs`,
    
    // Alternative endpoints from documentation
    `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}`,
    `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}/full`,
    `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}/balance`,
    
    // With different parameters
    `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}?unspentOnly=true`,
    `https://api.blockcypher.com/v1/btc/${network}/addrs/${testAddress}?includeScript=true`,
  ];
  
  console.log(`🧪 Testing BlockCypher endpoints for address: ${testAddress}`);
  console.log(`📡 Network: ${network}`);
  console.log(`🔑 API Key: ${apiKey ? 'Present' : 'Missing'}\n`);
  
  for (let i = 0; i < endpoints.length; i++) {
    const baseUrl = endpoints[i];
    const urlWithToken = apiKey ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${apiKey}` : baseUrl;
    
    console.log(`${i + 1}. Testing: ${baseUrl.replace(testAddress, 'ADDRESS')}`);
    
    try {
      const response = await fetch(urlWithToken);
      const statusText = response.statusText;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS (${response.status})`);
        
        // Show relevant fields
        if (data.balance !== undefined) console.log(`      Balance: ${data.balance} satoshis`);
        if (data.total_received !== undefined) console.log(`      Total Received: ${data.total_received} satoshis`);
        if (data.n_tx !== undefined) console.log(`      Transaction Count: ${data.n_tx}`);
        if (data.txrefs) console.log(`      Recent Transactions: ${data.txrefs.length}`);
        if (data.txs) console.log(`      Full Transactions: ${data.txs.length}`);
        
        console.log('');
        return baseUrl; // Return the first working endpoint
      } else {
        const errorText = await response.text();
        console.log(`   ❌ FAILED (${response.status} ${statusText})`);
        console.log(`      Error: ${errorText.substring(0, 100)}...`);
        console.log('');
      }
    } catch (error) {
      console.log(`   ❌ NETWORK ERROR: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('🔍 Testing with a known valid testnet address...');
  
  // Test with a known valid testnet address
  const knownAddress = 'n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi'; // Known testnet address
  const testUrl = `https://api.blockcypher.com/v1/btc/test3/addrs/${knownAddress}`;
  const testUrlWithToken = apiKey ? `${testUrl}?token=${apiKey}` : testUrl;
  
  try {
    console.log(`Testing known address: ${knownAddress}`);
    const response = await fetch(testUrlWithToken);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Known address works! Status: ${response.status}`);
      console.log(`   Balance: ${data.balance || 0} satoshis`);
      console.log(`   Transactions: ${data.n_tx || 0}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Known address failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Network error with known address: ${error.message}`);
  }
  
  return null;
}

testBlockCypherEndpoints().then(workingEndpoint => {
  if (workingEndpoint) {
    console.log(`\n🎉 Working endpoint found: ${workingEndpoint}`);
  } else {
    console.log(`\n❌ No working endpoints found. Check API key and network settings.`);
  }
}).catch(error => {
  console.error('Test failed:', error);
});
