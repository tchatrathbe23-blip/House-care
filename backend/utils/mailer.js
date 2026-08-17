const nodemailer = require('nodemailer');

const getTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const isGmail = host.toLowerCase().includes('gmail');
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = port === 465;

    if (isGmail && !process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\s+/g, '')
        },
        connectionTimeout: 7000,
        greetingTimeout: 7000,
        socketTimeout: 7000,
      });
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS.replace(/\s+/g, '')
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 7000,
    });
  }
  return null;
};

const isMailConfigured = () => {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
};

const sendOTPEmail = async (email, otp) => {
  console.log(`[PASSWORD RESET OTP] Generated OTP for ${email}: ${otp}`);

  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn(`[SMTP Warning] SMTP credentials (SMTP_USER/SMTP_PASS) not configured in environment. Logged OTP: ${otp}`);
    return { success: false, simulated: true, otp };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `HouseCare <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your HouseCare Password Reset OTP: ${otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0f8cff; margin: 0; font-size: 26px; font-weight: 800;">House<span style="color: #152033;">Care</span></h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Trusted Home Services</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; text-align: center;">
          <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 10px 0;">Password Reset Verification</h2>
          <p style="color: #475569; font-size: 14px; margin: 0 0 18px 0;">You requested to reset your password. Use the verification code below to proceed:</p>
          
          <div style="display: inline-block; background: #0f8cff; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 12px 28px; border-radius: 10px; margin: 8px 0;">
            ${otp}
          </div>
          
          <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin-top: 16px;">⏱️ This code will expire in 10 minutes.</p>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px; text-align: center;">
          If you did not request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} HouseCare Services. All Rights Reserved.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Successfully dispatched OTP email to ${email}`);
    return { success: true, simulated: false, otp };
  } catch (err) {
    console.error(`[SMTP Warning] Failed to send email via SMTP (${err.message}). OTP for ${email} is: ${otp}`);
    return { success: false, simulated: true, error: err.message, otp };
  }
};

module.exports = { sendOTPEmail, isMailConfigured };


