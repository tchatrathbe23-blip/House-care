const express = require("express");
const router = express.Router();
const OTP = require("../models/OTP");
const User = require("../models/User");
const { sendOTPEmail, isMailConfigured } = require("../utils/mailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/authMiddleware");

const otpRequests = new Map();

function isStrongPassword(password) {
  return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password || "");
}

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of otpRequests.entries()) {
    if (data.resetAt < now) {
      otpRequests.delete(key);
    }
  }
}, 10 * 60 * 1000);

router.post("/send", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const reqData = otpRequests.get(normalizedEmail) || { count: 0, resetAt: now + 10 * 60 * 1000 };

    if (reqData.resetAt < now) {
      reqData.count = 0;
      reqData.resetAt = now + 10 * 60 * 1000;
    }

    if (reqData.count >= 5) {
      return res.status(429).json({ message: "Too many OTP requests. Please try again later." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    reqData.count += 1;
    otpRequests.set(normalizedEmail, reqData);

    const otp = OTP.generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    await OTP.deleteMany({ email: normalizedEmail, verified: false });
    await OTP.create({
      email: normalizedEmail,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (mailError) {
      console.error("Mailer error:", mailError.message);
      return res.status(500).json({
        message: mailError.message || "Failed to send OTP to your email. Please verify SMTP settings."
      });
    }

    res.status(200).json({
      message: `A 6-digit OTP verification code has been sent to ${normalizedEmail}. Please check your inbox.`,
      expiresIn: 600
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: "Server error during OTP dispatch" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    const normalizedEmail = email.toLowerCase();
    const otpDoc = await OTP.findOne({
      email: normalizedEmail,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpDoc.attempts += 1;

    if (otpDoc.attempts > 5) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: "Too many attempts. Request a new OTP." });
    }

    const isMatch = await otpDoc.verifyOTP(otp);
    if (!isMatch) {
      await otpDoc.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpDoc.verified = true;
    await otpDoc.save();

    const resetToken = jwt.sign(
      { email: normalizedEmail, purpose: "password-reset" },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.status(200).json({ message: "OTP verified", resetToken });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long, contain at least 1 number and 1 uppercase letter",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (decoded.purpose !== "password-reset" || !decoded.email) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const email = decoded.email.toLowerCase();
    const verifiedOtp = await OTP.findOne({
      email,
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!verifiedOtp) {
      return res.status(400).json({ message: "Please verify OTP first" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    await OTP.deleteMany({ email });

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
