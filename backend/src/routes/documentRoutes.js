
const express = require("express");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  removeDocument,
} = require("../controllers/documentController");

const {
  uploadClaimDocument,
} = require("../middleware/uploadMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Faculty claim document management
 */

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a document to a draft claim
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - claimId
 *               - documentType
 *               - document
 *             properties:
 *               claimId:
 *                 type: string
 *                 example: 6acbc0316aee8331d7c8fec7
 *               documentType:
 *                 type: string
 *                 example: PATENT_CERTIFICATE
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: Invalid claim or document
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *
 *   get:
 *     summary: Get documents belonging to the logged-in faculty member
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: claimId
 *         schema:
 *           type: string
 *         description: Filter documents by claim ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: UPLOADED
 *         description: Filter documents by status
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *       400:
 *         description: Invalid claim ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 */

/**
 * @swagger
 * /api/documents/{documentId}/file:
 *   get:
 *     summary: View or download a document file
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document file returned successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *       404:
 *         description: Document or file not found
 */

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Get details of a specific document
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *       400:
 *         description: Invalid document ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *       404:
 *         description: Document not found
 *
 *   delete:
 *     summary: Delete a document attached to a draft claim
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       400:
 *         description: Document cannot be deleted
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *       404:
 *         description: Document not found
 */

// =========================================================
// AUTHENTICATION
// =========================================================

router.use(authenticateToken);

// =========================================================
// UPLOAD DOCUMENT
// =========================================================

router.post(
  "/",
  authorizeRoles("FACULTY"),
  uploadClaimDocument.single("document"),
  uploadDocument
);

// =========================================================
// GET ALL FACULTY DOCUMENTS
// =========================================================

router.get(
  "/",
  authorizeRoles("FACULTY"),
  getDocuments
);

// =========================================================
// VIEW / DOWNLOAD DOCUMENT FILE
// Keep this before /:documentId
// =========================================================

router.get(
  "/:documentId/file",
  authorizeRoles("FACULTY"),
  downloadDocument
);

// =========================================================
// GET ONE DOCUMENT
// =========================================================

router.get(
  "/:documentId",
  authorizeRoles("FACULTY"),
  getDocumentById
);

// =========================================================
// DELETE DOCUMENT
// Only documents attached to DRAFT claims
// can be deleted by faculty.
// =========================================================

router.delete(
  "/:documentId",
  authorizeRoles("FACULTY"),
  removeDocument
);

module.exports = router;
