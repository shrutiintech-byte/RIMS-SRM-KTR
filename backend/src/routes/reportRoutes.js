
const express = require("express");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  getReportSummary,
  getClaimReport,
  getByCategory,
  getByFinancialYear,
} = require("../controllers/reportController");

const router = express.Router();

// All report routes require authentication.
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Faculty Reports
 *   description: Faculty claim and incentive reports
 */

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Get overall report summary
 *     tags: [Faculty Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Report summary retrieved successfully
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Faculty access required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/summary",
  authorizeRoles("FACULTY"),
  getReportSummary
);

/**
 * @swagger
 * /api/reports/claims:
 *   get:
 *     summary: Get claim-wise report
 *     tags: [Faculty Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Claim report retrieved successfully
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Faculty access required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/claims",
  authorizeRoles("FACULTY"),
  getClaimReport
);

/**
 * @swagger
 * /api/reports/by-category:
 *   get:
 *     summary: Get approved incentive totals by category
 *     tags: [Faculty Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category report retrieved successfully
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Faculty access required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/by-category",
  authorizeRoles("FACULTY"),
  getByCategory
);

/**
 * @swagger
 * /api/reports/by-financial-year:
 *   get:
 *     summary: Get approved incentive totals by financial year
 *     tags: [Faculty Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Financial-year report retrieved successfully
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Faculty access required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/by-financial-year",
  authorizeRoles("FACULTY"),
  getByFinancialYear
);

module.exports = router;
