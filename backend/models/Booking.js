const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true
  },
  name: String,
  phone: String,
  service: String,
  category: String,
  date: String,
  time: String,
  address: String,
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed"],
    default: "Pending"
  },
  paymentStatus: {
    type: String,
    default: "Not Paid"
  },
  price: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 🔥 Indexing (important)
bookingSchema.index({ phone: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);