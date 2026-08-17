const express = require("express");
const Notification = require("../models/Notification");
const { verifyToken, verifyAdminToken } = require("../middleware/authMiddleware");

const router = express.Router();

function notFoundOrForbidden(res) {
  return res.status(404).json({ message: "Notification not found" });
}

// Get unread notification count
router.get("/user/unread-count", verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
    userId: req.user.id,
    isRead: false
});
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread count", error: error.message });
  }
});

// Mark all user notifications as read
router.put("/mark-all-read", verifyToken, async (req, res) => {
  try {
    const result = await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Error updating notifications", error: error.message });
  }
});

// Mark all admin notifications as read
router.put("/admin/mark-all-read", verifyAdminToken, async (req, res) => {
  try {
    const result = await Notification.updateMany({ adminId: req.admin.id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Error updating notifications", error: error.message });
  }
});

// Get user notifications
router.get("/user", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching notifications",
      error: error.message
    });
  }
});

// Get admin notifications
router.get("/admin", verifyAdminToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      adminId: req.admin.id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error: error.message });
  }
});

// Mark user notification as read
router.put("/:id/read", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return notFoundOrForbidden(res);
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification", error: error.message });
  }
});

// Mark admin notification as read
router.put("/admin/:id/read", verifyAdminToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, adminId: req.admin.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return notFoundOrForbidden(res);
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification", error: error.message });
  }
});

// Create notification (for admin/system use)
router.post("/create", verifyAdminToken, async (req, res) => {
  try {
    const { userId, adminId, type, title, message, data } = req.body;

    const notification = new Notification({
      userId,
      adminId,
      type,
      title,
      message,
      data,
    });

    await notification.save();
    res.status(201).json({ message: "Notification created", notification });
  } catch (error) {
    res.status(500).json({ message: "Error creating notification", error: error.message });
  }
});

// Delete user notification
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return notFoundOrForbidden(res);
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification", error: error.message });
  }
});

// Delete admin notification
router.delete("/admin/:id", verifyAdminToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      adminId: req.admin.id,
    });

    if (!notification) {
      return notFoundOrForbidden(res);
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification", error: error.message });
  }
});

module.exports = router;