const mongoose = require("mongoose");

const trackingSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  locations: [{
    latitude: Number,
    longitude: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    address: String,
  }],
  status: {
    type: String,
    enum: ["pending", "in_transit", "arrived", "in_progress", "completed", "cancelled"],
    default: "pending",
  },
  estimatedArrival: Date,
  actualArrival: Date,
  completionTime: Date,
  distance: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Tracking", trackingSchema);
