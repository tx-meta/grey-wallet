// Test the date conversion logic
function testDateConversion() {
  const testDate = '20250803184208'; // M-Pesa format: YYYYMMDDHHMMSS
  
  console.log('Testing date conversion...');
  console.log('Input date string:', testDate);
  
  if (testDate.length === 14) {
    const year = parseInt(testDate.substring(0, 4));
    const month = parseInt(testDate.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(testDate.substring(6, 8));
    const hour = parseInt(testDate.substring(8, 10));
    const minute = parseInt(testDate.substring(10, 12));
    const second = parseInt(testDate.substring(12, 14));
    
    const convertedDate = new Date(year, month, day, hour, minute, second);
    
    console.log('Parsed components:', { year, month: month + 1, day, hour, minute, second });
    console.log('Converted date:', convertedDate);
    console.log('ISO string:', convertedDate.toISOString());
    console.log('Local string:', convertedDate.toString());
  } else {
    console.log('Invalid date format');
  }
}

testDateConversion(); 