const mongoose = require("mongoose");

// =========================================================
// CLAIM TYPES
// =========================================================

const CLAIM_TYPES = [
  "RESEARCH_PROJECT",
  "PATENT",
  "JOURNAL_PUBLICATION",
  "RESEARCH_AWARD",
  "UNDERGRADUATE_RESEARCH",
  "POSTGRADUATE_RESEARCH",
  "BOOK_CHAPTER",
  "CONFERENCE_PROCEEDINGS",
  "PHD_SUPERVISION",
  "E_CONTENT",
  "PROFESSIONAL_DEVELOPMENT",
];

// =========================================================
// CLAIM STATUSES
// =========================================================

const CLAIM_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RETURNED",
];

// =========================================================
// FINANCIAL YEARS
// =========================================================

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

// =========================================================
// CLAIM SCHEMA
// =========================================================

const claimSchema = new mongoose.Schema(
  {
    // =====================================================
    // FACULTY
    // =====================================================

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =====================================================
    // CLAIM TYPE
    // =====================================================

    claimType: {
      type: String,
      enum: CLAIM_TYPES,
      required: true,
      index: true,
      trim: true,
    },

    // =====================================================
    // CLAIM STATUS
    // =====================================================

    status: {
      type: String,
      enum: CLAIM_STATUSES,
      required: true,
      default: "DRAFT",
      index: true,
    },

    // =====================================================
    // FINANCIAL YEAR
    // =====================================================

    financialYear: {
      type: String,
      enum: FINANCIAL_YEARS,
      required: true,
      index: true,
      trim: true,
    },

    // =====================================================
    // CATEGORY-SPECIFIC FORM DATA
    // =====================================================

    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },

    // =====================================================
    // SUPPORTING DOCUMENTS
    // =====================================================

    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],

    // =====================================================
    // INCENTIVE AMOUNT
    // =====================================================

    incentiveAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // =====================================================
    // FACULTY DECLARATION
    // =====================================================

    declarationAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },

    // =====================================================
    // DRAFT INFORMATION
    // =====================================================

    draftSavedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // SUBMISSION INFORMATION
    // =====================================================

    submittedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // REVIEW INFORMATION
    // =====================================================

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewComment: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================================
    // APPROVAL INFORMATION
    // =====================================================

    approvedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // REJECTION INFORMATION
    // =====================================================

    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================================
// INDEXES
// =========================================================

claimSchema.index({
  faculty: 1,
  status: 1,
});

claimSchema.index({
  faculty: 1,
  financialYear: 1,
});

claimSchema.index({
  faculty: 1,
  claimType: 1,
});

// =========================================================
// MODEL
// =========================================================

const Claim = mongoose.model(
  "Claim",
  claimSchema
);

// =========================================================
// EXPORTS
// =========================================================

module.exports = Claim;

module.exports.CLAIM_TYPES = CLAIM_TYPES;
module.exports.CLAIM_STATUSES = CLAIM_STATUSES;
module.exports.FINANCIAL_YEARS = FINANCIAL_YEARS;