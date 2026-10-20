
const express = require("express");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  getDashboard,
} = require("../controllers/dashboardController");

const router = express.Router();

// All dashboard routes require authentication.
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Faculty Dashboard
 *   description: Faculty dashboard management APIs
 */

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard data for the logged-in faculty member
 *     tags: [Faculty Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Faculty access required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authorizeRoles("FACULTY"),
  getDashboard
);

module.exports = router;
