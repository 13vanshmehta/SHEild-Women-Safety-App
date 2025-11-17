// Test script to verify SOS feature is working
require('dotenv').config();
const twilioService = require('./services/twilioService');

console.log('🧪 Testing SOS Feature Setup\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking Environment Variables:');
console.log('   MongoDB URI:', process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing');
console.log('   JWT Secret:', process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing');
console.log('   Twilio Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing');
console.log('   Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Configured' : '❌ Missing');
console.log('   Twilio Phone:', process.env.TWILIO_PHONE_NUMBER || '❌ Missing');
console.log('   WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER || '❌ Missing');
console.log('');

// Test 2: Check Twilio service
console.log('2️⃣ Checking Twilio Service:');
console.log('   Twilio Client:', twilioService.client ? '✅ Initialized' : '❌ Not Initialized');
console.log('');

// Test 3: Check models
console.log('3️⃣ Checking Models:');
try {
  require('./models/user');
  console.log('   User Model: ✅ Loaded');
} catch (e) {
  console.log('   User Model: ❌ Error -', e.message);
}

try {
  require('./models/emergencyContact');
  console.log('   EmergencyContact Model: ✅ Loaded');
} catch (e) {
  console.log('   EmergencyContact Model: ❌ Error -', e.message);
}

try {
  require('./models/group');
  console.log('   Group Model: ✅ Loaded');
} catch (e) {
  console.log('   Group Model: ❌ Error -', e.message);
}

try {
  require('./models/sosAlert');
  console.log('   SOSAlert Model: ✅ Loaded');
} catch (e) {
  console.log('   SOSAlert Model: ❌ Error -', e.message);
}
console.log('');

// Test 4: Check controllers
console.log('4️⃣ Checking Controllers:');
try {
  require('./controllers/sosController');
  console.log('   SOS Controller: ✅ Loaded');
} catch (e) {
  console.log('   SOS Controller: ❌ Error -', e.message);
}
console.log('');

// Test 5: Check routes
console.log('5️⃣ Checking Routes:');
try {
  require('./routers/sos');
  console.log('   SOS Routes: ✅ Loaded');
} catch (e) {
  console.log('   SOS Routes: ❌ Error -', e.message);
}
console.log('');

// Test 6: Test phone number formatting
console.log('6️⃣ Testing Phone Number Formatting:');
const testNumbers = [
  '9876543210',
  '+919876543210',
  '14155551234',
  '+14155551234'
];

testNumbers.forEach(num => {
  const formatted = twilioService.formatPhoneNumber(num);
  console.log(`   ${num} → ${formatted}`);
});
console.log('');

console.log('✅ All checks completed!\n');
console.log('📝 Next Steps:');
console.log('   1. Ensure backend server is running: npm start');
console.log('   2. Add at least 2 emergency contacts in the app');
console.log('   3. Verify phone numbers in Twilio Console (trial account)');
console.log('   4. Test SOS trigger from the app');
console.log('   5. Check SMS/WhatsApp delivery\n');
