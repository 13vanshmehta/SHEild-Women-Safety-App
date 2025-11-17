// Quick verification that SOS feature is ready
require('dotenv').config();
const mongoose = require('mongoose');

async function verifySOSReady() {
  console.log('🔍 Verifying SOS Feature is Ready...\n');

  let allGood = true;

  // 1. Check Twilio
  console.log('1️⃣ Twilio Configuration:');
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    console.log('   ✅ Twilio credentials configured');
    console.log('   📱 Phone: ' + process.env.TWILIO_PHONE_NUMBER);
    console.log('   💬 WhatsApp: ' + process.env.TWILIO_WHATSAPP_NUMBER);
  } else {
    console.log('   ❌ Twilio credentials missing');
    allGood = false;
  }
  console.log('');

  // 2. Check Database Connection
  console.log('2️⃣ Database Connection:');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ MongoDB connected');
    
    // Check collections
    const User = require('./models/user');
    const EmergencyContact = require('./models/emergencyContact');
    const Group = require('./models/group');
    const SOSAlert = require('./models/sosAlert');
    
    const userCount = await User.countDocuments();
    const contactCount = await EmergencyContact.countDocuments();
    const groupCount = await Group.countDocuments();
    const sosCount = await SOSAlert.countDocuments();
    
    console.log('   📊 Users:', userCount);
    console.log('   📊 Emergency Contacts:', contactCount);
    console.log('   📊 Groups:', groupCount);
    console.log('   📊 SOS Alerts:', sosCount);
    
    await mongoose.disconnect();
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    allGood = false;
  }
  console.log('');

  // 3. Check Routes
  console.log('3️⃣ Routes & Controllers:');
  try {
    require('./routers/sos');
    console.log('   ✅ SOS routes loaded');
    require('./controllers/sosController');
    console.log('   ✅ SOS controller loaded');
    require('./services/twilioService');
    console.log('   ✅ Twilio service loaded');
  } catch (error) {
    console.log('   ❌ Error loading modules:', error.message);
    allGood = false;
  }
  console.log('');

  // 4. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allGood) {
    console.log('✅ SOS FEATURE IS READY!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Start backend: npm start');
    console.log('   2. Verify phone numbers in Twilio Console');
    console.log('   3. Add 2+ emergency contacts in app');
    console.log('   4. Test SOS trigger');
    console.log('   5. Check SMS/WhatsApp delivery');
  } else {
    console.log('❌ SOME ISSUES FOUND');
    console.log('');
    console.log('Please fix the issues above and try again.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  process.exit(allGood ? 0 : 1);
}

verifySOSReady().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
