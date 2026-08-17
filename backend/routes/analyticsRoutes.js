const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const { verifyAdminToken } = require("../middleware/authMiddleware");


router.get("/services", verifyAdminToken, async (req, res) => {
  const data = await Booking.aggregate([
    { $group: { _id: "$service", count: { $sum: 1 } } }
  ]);
  res.json(data);
});


router.get("/status", verifyAdminToken, async (req, res) => {
  const data = await Booking.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  res.json(data);
});


router.get("/revenue", verifyAdminToken, async (req, res) => {
  const data = await Booking.aggregate([
    { $match: { paymentStatus: "Paid" } },
    {
      $group: {
        _id: null,
        total: { $sum: "$price" }
      }
    }
  ]);

  res.json({ total: data[0]?.total || 0 });
});


router.get("/category", verifyAdminToken, async (req, res) => {
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


router.get("/daily", verifyAdminToken, async (req, res) => {
  const data = await Booking.aggregate([
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  res.json(data);
});

module.exports = router;
