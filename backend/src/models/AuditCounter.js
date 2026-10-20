
const mongoose = require("mongoose");

const auditCounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "auditLogSequence",
    },
    sequence: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model(
  "AuditCounter",
  auditCounterSchema
);
