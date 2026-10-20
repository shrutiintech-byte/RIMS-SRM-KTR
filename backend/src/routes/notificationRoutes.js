
const express = require("express");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  removeNotification,
} = require("../controllers/notificationController");

const router = express.Router();

// All notification endpoints require authentication.
router.use(authenticateToken);

// Faculty and admins can manage their own notifications.
router.use(authorizeRoles("FACULTY", "ADMIN"));

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management for authenticated users
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty or admin access required
 */
router.get("/", getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get the logged-in user's unread notification count
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty or admin access required
 */
router.get("/unread-count", getUnreadCount);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all of the logged-in user's notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty or admin access required
 */
router.patch("/read-all", markAllAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   get:
 *     summary: Get one of the logged-in user's notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification retrieved successfully
 *       400:
 *         description: Invalid notification ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty or admin access required
 *       404:
 *         description: Notification not found
 */
router.get("/:notificationId", getNotificationById);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark one of the logged-in user's notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       400:
 *         description: Invalid notification ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty or admin access required
 *       404:
 *         description: Notification not found
 */
router.patch("/:notificationId/read", markAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete one of the logged-in user's notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       400:
 *         description: Invalid notification ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Faculty or admin access required
 *       404:
 *         description: Notification not found
 */
router.delete("/:notificationId", removeNotification);

module.exports = router;
