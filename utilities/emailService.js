/**
 * SHEild - Email Utility with Multiple Provider Support
 * Supports: Gmail, SendGrid, Mailgun, AWS SES, Resend
 * Optimized for Render deployment
 */

const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

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
 * Send email via SendGrid Web API
 */
const sendViaSendGridAPI = async ({ from, to, subject, html }) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');

    // Support `from` values like 'Name <email@example.com>' or just 'email@example.com'
    let fromObj = { email: from };
    const m = /^(.*)\s*<([^>]+)>\s*$/.exec(from);
    if (m) {
        const name = m[1].trim();
        const emailAddr = m[2].trim();
        fromObj = { email: emailAddr, name: name };
    }

    const payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: fromObj,
        subject,
        content: [{ type: 'text/html', value: html }],
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 10000,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`SendGrid API error: ${res.status} ${text}`);
    }
    return true;
};

/**
 * Send email via Resend API
 */
const sendViaResendAPI = async ({ from, to, subject, html }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');

    const payload = {
        from,
        to,
        subject,
        html,
    };

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 10000,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Resend API error: ${res.status} ${text}`);
    }
    return true;
};

/**
 * Send OTP email for email verification (after registration)
 */
const sendOTPEmail = async (email, otp, userName) => {
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
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #000000; color: #FFFFFF; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 48px 20px; }
                    .card { background: #0b0b0b; border-radius: 14px; padding: 36px; border: 1px solid rgba(255,255,255,0.04); box-shadow: 0 6px 24px rgba(0,0,0,0.6); }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 18px; color: #FFFFFF; }
                    p { color: #cfcfcf; font-size: 15px; line-height: 1.6; margin-bottom: 14px; }
                    .otp-box { text-align: center; margin: 15px 0; overflow: hidden; }
                    .otp-code { box-sizing: border-box; display: inline-block; font-size: 28px; font-weight: 800; letter-spacing: 6px; padding: 10px 20px; border-radius: 12px; background: linear-gradient(135deg, rgba(232,67,147,0.06), rgba(255,102,102,0.02)); border: 1px solid rgba(255,255,255,0.06); color: #ff69b4; font-family: monospace; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    @media only screen and (max-width:480px) { .otp-code { font-size: 22px; letter-spacing: 4px; padding: 8px 14px; } }
                    .expiry { text-align: center; color: #ff9fa8; font-size: 12px; margin-top: 8px; }
                    .footer { text-align: center; margin-top: 24px; color: #7a7a7a; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <h1>Verify Your Email</h1>
                        <p>Hi ${userName || 'there'},</p>
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

    // SendGrid-only mode: always use SendGrid Web API. Nodemailer/SMTP is disabled to avoid Render SMTP issues.
    if (process.env.SENDGRID_API_KEY) {
        try {
            await sendViaSendGridAPI({ from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject, html: mailOptions.html });
            return;
        } catch (err) {
            console.error('[OTP] SendGrid API send failed:', err.message || err);
            throw err;
        }
    }

    throw new Error('SENDGRID_API_KEY not configured. SendGrid-only mode enabled.');
};

/**
 * Send OTP email for password reset
 */
const sendPasswordResetOtpEmail = async (email, otp, userName) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sheildapp.com',
        to: email,
        subject: 'SHEild — Password Reset OTP',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #000000; color: #FFFFFF; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 48px 20px; }
                    .card { background: #0b0b0b; border-radius: 14px; padding: 36px; border: 1px solid rgba(255,255,255,0.04); box-shadow: 0 6px 24px rgba(0,0,0,0.6); }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 18px; color: #FFFFFF; }
                    p { color: #cfcfcf; font-size: 15px; line-height: 1.6; margin-bottom: 14px; }
                    .otp-box { text-align: center; margin: 22px 0; overflow: hidden; }
                    .otp-code { box-sizing: border-box; display: inline-block; font-size: 28px; font-weight: 800; letter-spacing: 6px; padding: 10px 20px; border-radius: 12px; background: linear-gradient(135deg, rgba(232,67,147,0.06), rgba(255,102,102,0.02)); border: 1px solid rgba(255,255,255,0.06); color: #ff69b4; font-family: monospace; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    @media only screen and (max-width:480px) { .otp-code { font-size: 22px; letter-spacing: 4px; padding: 8px 14px; } }
                    .expiry { text-align: center; color: #ff9fa8; font-size: 12px; margin-top: 8px; }
                    .footer { text-align: center; margin-top: 24px; color: #7a7a7a; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <h1>🔐 Password Reset</h1>
                        <p>Hi ${userName || 'there'},</p>
                        <p>We received a request to reset your SHEild account password. Use the following OTP to proceed:</p>
                        <div class="otp-box">
                            <div class="otp-code">${otp}</div>
                            <div class="expiry">Expires in 10 minutes</div>
                        </div>
                        <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} SHEild. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    // SendGrid-only mode: always use SendGrid Web API. Nodemailer/SMTP is disabled to avoid Render SMTP issues.
    if (process.env.SENDGRID_API_KEY) {
        try {
            await sendViaSendGridAPI({ from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject, html: mailOptions.html });
            return;
        } catch (err) {
            console.error('[OTP] Password reset SendGrid API send failed:', err.message || err);
            throw err;
        }
    }

    throw new Error('SENDGRID_API_KEY not configured. SendGrid-only mode enabled.');
};

/**
 * Send Welcome email after successful verification
 */
const sendWelcomeEmail = async (email, firstName) => {
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
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #000000; color: #FFFFFF; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 48px 20px; }
                    .card { background: #0b0b0b; border-radius: 14px; padding: 36px; border: 1px solid rgba(255,255,255,0.04); box-shadow: 0 6px 24px rgba(0,0,0,0.6); }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 18px; color: #FFFFFF; }
                    p { color: #cfcfcf; font-size: 15px; line-height: 1.6; margin-bottom: 14px; }
                    .highlight { background: linear-gradient(135deg, rgba(232,67,147,0.04), rgba(255,102,102,0.02)); border-left: 4px solid rgba(255,105,180,0.14); border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
                    ul { color: #cfcfcf; margin: 0; padding-left: 20px; }
                    li { margin-bottom: 6px; }
                    .footer { text-align: center; margin-top: 24px; color: #7a7a7a; font-size: 12px; }
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

    // SendGrid-only mode: always use SendGrid Web API. Nodemailer/SMTP is disabled to avoid Render SMTP issues.
    if (process.env.SENDGRID_API_KEY) {
        try {
            await sendViaSendGridAPI({ from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject, html: mailOptions.html });
            return;
        } catch (err) {
            console.error('[Welcome] SendGrid API send failed:', err.message || err);
            throw err;
        }
    }

    throw new Error('SENDGRID_API_KEY not configured. SendGrid-only mode enabled.');
};

module.exports = {
    sendOTPEmail,
    sendPasswordResetOtpEmail,
    sendWelcomeEmail,
};
