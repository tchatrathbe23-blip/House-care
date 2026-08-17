const express = require("express");
const mongoose = require("mongoose");
const Tracking = require("../models/Tracking");
const Booking = require("../models/Booking");
const { verifyToken, verifyAdminToken } = require("../middleware/authMiddleware");
const buildTrackingPayload = require("../utils/buildTrackingPayload");

const router = express.Router();

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateTotalDistance(locations) {
  let total = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i-1];
    const curr = locations[i];
    if (prev.latitude != null && prev.longitude != null && curr.latitude != null && curr.longitude != null) {
      total += haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
  }
  return Math.round(total * 100) / 100; // round to 2 decimal places
}

function estimateETA(locations, destinationLat, destinationLon) {
  if (!locations || locations.length < 2) return null;
  // Calculate average speed from last 5 location points
  const recent = locations.slice(-5);
  let totalDist = 0;
  let totalTime = 0;
  for (let i = 1; i < recent.length; i++) {
    totalDist += haversineDistance(recent[i-1].latitude, recent[i-1].longitude, recent[i].latitude, recent[i].longitude);
    totalTime += (new Date(recent[i].timestamp) - new Date(recent[i-1].timestamp)) / 3600000; // hours
  }
  if (totalTime === 0) return null;
  const avgSpeed = totalDist / totalTime; // km/h
  if (avgSpeed < 0.5) return null; // too slow, probably stationary
  
  const last = recent[recent.length - 1];
  if (destinationLat && destinationLon) {
    const remainingDist = haversineDistance(last.latitude, last.longitude, destinationLat, destinationLon);
    const etaHours = remainingDist / avgSpeed;
    return {
      estimatedMinutes: Math.round(etaHours * 60),
      estimatedArrival: new Date(Date.now() + etaHours * 3600000),
      remainingDistance: Math.round(remainingDist * 100) / 100,
      avgSpeed: Math.round(avgSpeed * 10) / 10
    };
  }
  return { avgSpeed: Math.round(avgSpeed * 10) / 10 };
}

async function resolveBookingRef(value) {
  if (mongoose.isValidObjectId(value)) {
    return value;
  }

  const booking = await Booking.findOne({ bookingId: value });
  return booking ? booking._id : null;
}

async function findBooking(value) {
  if (mongoose.isValidObjectId(value)) {
    return Booking.findById(value);
  }

  return Booking.findOne({ bookingId: value });
}

async function emitTrackingUpdate(req, tracking, location) {
  const io = req.app.get("io");
  if (!io) return;

  await tracking.populate([
    { path: "bookingId" },
    { path: "providerId", select: "name phone" },
  ]);

  const payload = buildTrackingPayload(tracking, location);

  io.to(`tracking:${payload.trackingId}`).emit("tracking:update", payload);
  io.to("admins").emit("tracking:update", payload);
  io.emit("location-updated", payload);
}

// Start tracking for a booking
router.post("/start/:bookingId", async (req, res) => {
  try {
    const { providerId } = req.body;

    const bookingRef = await resolveBookingRef(req.params.bookingId);
    if (!bookingRef) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if tracking already exists
    let tracking = await Tracking.findOne({ bookingId: bookingRef });

    if (tracking) {
      return res.status(400).json({ message: "Tracking already exists for this booking" });
    }

    // Create new tracking
    tracking = new Tracking({
      bookingId: bookingRef,
      providerId,
      status: "pending",
    });

    await tracking.save();
    res.status(201).json({ message: "Tracking started", tracking });
  } catch (error) {
    res.status(500).json({ message: "Error starting tracking", error: error.message });
  }
});

// Update provider location (real-time tracking)
router.post("/update-location/:trackingId", async (req, res) => {
  try {
    const { latitude, longitude, address, status } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    const tracking = await Tracking.findById(req.params.trackingId);

    if (!tracking) {
      return res.status(404).json({ message: "Tracking not found" });
    }

    // Add new location
    tracking.locations.push({
      latitude,
      longitude,
      address: address || "Unknown",
      timestamp: new Date(),
    });

    // Update status if provided
    if (status) {
      tracking.status = status;
      if (status === "arrived") {
        tracking.actualArrival = new Date();
      } else if (status === "completed") {
        tracking.completionTime = new Date();
      }
    }

    tracking.distance = calculateTotalDistance(tracking.locations);
    tracking.updatedAt = new Date();
    await tracking.save();
    const Notification = require("../models/Notification");

const booking = await Booking.findById(tracking.bookingId);

await Notification.create({
    userId: booking.userId,
    type: "tracking",
    title: "Provider Location Updated",
    message: "Your provider location has been updated.",
});
    await emitTrackingUpdate(req, tracking, tracking.locations[tracking.locations.length - 1]);

    res.json({ message: "Location updated", tracking });
  } catch (error) {
    res.status(500).json({ message: "Error updating location", error: error.message });
  }
});

// Get tracking by booking ID or booking identifier (must come BEFORE /:trackingId)
router.get("/booking/:bookingId", async (req, res) => {
  try {
    const booking = await findBooking(req.params.bookingId);
    if (!booking) {
      return res.json({
        _id: null,
        trackingState: "booking_not_found",
        message: "No booking was found for this booking ID",
        bookingId: {
          bookingId: req.params.bookingId,
          service: null,
          status: null,
        },
        providerId: null,
        locations: [],
        distance: 0,
        status: "pending",
      });
    }

    const tracking = await Tracking.findOne({ bookingId: booking._id })
      .populate("bookingId")
      .populate("providerId", "name phone");

    if (!tracking) {
      return res.json({
        _id: null,
        trackingState: "not_started",
        message: "Tracking has not started for this booking yet",
        bookingId: booking,
        providerId: null,
        locations: [],
        distance: 0,
        status: booking.status === "Completed" ? "completed" : "pending",
      });
    }

    res.json(tracking);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tracking", error: error.message });
  }
});

// Get ETA for tracking
router.get("/:trackingId/eta", async (req, res) => {
  try {
    const tracking = await Tracking.findById(req.params.trackingId).populate("bookingId");
    if (!tracking) {
      return res.status(404).json({ message: "Tracking not found" });
    }

    const totalDistance = calculateTotalDistance(tracking.locations);
    const eta = estimateETA(tracking.locations, null, null);

    res.json({
      trackingId: tracking._id,
      totalDistance,
      locationCount: tracking.locations.length,
      avgSpeed: eta ? eta.avgSpeed : 0,
      eta
    });
  } catch (error) {
    res.status(500).json({ message: "Error calculating ETA", error: error.message });
  }
});

// Get tracking details
router.get("/:trackingId", async (req, res) => {
  try {
    const tracking = await Tracking.findById(req.params.trackingId)
      .populate("bookingId")
      .populate("providerId", "name phone");

    if (!tracking) {
      return res.status(404).json({ message: "Tracking not found" });
    }

    res.json(tracking);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tracking", error: error.message });
  }
});

// Get all active trackings (for admin)
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const trackings = await Tracking.find({ 
      status: { $in: ["pending", "in_transit", "in_progress"] } 
    })
      .populate("bookingId")
      .populate("providerId", "name phone");

    res.json(trackings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trackings", error: error.message });
  }
});

module.exports = router;
