const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Send OTP Email
const sendOTPEmail = async (email, otp) => {
    try {
        // Check if email service is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('Email service not configured. OTP for testing:', otp);
            return true; // Return true for development/testing
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'SHEild - Email Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0;">SHEild</h1>
                        <p style="color: #6b7280; margin: 5px 0;">Stay Safe, Stay Connected</p>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 30px; border-radius: 10px; text-align: center;">
                        <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Email Address</h2>
                        <p style="color: #4b5563; margin-bottom: 30px; line-height: 1.6;">
                            Thank you for registering with SHEild! To complete your registration, please verify your email address using the OTP below:
                        </p>
                        
                        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb; margin: 20px 0;">
                            <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 8px; margin: 0; font-family: monospace;">${otp}</h1>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">
                            This OTP will expire in 10 minutes. If you didn't request this verification, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            © 2025 SHEild. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully:', result.messageId);
        return true;

    } catch (error) {
        console.error('Error sending OTP email:', error);
        
        // For development/testing, log the OTP instead of failing
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n=== DEVELOPMENT MODE ===`);
            console.log(`OTP for ${email}: ${otp}`);
            console.log(`=======================\n`);
            return true;
        }
        
        throw new Error('Failed to send OTP email');
    }
};

// Send Welcome Email
const sendWelcomeEmail = async (email, firstName) => {
    try {
        // Check if email service is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('Email service not configured. Welcome email skipped for:', email);
            return true; // Return true for development/testing
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to SHEild!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0;">SHEild</h1>
                        <p style="color: #6b7280; margin: 5px 0;">Stay Safe, Stay Connected</p>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to SHEild, ${firstName}!</h2>
                        <p style="color: #4b5563; margin-bottom: 20px; line-height: 1.6;">
                            Your email has been successfully verified. You're now ready to start your safety journey with SHEild.
                        </p>
                        
                        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                            <h3 style="color: #1f2937; margin: 0 0 10px 0;">What's Next?</h3>
                            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                                <li>Set up your emergency contacts</li>
                                <li>Configure your safety preferences</li>
                                <li>Explore our safety features</li>
                                <li>Stay connected and stay safe!</li>
                            </ul>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">
                            If you have any questions, feel free to reach out to our support team.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            © 2025 SHEild. All rights reserved.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', result.messageId);
        return true;

    } catch (error) {
        console.error('Error sending welcome email:', error);
        
        // For development/testing, don't fail if email service is not working
        if (process.env.NODE_ENV === 'development') {
            console.log(`Welcome email failed for ${email}, but continuing in development mode`);
            return true;
        }
        
        throw new Error('Failed to send welcome email');
    }
};

module.exports = {
    sendOTPEmail,
    sendWelcomeEmail
};
