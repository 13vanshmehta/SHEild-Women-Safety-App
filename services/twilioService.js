const twilio = require('twilio');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      console.warn('Twilio credentials not configured. SMS/WhatsApp features will not work.');
      this.client = null;
    }
  }

  // Validate phone number
  isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }
    
    // Check if it's an email
    if (phoneNumber.includes('@')) {
      return false;
    }
    
    // Remove formatting characters
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Check if it contains only digits and optional +
    return /^\+?\d{10,15}$/.test(cleaned);
  }

  // Format phone number to E.164 format
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      console.error('❌ Phone number is empty or undefined');
      return '';
    }

    // Validate first
    if (!this.isValidPhoneNumber(phoneNumber)) {
      console.error(`❌ Invalid phone number format: ${phoneNumber}`);
      return '';
    }

    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If number doesn't start with country code, assume it's Indian number
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Add + prefix for E.164 format
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    console.log(`📞 Formatted phone: ${phoneNumber} → ${cleaned}`);
    return cleaned;
  }

  // Send SMS
  async sendSMS(to, message) {
    try {
      if (!this.client) {
        console.error('Twilio client not initialized');
        return {
          success: false,
          error: 'Twilio not configured'
        };
      }

      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: formattedTo
      });

      console.log('SMS sent successfully:', result.sid);
      
      return {
        success: true,
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send WhatsApp message
  async sendWhatsApp(to, message) {
    try {
      if (!this.client) {
        console.error('Twilio client not initialized');
        return {
          success: false,
          error: 'Twilio not configured'
        };
      }

      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: `whatsapp:${this.whatsappNumber}`,
        to: `whatsapp:${formattedTo}`
      });

      console.log('WhatsApp sent successfully:', result.sid);
      
      return {
        success: true,
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send bulk SMS
  async sendBulkSMS(recipients, message) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient.phoneNumber, message);
      results.push({
        recipient: recipient.name || recipient.phoneNumber,
        ...result
      });
    }
    
    return results;
  }

  // Send bulk WhatsApp
  async sendBulkWhatsApp(recipients, message) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendWhatsApp(recipient.phoneNumber, message);
      results.push({
        recipient: recipient.name || recipient.phoneNumber,
        ...result
      });
    }
    
    return results;
  }

  // Check message status
  async getMessageStatus(messageSid) {
    try {
      if (!this.client) {
        return {
          success: false,
          error: 'Twilio not configured'
        };
      }

      const message = await this.client.messages(messageSid).fetch();
      
      return {
        success: true,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Error fetching message status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new TwilioService();
