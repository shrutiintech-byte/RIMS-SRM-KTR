
const mongoose = require("mongoose");

const DOCUMENT_STATUSES = [
  "UPLOADED",
  "VERIFIED",
  "REJECTED",
];

const documentSchema = new mongoose.Schema(
  {
    /*
     * Faculty who uploaded the document.
     */
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /*
     * Claim to which this document belongs.
     */
    claim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      required: true,
      index: true,
    },

    /*
     * Document field identifier used by the frontend.
     *
     * Examples:
     * sanctionLetter
     * grantCreditEvidence
     * utilizationCertificate
     */
    documentType: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Original filename uploaded by the faculty.
     */
    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Actual filename stored on the server.
     */
    storedName: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * Relative path of the stored file.
     */
    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * MIME type of the uploaded file.
     */
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * File size in bytes.
     */
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * Current document review status.
     */
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      default: "UPLOADED",
      required: true,
      index: true,
    },

    /*
     * Review comment from the Admin.
     * Used to explain verification or rejection.
     */
    reviewComment: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * Verification information.
     */
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    /*
     * Rejection information.
     */
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    /*
     * If this document replaces an earlier document,
     * this field points to the original document.
     */
    replacesDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
      index: true,
    },

    /*
     * If this document has been replaced,
     * this field points to its replacement.
     */
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Retrieve documents belonging to a particular claim.
 */
documentSchema.index({
  claim: 1,
  documentType: 1,
});

/*
 * Retrieve a faculty member's documents by upload date.
 */
documentSchema.index({
  faculty: 1,
  createdAt: -1,
});

/*
 * Retrieve documents by claim and review status.
 */
documentSchema.index({
  claim: 1,
  status: 1,
});

const Document = mongoose.model(
  "Document",
  documentSchema
);

module.exports = Document;
module.exports.DOCUMENT_STATUSES =
  DOCUMENT_STATUSES;
