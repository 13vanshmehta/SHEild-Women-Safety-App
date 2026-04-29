/**
 * SHEild - Email Utility with Multiple Provider Support
 * Supports: Gmail, SendGrid, Mailgun, AWS SES, Resend
 * Optimized for Render deployment
 */

const nodemailer = require('nodemailer');

/**
 * Create email transporter based on configured provider
 * Supports: gmail, sendgrid, mailgun, ses, resend
 */
const createTransporter = () => {
    const emailProvider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();
    
    try {
        switch (emailProvider) {
            case 'sendgrid':
                return createSendGridTransporter();
            case 'mailgun':
                return createMailgunTransporter();
            case 'ses':
                return createSESTransporter();
            case 'resend':
                return createResendTransporter();
            case 'gmail':
            default:
                return createGmailTransporter();
        }
    } catch (error) {
        console.error('Error creating email transporter:', error);
        throw error;
    }
};

/**
 * Gmail Transporter (requires app-specific password for 2FA)
 * Recommended: Use Gmail App Password, not regular password
 */
const createGmailTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // Use app-specific password for 2FA
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
};

/**
 * SendGrid Transporter (Works great with Render, free tier available)
 * Setup: Create API key in SendGrid → set EMAIL_PROVIDER=sendgrid + EMAIL_PASS=api_key
 */
const createSendGridTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
            user: 'apikey',
            pass: process.env.EMAIL_PASS, // SendGrid API key
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
};

/**
 * Mailgun Transporter (Another reliable option for Render)
 * Setup: Create Mailgun account → set EMAIL_PROVIDER=mailgun + EMAIL_PASS=api_key
 */
const createMailgunTransporter = () => {
    const domain = process.env.MAILGUN_DOMAIN || 'sandboxXXX.mailgun.org';
    return nodemailer.createTransport({
        host: `smtp.mailgun.org`,
        port: 587,
        secure: false,
        auth: {
            user: `postmaster@${domain}`,
            pass: process.env.EMAIL_PASS, // Mailgun API key
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
};

/**
 * AWS SES Transporter
 * Setup: Configure AWS credentials → set EMAIL_PROVIDER=ses
 */
const createSESTransporter = () => {
    return nodemailer.createTransport({
        host: 'email-smtp.' + (process.env.AWS_REGION || 'us-east-1') + '.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.AWS_ACCESS_KEY_ID,
            pass: process.env.AWS_SECRET_ACCESS_KEY,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
};

/**
 * Resend Transporter (Modern email service, great for Render)
 * Setup: Create account at resend.com → set EMAIL_PROVIDER=resend + EMAIL_PASS=api_key
 */
const createResendTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
            user: 'resend',
            pass: process.env.EMAIL_PASS, // Resend API key
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
};

/**
 * Send OTP email for email verification
 */
const sendOTPEmail = async (email, otp) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sheildapp.com',
        to: email,
        subject: 'SHEild — Verify Your Email',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0A0A1A; color: #EAEAFF; margin: 0; padding: 0; }
                    .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
                    .card { background: #12122A; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.06); }
                    h1 { text-align: center; font-size: 22px; margin-bottom: 16px; color: #EAEAFF; }
                    p { color: #A0A0CC; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
                    .otp-box { text-align: center; margin: 24px 0; }
                    .otp-code { display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 12px; padding: 16px 32px; border-radius: 12px; background: linear-gradient(135deg, rgba(233,30,140,0.1), rgba(9,132,227,0.1)); border: 2px solid rgba(233,30,140,0.3); color: #E91E8C; font-family: monospace; }
                    .expiry { text-align: center; color: #FF7675; font-size: 12px; margin-top: 8px; }
                    .footer { text-align: center; margin-top: 24px; color: #5A5A80; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <h1>🛡️ Verify Your Email</h1>
                        <p>Welcome to SHEild! Please use the following code to verify your email address:</p>
                        <div class="otp-box">
                            <div class="otp-code">${otp}</div>
                            <div class="expiry">Expires in 10 minutes</div>
                        </div>
                        <p>If you didn't create a SHEild account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} SHEild. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send Welcome email after successful verification
 */
const sendWelcomeEmail = async (email, firstName) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sheildapp.com',
        to: email,
        subject: 'Welcome to SHEild! 🛡️',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #F8F8F8; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
                    .card { background: #FFFFFF; border-radius: 16px; padding: 40px; border: 1px solid #EAEAEA; }
                    h1 { text-align: center; font-size: 22px; margin-bottom: 16px; color: #1A1A1A; }
                    p { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
                    .highlight { background: linear-gradient(135deg, rgba(233,30,140,0.08), rgba(9,132,227,0.08)); border-left: 4px solid #E91E8C; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
                    ul { color: #555; margin: 0; padding-left: 20px; }
                    li { margin-bottom: 6px; }
                    .footer { text-align: center; margin-top: 24px; color: #BBB; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <h1>🛡️ Welcome to SHEild, ${firstName}!</h1>
                        <p>Your email has been verified. You're all set to start your safety journey.</p>
                        <div class="highlight">
                            <strong>What's Next?</strong>
                            <ul>
                                <li>Set up your emergency contacts</li>
                                <li>Configure your SOS preferences</li>
                                <li>Explore safe routes & community features</li>
                                <li>Stay safe, stay connected!</li>
                            </ul>
                        </div>
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} SHEild. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendOTPEmail,
    sendWelcomeEmail,
};
