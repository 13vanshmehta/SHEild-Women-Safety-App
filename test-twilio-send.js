// Test actual Twilio sending
require('dotenv').config();
const twilioService = require('./services/twilioService');

async function testTwilioSend() {
  console.log('🧪 Testing Twilio SMS/WhatsApp Sending\n');

  // IMPORTANT: Replace with YOUR verified phone number
  const testPhone = '+917977101454'; // Replace with your number
  
  console.log(`📱 Test Phone Number: ${testPhone}`);
  console.log('⚠️  Make sure this number is verified in Twilio Console!\n');

  // Test SMS
  console.log('1️⃣ Sending Test SMS...');
  try {
    const smsResult = await twilioService.sendSMS(
      testPhone,
      '🧪 Test SMS from SHEild SOS Feature. If you receive this, SMS is working!'
    );
    
    console.log('SMS Result:', smsResult);
    
    if (smsResult.success) {
      console.log('✅ SMS sent successfully!');
      console.log(`   Message SID: ${smsResult.sid}`);
    } else {
      console.log('❌ SMS failed:', smsResult.error);
    }
  } catch (error) {
    console.log('❌ SMS error:', error.message);
  }

  console.log('');

  // Test WhatsApp
  console.log('2️⃣ Sending Test WhatsApp...');
  console.log('⚠️  Make sure you joined the WhatsApp sandbox!');
  console.log('   Send "join <code>" to +14155238886\n');
  
  try {
    const whatsappResult = await twilioService.sendWhatsApp(
      testPhone,
      '🧪 Test WhatsApp from SHEild SOS Feature. If you receive this, WhatsApp is working!'
    );
    
    console.log('WhatsApp Result:', whatsappResult);
    
    if (whatsappResult.success) {
      console.log('✅ WhatsApp sent successfully!');
      console.log(`   Message SID: ${whatsappResult.sid}`);
    } else {
      console.log('❌ WhatsApp failed:', whatsappResult.error);
    }
  } catch (error) {
    console.log('❌ WhatsApp error:', error.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('✅ Test Complete!');
  console.log('');
  console.log('Check your phone for messages.');
  console.log('Check Twilio Console: https://console.twilio.com/us1/monitor/logs/messaging');
}

testTwilioSend()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
