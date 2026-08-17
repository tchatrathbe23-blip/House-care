const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required when NODE_ENV=production");
}

const JWT_SECRET = process.env.JWT_SECRET || "housecare_dev_secret_change_me";

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Using development-only fallback secret.");
}

function isAdminRole(role) {
  return role === "admin" || role === "super_admin";
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" ? token : null;
}

const verifyToken = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "No token provided", code: "TOKEN_MISSING" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(403).json({ message: "Invalid token", code: "TOKEN_INVALID", error: error.message });
  }
};

const verifyAdminToken = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "No token provided", code: "TOKEN_MISSING" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isAdminRole(decoded.role)) {
      return res.status(403).json({ message: "Admin access required", code: "ADMIN_REQUIRED" });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(403).json({ message: "Invalid token", code: "TOKEN_INVALID", error: error.message });
  }
};

module.exports = { verifyToken, verifyAdminToken, JWT_SECRET, isAdminRole };
