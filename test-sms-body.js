// Test SMS body
require('dotenv').config();
const twilioService = require('./services/twilioService');

const testPhone = '+919892719513'; // Replace with your number

// Create test SOS message (same as in controller)
const userName = 'MEHTA\'s MOBILE';
const userPhone = '7977101454';
const location = {
  latitude: 19.2935867,
  longitude: 72.8538764,
  address: 'Test Location'
};
const deviceInfo = {
  batteryLevel: 67,
  networkStatus: 'moderate'
};
const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

const fullMessage = `🚨 EMERGENCY SOS ALERT 🚨

${userName} needs immediate help!

📱 Phone: ${userPhone}
⏰ Time: ${new Date().toLocaleString()}
📍 Location: ${location.address || 'Address not available'}
🔋 Battery: ${deviceInfo?.batteryLevel || 0}%
📶 Network: ${deviceInfo?.networkStatus || 'unknown'}

Please respond immediately!

Location: ${googleMapsLink}`;

console.log('📝 Message that will be sent:');
console.log('═══════════════════════════════════════');
console.log(fullMessage);
console.log('═══════════════════════════════════════\n');

console.log(`📱 Sending SMS to ${testPhone}...\n`);

twilioService.sendSMS(testPhone, fullMessage)
  .then(result => {
    if (result.success) {
      console.log('✅ SMS SENT SUCCESSFULLY!');
      console.log('   SID:', result.sid);
      console.log('   Status:', result.status);
      console.log('\n📱 Check your phone for the message!');
    } else {
      console.log('❌ SMS FAILED!');
      console.log('   Error:', result.error);
    }
  })
  .catch(err => {
    console.log('❌ ERROR:', err.message);
  });
