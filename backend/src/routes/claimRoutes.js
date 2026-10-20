
const express = require("express");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  createDraft,
  getClaims,
  getClaimById,
  updateClaimController,
  submitClaimController,
  deleteClaimDraft,
  getClaimSummary,
} = require("../controllers/claimController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Faculty Claims
 *   description: Faculty claim creation, management, and submission
 */

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: Create a new claim draft
 *     tags: [Faculty Claims]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - claimType
 *             properties:
 *               claimType:
 *                 type: string
 *                 description: Type of claim
 *                 example: PATENT
 *               title:
 *                 type: string
 *                 description: Title of the claim
 *                 example: Research Patent Application
 *               description:
 *                 type: string
 *                 description: Description of the claim
 *                 example: Description of the research claim
 *     responses:
 *       201:
 *         description: Claim draft created successfully
 *       400:
 *         description: Invalid or missing request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *
 *   get:
 *     summary: Get claims belonging to the logged-in faculty member
 *     tags: [Faculty Claims]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Claims retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 */

// All claim routes require authentication.
router.use(authenticateToken);

// Create a new claim draft.
router.post(
  "/",
  authorizeRoles("FACULTY"),
  createDraft
);

// Get all claims belonging to the logged-in faculty member.
router.get(
  "/",
  authorizeRoles("FACULTY"),
  getClaims
);

/**
 * @swagger
 * /api/claims/summary:
 *   get:
 *     summary: Get claim summary for the logged-in faculty member
 *     tags: [Faculty Claims]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Claim summary retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 */
router.get(
  "/summary",
  authorizeRoles("FACULTY"),
  getClaimSummary
);

/**
 * @swagger
 * /api/claims/{claimId}:
 *   get:
 *     summary: Get a specific faculty claim
 *     tags: [Faculty Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *     responses:
 *       200:
 *         description: Claim retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *       404:
 *         description: Claim not found
 *
 *   patch:
 *     summary: Update a draft or returned claim
 *     tags: [Faculty Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             example:
 *               title: Updated research title
 *               description: Updated research description
 *     responses:
 *       200:
 *         description: Claim updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *       404:
 *         description: Claim not found
 *
 *   delete:
 *     summary: Delete a claim draft
 *     tags: [Faculty Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *     responses:
 *       200:
 *         description: Draft deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *       404:
 *         description: Claim not found
 */

// Get one claim.
router.get(
  "/:claimId",
  authorizeRoles("FACULTY"),
  getClaimById
);

// Update a claim.
router.patch(
  "/:claimId",
  authorizeRoles("FACULTY"),
  updateClaimController
);

// Delete a claim draft.
router.delete(
  "/:claimId",
  authorizeRoles("FACULTY"),
  deleteClaimDraft
);

/**
 * @swagger
 * /api/claims/{claimId}/submit:
 *   post:
 *     summary: Submit a claim for review
 *     tags: [Faculty Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *     responses:
 *       200:
 *         description: Claim submitted successfully
 *       400:
 *         description: Claim cannot be submitted
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty role required
 *       404:
 *         description: Claim not found
 */
router.post(
  "/:claimId/submit",
  authorizeRoles("FACULTY"),
  submitClaimController
);

module.exports = router;
