const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
mongoose.connect("mongodb://127.0.0.1:27017/housecare")
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
mongoose.connect("mongodb://127.0.0.1:27017/housecare")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.listen(5000, () => console.log("Server running on port 5000"));