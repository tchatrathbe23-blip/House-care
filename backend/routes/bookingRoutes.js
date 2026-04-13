const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

/* =========================================
   CREATE BOOKING
========================================= */
router.post("/", async (req, res) => {
  try {
    const newBooking = new Booking({
      ...req.body,
      bookingId: "HC" + Date.now()
    });

    await newBooking.save();
    res.json(newBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   GET BOOKINGS
========================================= */
router.get("/", async (req, res) => {
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
router.put("/:id", async (req, res) => {
  const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

/* =========================================
   DELETE (optional keep)
========================================= */
router.delete("/:id", async (req, res) => {
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