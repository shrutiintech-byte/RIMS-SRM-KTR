
const mongoose = require("mongoose");

// =====================================================
// NOTIFICATION TYPES
// =====================================================

const NOTIFICATION_TYPES = [
  // Registration notifications (NEW)
  "REGISTRATION_APPROVED",
  "REGISTRATION_REJECTED",
  // Existing claim notifications
  "CLAIM_SUBMITTED",
  "CLAIM_UPDATED",
  "CLAIM_APPROVED",
  "CLAIM_REJECTED",
  "CLAIM_RETURNED",
  "CLAIM_VALIDATION_FAILED",

  // Existing document notifications
  "DOCUMENT_UPLOADED",
  "DOCUMENT_VERIFIED",
  "DOCUMENT_REJECTED",

  // General notification
  "SYSTEM",
];

// =====================================================
// NOTIFICATION SCHEMA
// =====================================================

const notificationSchema = new mongoose.Schema(
  {
    // User who should receive this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Notification type
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },

    // Notification heading
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Notification message
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional claim related to the notification
    claim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      default: null,
      index: true,
    },

    // Whether the notification has been read
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // When the notification was read
    readAt: {
      type: Date,
      default: null,
    },

    // Optional additional information
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// DATABASE INDEXES
// =====================================================

// Fast lookup for unread notifications
notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

// Fast lookup for all notifications
notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

// =====================================================
// NOTIFICATION MODEL
// =====================================================

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

// =====================================================
// EXPORTS
// =====================================================

module.exports = Notification;

module.exports.NOTIFICATION_TYPES =
  NOTIFICATION_TYPES;