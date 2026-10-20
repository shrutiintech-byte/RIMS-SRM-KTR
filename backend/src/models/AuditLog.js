
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    targetType: {
      type: String,
      required: true,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    previousHash: {
      type: String,
      required: true,
    },

    currentHash: {
      type: String,
      required: true,
      unique: true,
    },

    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

auditLogSchema.index({ timestamp: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
