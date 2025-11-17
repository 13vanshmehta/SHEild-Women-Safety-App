// Complete SOS test script
require('dotenv').config();
const mongoose = require('mongoose');
const twilioService = require('./services/twilioService');

async function testSOSComplete() {
  console.log('🧪 Complete SOS Feature Test\n');
  console.log('═══════════════════════════════════════\n');

  // 1. Test Twilio Configuration
  console.log('1️⃣ Testing Twilio Configuration:');
  console.log('   Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
  console.log('   Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('   Phone Number:', process.env.TWILIO_PHONE_NUMBER || '❌ Missing');
  console.log('   WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER || '❌ Missing');
  console.log('   Twilio Client:', twilioService.client ? '✅ Initialized' : '❌ Not Initialized');
  console.log('');

  // 2. Test Phone Number Formatting
  console.log('2️⃣ Testing Phone Number Formatting:');
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

  // 3. Connect to Database
  console.log('3️⃣ Testing Database Connection:');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ MongoDB connected');

    const User = require('./models/user');
    const EmergencyContact = require('./models/emergencyContact');
    const Group = require('./models/group');
    const SOSAlert = require('./models/sosAlert');

    const userCount = await User.countDocuments();
    const contactCount = await EmergencyContact.countDocuments();
    const groupCount = await Group.countDocuments();
    const sosCount = await SOSAlert.countDocuments();

    console.log(`   Users: ${userCount}`);
    console.log(`   Emergency Contacts: ${contactCount}`);
    console.log(`   Groups: ${groupCount}`);
    console.log(`   SOS Alerts: ${sosCount}`);
    console.log('');

    // 4. Check Emergency Contacts
    console.log('4️⃣ Checking Emergency Contacts:');
    const contacts = await EmergencyContact.find({ isActive: true }).limit(5);
    console.log(`   Found ${contacts.length} active emergency contacts:`);
    contacts.forEach((contact, i) => {
      console.log(`   ${i + 1}. ${contact.name} - ${contact.phoneNumber}`);
    });
    console.log('');

    // 5. Check Groups
    console.log('5️⃣ Checking Groups:');
    const groups = await Group.find({ isActive: true }).limit(5);
    console.log(`   Found ${groups.length} active groups:`);
    groups.forEach((group, i) => {
      const membersWithPhone = group.members.filter(m => m.phoneNumber && m.isActive).length;
      console.log(`   ${i + 1}. ${group.name} - ${membersWithPhone} members with phone numbers`);
    });
    console.log('');

    // 6. Test SMS Sending (if you want to actually send a test)
    console.log('6️⃣ SMS/WhatsApp Test (Dry Run):');
    console.log('   To actually send a test message, uncomment the code below');
    console.log('   and replace with a verified phone number.');
    console.log('');
    
    /*
    // UNCOMMENT TO SEND TEST MESSAGE
    const testPhone = '+919876543210'; // Replace with your verified number
    console.log(`   Sending test SMS to ${testPhone}...`);
    const smsResult = await twilioService.sendSMS(testPhone, '🧪 Test SMS from SHEild SOS Feature');
    console.log('   SMS Result:', smsResult);
    
    console.log(`   Sending test WhatsApp to ${testPhone}...`);
    const whatsappResult = await twilioService.sendWhatsApp(testPhone, '🧪 Test WhatsApp from SHEild SOS Feature');
    console.log('   WhatsApp Result:', whatsappResult);
    */

    await mongoose.disconnect();
    console.log('   ✅ Database disconnected');

  } catch (error) {
    console.error('   ❌ Database error:', error.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('✅ Test Complete!');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('   1. Ensure backend is running: npm start');
  console.log('   2. Verify phone numbers in Twilio Console');
  console.log('   3. Add 2+ emergency contacts in app');
  console.log('   4. Trigger SOS from app');
  console.log('   5. Check backend logs for detailed output');
  console.log('   6. Verify SMS/WhatsApp received');
  console.log('');
}

testSOSComplete()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
