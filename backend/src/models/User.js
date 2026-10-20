const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // =====================================================
    // BASIC USER INFORMATION
    // =====================================================

    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    profilePhoto: {
      type: String,
      default: null,
      trim: true,
    },

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    passwordHash: {
      type: String,
      required: true,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // ROLE
    // =====================================================

    role: {
      type: String,
      enum: [
        "FACULTY",
        "HOD",
        "REVIEWER",
        "FINANCE",
        "ADMIN",
      ],
      default: "FACULTY",
    },

    // =====================================================
    // ACCOUNT STATUS
    // =====================================================

    accountStatus: {
      type: String,
      enum: [
        "PENDING",
        "ACTIVE",
        "SUSPENDED",
        "REJECTED",
      ],
      default: "PENDING",
    },

    // =====================================================
    // ACADEMIC / PROFESSIONAL INFORMATION
    // =====================================================

    department: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================================
    // DECLARATION
    // =====================================================

    declarationAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },

    // =====================================================
    // APPROVAL INFORMATION
    // =====================================================

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // REJECTION INFORMATION
    // =====================================================

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================================
    // LOGIN INFORMATION
    // =====================================================

    lastLogin: {
      type: Date,
      default: null,
    },

    // =====================================================
    // NOTIFICATION PREFERENCES
    // =====================================================

    notificationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },

      claimUpdates: {
        type: Boolean,
        default: true,
      },

      approvalUpdates: {
        type: Boolean,
        default: true,
      },

      documentUpdates: {
        type: Boolean,
        default: true,
      },

      systemNotifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;