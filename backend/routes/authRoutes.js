const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { verifyToken, JWT_SECRET } = require("../middleware/authMiddleware");
const { checkLoginAttempts, recordFailedAttempt, resetAttempts } = require("../middleware/loginAttempts");

function isStrongPassword(password) {
  return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password || "");
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database is not connected. Please verify that the MONGODB_URI environment variable is configured in Render.",
      });
    }

    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long, contain at least 1 number and 1 uppercase letter" });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = new User({ name, email: normalizedEmail, password, phone, address });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: error.message || "Server error during registration" });
  }
});

// POST /api/auth/login
router.post("/login", checkLoginAttempts(req => req.ip), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database is not connected. Please verify that the MONGODB_URI environment variable is configured in Render.",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    resetAttempts(req.ip);

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: "user",
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: error.message || "Server error during login" });
  }
});


// GET /api/auth/me
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", (req, res) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return res.status(401).json({ message: "No token provided", code: "TOKEN_MISSING" });

  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token provided", code: "TOKEN_MISSING" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      const expiredSince = now - decoded.exp;
      if (expiredSince > 86400) {
        return res.status(401).json({ message: "Token too old, please login again", code: "TOKEN_TOO_OLD" });
      }
    }

    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: newToken });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token", code: "TOKEN_INVALID" });
  }
});

module.exports = router;
