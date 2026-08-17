const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

const KEY_ID = "rzp_test_TIZpZaZpnNlXP2";
const KEY_SECRET = "QnPQnCKgNYI8PaTU03OJc066";

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

/* ============================
   CREATE ORDER
============================ */
router.post("/create-order", async (req, res) => {
  try {
    console.log("========== CREATE ORDER ==========");
    console.log("Request Body:", req.body);

    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    const options = {
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    console.log("Creating Razorpay Order:", options);

    const order = await razorpay.orders.create(options);

    console.log("Order Created:");
    console.log(order);

    return res.json(order);

  } catch (err) {
    console.log("========== PAYMENT ERROR ==========");
    console.dir(err, { depth: null });

    return res.status(500).json({
      success: false,
      message: err.error?.description || err.message,
      error: err.error || err,
    });
  }
});

/* ============================
   VERIFY PAYMENT
============================ */
router.post("/verify", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      return res.json({
        success: true,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;