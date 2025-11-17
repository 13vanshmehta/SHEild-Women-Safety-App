// Check Twilio message status
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Message SIDs from your last SOS trigger
const messageSids = [
  'SM86a44ba61c6a6be8c03f4ffed0de4a28', // SMS to Vansh Mehta
  'SM5ba9accfdd4282c9575a5520895b9224', // SMS to Henil Mehta
  'SMe8fb4547fd9d951455a552d97bcb144a', // SMS to Vansh
  'SM2ac9875ab157e6d16ba8960117fe2224', // WhatsApp to Vansh Mehta
  'SMabcfc1c2f8671e052545ea11dab9c723', // WhatsApp to Henil Mehta
  'SM1a64ad3bd13eef2924e9f807864022a7', // WhatsApp to Vansh
];

async function checkMessageStatus() {
  console.log('🔍 Checking Twilio Message Status\n');
  console.log('═══════════════════════════════════════\n');

  for (const sid of messageSids) {
    try {
      const message = await client.messages(sid).fetch();
      
      console.log(`📱 Message SID: ${sid}`);
      console.log(`   To: ${message.to}`);
      console.log(`   From: ${message.from}`);
      console.log(`   Status: ${message.status}`);
      console.log(`   Direction: ${message.direction}`);
      console.log(`   Price: ${message.price} ${message.priceUnit}`);
      
      if (message.errorCode) {
        console.log(`   ❌ Error Code: ${message.errorCode}`);
        console.log(`   ❌ Error Message: ${message.errorMessage}`);
      }
      
      console.log(`   Date Sent: ${message.dateSent}`);
      console.log(`   Date Updated: ${message.dateUpdated}`);
      console.log('');
      
    } catch (error) {
      console.log(`❌ Error fetching message ${sid}:`, error.message);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════');
  console.log('✅ Status Check Complete!\n');
  
  console.log('📝 Status Meanings:');
  console.log('   queued     - Waiting to be sent');
  console.log('   sending    - Currently being sent');
  console.log('   sent       - Sent to carrier');
  console.log('   delivered  - Successfully delivered ✅');
  console.log('   undelivered - Failed to deliver ❌');
  console.log('   failed     - Failed to send ❌');
  console.log('');
  
  console.log('💡 Next Steps:');
  console.log('   - If status is "delivered": Check your phone!');
  console.log('   - If status is "sent": Wait a few minutes');
  console.log('   - If status is "failed": Check error code');
  console.log('   - If status is "undelivered": Check phone number');
}

checkMessageStatus()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
