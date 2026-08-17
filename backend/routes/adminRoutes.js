const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { verifyAdminToken, JWT_SECRET, isAdminRole } = require("../middleware/authMiddleware");
const { checkLoginAttempts, recordFailedAttempt, resetAttempts } = require("../middleware/loginAttempts");

const router = express.Router();

function isDemoAdminEnabled() {
  if (process.env.DEMO_ADMIN_ENABLED) {
    return process.env.DEMO_ADMIN_ENABLED === "true";
  }

  return process.env.NODE_ENV !== "production";
}

async function ensureDemoAdminForLogin(username, email, password) {
  if (!isDemoAdminEnabled()) {
    return null;
  }
  const demoUsername = process.env.DEMO_ADMIN_USERNAME || "admin";
  const demoEmail = process.env.DEMO_ADMIN_EMAIL || "admin@housecare.com";
  const demoPassword = process.env.DEMO_ADMIN_PASSWORD || "password123";

  const wantsDemoUser =
    password === demoPassword &&
    (username === demoUsername || email === demoEmail);

  if (!wantsDemoUser) {
    return null;
  }

  let admin = await Admin.findOne({
    $or: [{ username: demoUsername }, { email: demoEmail }],
  });

  if (admin) {
    return admin;
  }

  admin = new Admin({
    username: demoUsername,
    email: demoEmail,
    password: demoPassword,
    role: "super_admin",
    permissions: [
      "view_bookings",
      "manage_bookings",
      "view_analytics",
      "manage_users",
      "manage_payments",
    ],
  });

  await admin.save();
  return admin;
}

// Admin Login
router.post("/login", checkLoginAttempts(req => req.body.username || req.body.email || req.ip), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginKey = req.body.username || req.body.email || req.ip;

    if ((!username && !email) || !password) {
      return res.status(400).json({ message: "Username/Email and password required" });
    }

    // Find admin by username or email
    let admin = await Admin.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (!admin) {
      admin = await ensureDemoAdminForLogin(username, email, password);
    }

    if (!admin) {
      recordFailedAttempt(loginKey);
      return res.status(401).json({
        ok: false,
        authState: "invalid_credentials",
        message: "Invalid credentials",
      });
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      recordFailedAttempt(loginKey);
      return res.status(401).json({
        ok: false,
        authState: "invalid_credentials",
        message: "Invalid credentials",
      });
    }

    resetAttempts(loginKey);

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      ok: true,
      message: "Admin login successful",
      token,
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

// Get Admin Profile (Protected Route)
router.get("/me", verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin", error: error.message });
  }
});

// Create New Admin (Super Admin only)
router.post("/create", verifyAdminToken, async (req, res) => {
  try {
    // Check if requester is super_admin
    const currentAdmin = await Admin.findById(req.admin.id);
    if (!currentAdmin || !isAdminRole(currentAdmin.role) || currentAdmin.role !== "super_admin") {
      return res.status(403).json({ message: "Only super admin can create new admins" });
    }

    const { username, email, password, role, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Create new admin
    const admin = new Admin({
      username,
      email,
      password,
      role: role || "admin",
      permissions: permissions || [],
    });

    await admin.save();

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating admin", error: error.message });
  }
});

module.exports = router;
