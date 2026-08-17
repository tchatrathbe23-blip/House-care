const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const { verifyToken, verifyAdminToken } = require("../middleware/authMiddleware");
const Tracking = require("../models/Tracking");
const Notification = require("../models/Notification");

/* =========================================
   CREATE BOOKING
   ========================================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const newBooking = new Booking({
      ...req.body,
      userId: req.user.id,
      bookingId: "HC" + Date.now(),
    });

    await newBooking.save();

    await Notification.create({
      userId: req.user.id,
      type: "booking",
      title: "Booking Created",
      message: `Your booking ${newBooking.bookingId} has been created.`,
    });

    return res.status(201).json(newBooking);
  } catch (err) {
    console.error("Booking creation error:", err.message);
    return res.status(500).json({
      error: "Failed to create booking",
      message: err.message,
    });
  }
});
/* =========================================
   GET BOOKINGS
========================================= */
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const { status, service, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (service) filter.service = service;

    const data = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   UPDATE
========================================= */
router.put("/:id", verifyAdminToken, async (req, res) => {
const updated = await Booking.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
);
await Notification.create({
    userId: updated.userId,
    type: "booking",
    title: "Booking Updated",
    message: `Booking status changed to ${updated.status}`,
});
 const io = req.app.get("io");

    io.emit("booking-status-change", {
        bookingId: updated.bookingId,
        status: updated.status,
        userId: updated.userId
    });

if (updated.status === "In Progress") {

    await Tracking.findOneAndUpdate(
        { bookingId: updated._id },
        { $set: { status: "in_transit" } }
    );

}
  res.json(updated);
});

/* =========================================
   TOGGLE TASK STATUS (Positional Operator $)
========================================= */
router.put("/:id/tasks/:taskIndex", verifyAdminToken, async (req, res) => {
  const { id, taskIndex } = req.params;
  const { completed } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  // Using the index to update the specific task
  booking.tasks[taskIndex].completed = completed;
  await booking.save();

  res.json(booking);
});

/* =========================================
   UPDATE PRICE ($set)
========================================= */
router.put("/:id/price", verifyAdminToken, async (req, res) => {
  const updated = await Booking.findByIdAndUpdate(
    req.params.id,
    { price: req.body.price },
    { new: true }
  );
  res.json(updated);
});

/* =========================================
   BULK STATUS UPDATE (updateMany)
========================================= */
router.post("/bulk-status", verifyAdminToken, async (req, res) => {
  const { fromStatus, toStatus } = req.body;
  const result = await Booking.updateMany(
    { status: fromStatus },
    { $set: { status: toStatus } }
  );
  res.json({ message: `Updated ${result.modifiedCount} bookings`, count: result.modifiedCount });
});

/* =========================================
   DELETE (optional keep)
========================================= */
router.delete("/:id", verifyAdminToken, async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* =========================================
   TRACK (ID OR PHONE)
========================================= */
router.get("/track/:input", async (req, res) => {
  const input = req.params.input;

  const data = await Booking.find({
    $or: [
      { bookingId: input },
      { phone: input }
    ]
  });

  res.json(data);
});

module.exports = router;
