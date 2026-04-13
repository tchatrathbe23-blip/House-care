const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

/* =========================================
   1. BOOKINGS PER SERVICE
========================================= */
router.get("/services", async (req, res) => {
  const data = await Booking.aggregate([
    { $group: { _id: "$service", count: { $sum: 1 } } }
  ]);
  res.json(data);
});

/* =========================================
   2. STATUS DISTRIBUTION
========================================= */
router.get("/status", async (req, res) => {
  const data = await Booking.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  res.json(data);
});

/* =========================================
   3. TOTAL REVENUE
========================================= */
router.get("/revenue", async (req, res) => {
  const data = await Booking.aggregate([
    { $match: { paymentStatus: "Paid" } },
    {
      $group: {
        _id: null,
        total: { $sum: "$price" }
      }
    }
  ]);

  res.json(data[0] || { total: 0 });
});

/* =========================================
   4. CATEGORY PERFORMANCE
========================================= */
router.get("/category", async (req, res) => {
  const data = await Booking.aggregate([
    {
      $group: {
        _id: "$category",
        bookings: { $sum: 1 },
        revenue: { $sum: "$price" }
      }
    }
  ]);
  res.json(data);
});

/* =========================================
   5. DAILY BOOKINGS TREND (BONUS ⭐)
========================================= */
router.get("/daily", async (req, res) => {
  const data = await Booking.aggregate([
    {
      $group: {
        _id: { $substr: ["$createdAt", 0, 10] },
        count: { $sum: 1 }
      }
    }
  ]);
  res.json(data);
});

module.exports = router;