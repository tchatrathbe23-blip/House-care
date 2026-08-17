const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const Admin = require("./models/Admin");
const Notification = require("./models/Notification");
const Tracking = require("./models/Tracking");
const buildTrackingPayload = require("./utils/buildTrackingPayload");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.set("io", io);

function isDemoAdminEnabled() {
  if (process.env.DEMO_ADMIN_ENABLED) {
    return process.env.DEMO_ADMIN_ENABLED === "true";
  }

  return process.env.NODE_ENV !== "production";
}

async function ensureDemoAdmin() {
  if (!isDemoAdminEnabled()) {
    return;
  }

  const username = process.env.DEMO_ADMIN_USERNAME || "admin";
  const email = process.env.DEMO_ADMIN_EMAIL || "admin@housecare.com";
  const password = process.env.DEMO_ADMIN_PASSWORD || "password123";

  const existingAdmin = await Admin.findOne({
    $or: [{ username }, { email }],
  });

  if (existingAdmin) {
    return;
  }

  const demoAdmin = new Admin({
    username,
    email,
    password,
    role: "super_admin",
    permissions: [
      "view_bookings",
      "manage_bookings",
      "view_analytics",
      "manage_users",
      "manage_payments",
    ],
  });

  await demoAdmin.save();
  console.log(`DEV ONLY demo admin created: ${username} / ${password}`);
}

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/housecare";
mongoose.connect(mongoUri)
  .then(async () => {
    console.log("MongoDB Connected");
    await ensureDemoAdmin();
  })
  .catch(err => console.log("MongoDB Connection Error:", err));

app.get(["/health", "/api/health"], (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/otp", require("./routes/otpRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/tracking", require("./routes/trackingRoutes"));

const frontendRoot = path.resolve(__dirname, "..");
app.use(express.static(frontendRoot));

const connectedUsers = {};

function emitTrackingUpdate(payload) {
  io.to(`tracking:${payload.trackingId}`).emit("tracking:update", payload);
  io.to("admins").emit("tracking:update", payload);
  io.emit("location-updated", payload);
}

async function createAndEmitNotification({ userId, adminId, type, title, message, data }) {
  if (!userId && !adminId) return null;

  const notification = await Notification.create({
    userId: userId || undefined,
    adminId: adminId || undefined,
    type: type || "general",
    title,
    message,
    data: data || {},
  });

  const payload = notification.toObject();

  if (userId && connectedUsers[userId]) {
    io.to(connectedUsers[userId]).emit("notification:new", payload);
  }

  if (adminId) {
    io.to("admins").emit("notification:new", payload);
  }

  return payload;
}

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("user-join", (userId) => {
    if (!userId) return;
    connectedUsers[userId] = socket.id;
    console.log("User joined:", userId, socket.id);
  });

  socket.on("admin-join", (adminId) => {
    socket.join("admins");
    console.log("Admin joined:", adminId || socket.id);
  });

  socket.on("subscribe-tracking", (trackingId) => {
    if (!trackingId) return;
    socket.join(`tracking:${trackingId}`);
  });

  socket.on("unsubscribe-tracking", (trackingId) => {
    if (!trackingId) return;
    socket.leave(`tracking:${trackingId}`);
  });

  socket.on("location-update", async (data) => {
    const { trackingId, latitude, longitude, address, status, userId } = data;
    console.log("Location update received:", trackingId, latitude, longitude);

    if (!trackingId || !latitude || !longitude) {
      return;
    }

    try {
      const tracking = await Tracking.findById(trackingId);
      if (!tracking) return;

      tracking.locations.push({
        latitude,
        longitude,
        address: address || "Unknown",
        timestamp: new Date(),
      });

      if (status) {
        tracking.status = status;
        if (status === "arrived") {
          tracking.actualArrival = new Date();
        } else if (status === "completed") {
          tracking.completionTime = new Date();
        }
      }

      tracking.updatedAt = new Date();
      await tracking.save();

      await tracking.populate([
        { path: "bookingId" },
        { path: "providerId", select: "name phone" },
      ]);

      const payload = buildTrackingPayload(
        tracking,
        tracking.locations[tracking.locations.length - 1]
      );

      emitTrackingUpdate(payload);

      if (userId) {
        await createAndEmitNotification({
          userId,
          type: "tracking",
          title: "Provider location updated",
          message: status === "arrived" ? "Your provider has arrived." : "Your provider is on the way.",
          data: payload,
        });
      }
    } catch (err) {
      console.error("Failed to persist tracking update:", err.message);
    }
  });

  socket.on("send-notification", async (data) => {
    const { userId, message, title, type } = data;

    try {
      const saved = await createAndEmitNotification({
        userId,
        type: type || "general",
        title: title || "HouseCare update",
        message: message || "You have a new update.",
        data,
      });

      if (!saved && userId && connectedUsers[userId]) {
        io.to(connectedUsers[userId]).emit("notification", {
          title,
          message,
          timestamp: new Date(),
        });
      }

      io.emit("broadcast-notification", {
        title,
        message,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("Failed to save notification:", err.message);
    }
  });

  socket.on("booking-status-change", async (data) => {
    const { bookingId, status, userId } = data;
    console.log("Booking status changed:", bookingId, status);

    if (connectedUsers[userId]) {
      io.to(connectedUsers[userId]).emit("booking-updated", {
        bookingId,
        status,
        timestamp: new Date(),
      });
    }

    try {
      if (userId) {
        await createAndEmitNotification({
          userId,
          type: "booking",
          title: "Booking status updated",
          message: `Your booking ${bookingId} is now ${status}.`,
          data,
        });
      }
    } catch (err) {
      console.error("Failed to save booking notification:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId];
        break;
      }
    }
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendRoot, "index.html"));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("WebSocket server ready for real-time updates");
});

