const nodemailer = require('nodemailer');

const getTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const host = (process.env.SMTP_HOST || '').toLowerCase();
    const user = (process.env.SMTP_USER || '').toLowerCase();
    const isGmail = host.includes('gmail') || user.includes('gmail');
    const cleanPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

    if (isGmail) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: cleanPass
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });
    }

    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: cleanPass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
  }
  return null;
};

const isMailConfigured = () => {
  return !!((process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
};

const sendOTPEmail = async (email, otp) => {
  console.log(`========================================`);
  console.log(`[PASSWORD RESET OTP] Target Email: ${email}`);
  console.log(`[PASSWORD RESET OTP] Generated OTP Code: >>> ${otp} <<<`);
  console.log(`========================================`);

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0f8cff; margin: 0; font-size: 26px; font-weight: 800;">House<span style="color: #152033;">Care</span></h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Trusted Home Services</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; text-align: center;">
        <h2 style="color: #0f172a; font-size: 18px; margin: 0 0 10px 0;">Password Reset Verification</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 18px 0;">You requested to reset your HouseCare password. Use the verification code below:</p>
        
        <div style="display: inline-block; background: #0f8cff; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 12px 28px; border-radius: 10px; margin: 8px 0;">
          ${otp}
        </div>
        
        <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin-top: 16px;">⏱️ This code will expire in 10 minutes.</p>
      </div>
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px; text-align: center;">
        If you did not request this verification code, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} HouseCare Services. All Rights Reserved.</p>
    </div>
  `;

  // 1. Check if Resend API is configured (HTTPS REST API - Works 100% on cloud platforms like Render)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.SMTP_FROM || 'HouseCare <onboarding@resend.dev>',
          to: [email],
          subject: `Your HouseCare Password Reset OTP: ${otp}`,
          html: htmlContent
        })
      });

      if (res.ok) {
        console.log(`[Resend API] Successfully sent OTP email to ${email}`);
        return { success: true, simulated: false, otp };
      } else {
        const errorDetails = await res.text();
        console.error(`[Resend API Error]`, errorDetails);
      }
    } catch (apiErr) {
      console.error(`[Resend API Request Failed]`, apiErr.message);
    }
  }

  // 2. SMTP Transporter
  const transporter = getTransporter();
  
  if (!transporter) {
    console.warn(`[SMTP Notice] No SMTP credentials (SMTP_USER / SMTP_PASS) set in environment. View OTP above in server logs: ${otp}`);
    return { success: false, simulated: true, otp };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `HouseCare <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your HouseCare Password Reset OTP: ${otp}`,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Successfully dispatched OTP email to ${email}`);
    return { success: true, simulated: false, otp };
  } catch (err) {
    console.error(`[SMTP Warning] Failed to send email via SMTP (${err.message}).`);
    console.error(`[SMTP Warning] Check if Gmail App Password is configured properly or if cloud host blocks SMTP ports.`);
    console.error(`[SMTP Fallback] OTP for ${email} is: ${otp}`);
    return { success: false, simulated: true, error: err.message, otp };
  }
};

module.exports = { sendOTPEmail, isMailConfigured };



