const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true
  },
    userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
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
  },
  specialRequirements: {
    type: [String],
    default: []
  },
  tasks: [{
    title: String,
    completed: { type: Boolean, default: false },
    priority: { type: Number, default: 1 }
  }]
});

// 🔥 Indexing (important)
bookingSchema.index({ phone: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ "tasks.title": 1 }); // Multikey Index for array filtering
bookingSchema.index({ "tasks.completed": 1 });

module.exports = mongoose.model("Booking", bookingSchema);