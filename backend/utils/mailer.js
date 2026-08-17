const nodemailer = require('nodemailer');

const getTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

const isMailConfigured = () => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER);
};

const sendOTPEmail = async (email, otp) => {
  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn('SMTP is not configured. Logging OTP instead.');
    console.log(`[DEVELOPMENT] OTP for ${email} is: ${otp}`);
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'HouseCare <noreply@housecare.com>',
    to: email,
    subject: 'Your HouseCare Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2b6cb0;">HouseCare Password Reset</h2>
        <p>You requested a password reset. Here is your One-Time Password (OTP):</p>
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #1a202c; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #718096; font-size: 14px;">This OTP will expire in 10 minutes. Do not share this with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">&copy; ${new Date().getFullYear()} HouseCare Services</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, isMailConfigured };
