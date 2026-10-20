
const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const adminController = require("../controllers/adminController");

const {
  getAuditHistory,
  verifyAuditLog,
} = require("../controllers/auditController");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard, registration, claim management, and audit verification
 */

// All admin routes require authentication and ADMIN role.
router.use(authenticateToken);
router.use(authorizeRoles("ADMIN"));

// =====================================================
// DASHBOARD
// GET /api/admin/dashboard
// =====================================================

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get("/dashboard", adminController.getDashboardStats);

// =====================================================
// FACULTY REGISTRATIONS
// =====================================================

/**
 * @swagger
 * /api/admin/registrations:
 *   get:
 *     summary: Get all pending faculty registrations
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registrations retrieved successfully
 */
router.get("/registrations", adminController.getPendingRegistrations);

/**
 * @swagger
 * /api/admin/registrations/{id}:
 *   get:
 *     summary: Get registration details
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registration details retrieved
 *       404:
 *         description: Registration not found
 */
router.get("/registrations/:id", adminController.getRegistrationById);

/**
 * @swagger
 * /api/admin/registrations/{id}/approve:
 *   patch:
 *     summary: Approve a faculty registration
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registration approved
 */
router.patch(
  "/registrations/:id/approve",
  adminController.approveRegistration
);

/**
 * @swagger
 * /api/admin/registrations/{id}/reject:
 *   patch:
 *     summary: Reject a faculty registration
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: Please provide valid supporting documents.
 *     responses:
 *       200:
 *         description: Registration rejected
 */
router.patch(
  "/registrations/:id/reject",
  adminController.rejectRegistration
);

// =====================================================
// CLAIM MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/claims:
 *   get:
 *     summary: Get all claims with pagination and filters
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, RETURNED]
 *       - in: query
 *         name: claimType
 *         schema:
 *           type: string
 *       - in: query
 *         name: financialYear
 *         schema:
 *           type: string
 *           example: 2026-27
 *     responses:
 *       200:
 *         description: Claims retrieved successfully
 */
router.get("/claims", adminController.getAllClaims);

/**
 * @swagger
 * /api/admin/claims/{claimId}:
 *   get:
 *     summary: Get claim details
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim details retrieved successfully
 *       404:
 *         description: Claim not found
 */
router.get("/claims/:claimId", adminController.getClaimById);

/**
 * @swagger
 * /api/admin/claims/{claimId}/documents/{documentId}/file:
 *   get:
 *     summary: View a document attached to a claim
 *     description: Allows an authenticated Admin to view a document belonging to the specified non-draft claim.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document file returned successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Claim or document not found
 */
router.get(
  "/claims/:claimId/documents/:documentId/file",
  adminController.viewClaimDocument
);

/**
 * @swagger
 * /api/admin/claims/{claimId}/documents/{documentId}/reject:
 *   patch:
 *     summary: Reject an individual supporting document
 *     description: Rejects a document with a mandatory reason so faculty can replace it. The original document and review history are retained.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 2000
 *                 example: The uploaded grant evidence is unclear. Please upload a readable copy.
 *     responses:
 *       200:
 *         description: Document rejected successfully
 *       400:
 *         description: A valid rejection reason is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Claim or document not found
 *       409:
 *         description: Document cannot be rejected in its current state
 */
router.patch(
  "/claims/:claimId/documents/:documentId/reject",
  adminController.rejectClaimDocument
);

/**
 * @swagger
 * /api/admin/claims/{claimId}/approve:
 *   patch:
 *     summary: Approve a submitted claim
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim approved successfully
 *       404:
 *         description: Claim not found
 */
router.patch(
  "/claims/:claimId/approve",
  adminController.approveClaim
);

/**
 * @swagger
 * /api/admin/claims/{claimId}/reject:
 *   patch:
 *     summary: Reject a submitted claim
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - remarks
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: Please provide valid supporting evidence.
 *     responses:
 *       200:
 *         description: Claim rejected successfully
 *       400:
 *         description: Rejection remarks are required
 *       404:
 *         description: Claim not found
 */
router.patch(
  "/claims/:claimId/reject",
  adminController.rejectClaim
);

/**
 * @swagger
 * /api/admin/claims/{claimId}/return:
 *   patch:
 *     summary: Return a claim to faculty for corrections
 *     description: Returns a submitted claim to faculty with mandatory correction comments.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - remarks
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: Please upload the missing supporting document.
 *     responses:
 *       200:
 *         description: Claim returned to faculty for corrections
 *       400:
 *         description: Correction comments are required
 *       404:
 *         description: Claim not found
 *       409:
 *         description: Claim cannot be returned in its current status
 */
router.patch(
  "/claims/:claimId/return",
  adminController.returnClaimForCorrection
);

// =====================================================
// AUDIT HISTORY AND INTEGRITY VERIFICATION
// BLOCKCHAIN / HASH-CHAIN RELATED FUNCTIONALITY
// =====================================================

/**
 * @swagger
 * /api/admin/audit:
 *   get:
 *     summary: Get paginated audit history
 *     description: Returns audit records, actor details, timestamps, and hash information.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Audit history retrieved successfully
 */
router.get("/audit", getAuditHistory);

/**
 * @swagger
 * /api/admin/audit/verify:
 *   get:
 *     summary: Verify the integrity of the audit hash chain
 *     description: Checks audit sequence numbers, previous hashes, and record hashes.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Audit chain verification completed
 */
router.get("/audit/verify", verifyAuditLog);

module.exports = router;
