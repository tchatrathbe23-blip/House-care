const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: "rzp_test_ScuM7vSCSEDBxI",
  key_secret: "ZwhXHNFE4yDSXB4EZMMAMiaZ"
});

// Create order
router.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: "order_rcptid_11"
  };

  const order = await razorpay.orders.create(options);
  res.json(order);
});

// Verify payment
router.post("/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSign = crypto
    .createHmac("sha256", "YOUR_SECRET")
    .update(sign)
    .digest("hex");

  if (expectedSign === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

module.exports = router;