
const express = require("express");

const {
  getSettings,
  updateSettings,
  changePassword,
} = require("../controllers/settingsController");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const router = express.Router();

// All settings routes require authentication.
router.use(authenticateToken);

// Allow Faculty and Admin to manage their own settings.
// The controller uses req.user.userId, so each user accesses
// only their own settings and password.
router.use(authorizeRoles("FACULTY", "ADMIN"));

/**
 * @swagger
 * tags:
 *   name: Account Settings
 *   description: Faculty and Admin account settings and password management
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get settings for the authenticated user
 *     tags: [Account Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Access denied for this role
 *       404:
 *         description: User account not found
 *       500:
 *         description: Internal server error
 */
router.get("/", getSettings);

/**
 * @swagger
 * /api/settings:
 *   patch:
 *     summary: Update notification preferences for the authenticated user
 *     tags: [Account Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationPreferences
 *             properties:
 *               notificationPreferences:
 *                 type: object
 *                 properties:
 *                   emailNotifications:
 *                     type: boolean
 *                   claimUpdates:
 *                     type: boolean
 *                   approvalUpdates:
 *                     type: boolean
 *                   documentUpdates:
 *                     type: boolean
 *                   systemNotifications:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid settings data
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Access denied for this role
 *       404:
 *         description: User account not found
 *       500:
 *         description: Internal server error
 */
router.patch("/", updateSettings);

/**
 * @swagger
 * /api/settings/password:
 *   patch:
 *     summary: Change the password for the authenticated user
 *     tags: [Account Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid password data
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Access denied for this role
 *       404:
 *         description: User account not found
 *       500:
 *         description: Internal server error
 */
router.patch("/password", changePassword);

module.exports = router;
