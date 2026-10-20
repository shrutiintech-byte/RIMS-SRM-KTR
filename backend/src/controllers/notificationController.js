const mongoose = require("mongoose");

const {
  getFacultyNotifications,
  getFacultyNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
} = require("../services/notificationService");

const {
  successResponse,
  errorResponse,
} = require("../utils/responseHelpers");

// =========================================================
// GET ALL NOTIFICATIONS
// =========================================================

const getNotifications = async (req, res) => {
  try {
    const facultyId = req.user.userId;

    const {
      type,
      isRead,
      limit,
    } = req.query;

    const notifications =
      await getFacultyNotifications({
        facultyId,
        type,
        isRead,
        limit,
      });

    return successResponse(
      res,
      200,
      "Notifications retrieved successfully",
      {
        notifications,
      }
    );
  } catch (error) {
    console.error(
      "Get notifications error:",
      error.message
    );

    return errorResponse(
      res,
      500,
      "Unable to retrieve notifications"
    );
  }
};

// =========================================================
// GET ONE NOTIFICATION
// =========================================================

const getNotificationById = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const {
      notificationId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        notificationId
      )
    ) {
      return errorResponse(
        res,
        400,
        "Invalid notification ID"
      );
    }

    const notification =
      await getFacultyNotificationById({
        facultyId,
        notificationId,
      });

    return successResponse(
      res,
      200,
      "Notification retrieved successfully",
      {
        notification,
      }
    );
  } catch (error) {
    console.error(
      "Get notification error:",
      error.message
    );

    if (
      error.message ===
      "Notification not found"
    ) {
      return errorResponse(
        res,
        404,
        error.message
      );
    }

    return errorResponse(
      res,
      500,
      "Unable to retrieve notification"
    );
  }
};

// =========================================================
// MARK ONE AS READ
// =========================================================

const markAsRead = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const {
      notificationId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        notificationId
      )
    ) {
      return errorResponse(
        res,
        400,
        "Invalid notification ID"
      );
    }

    const notification =
      await markNotificationAsRead({
        facultyId,
        notificationId,
      });

    return successResponse(
      res,
      200,
      "Notification marked as read",
      {
        notification,
      }
    );
  } catch (error) {
    console.error(
      "Mark notification as read error:",
      error.message
    );

    if (
      error.message ===
      "Notification not found"
    ) {
      return errorResponse(
        res,
        404,
        error.message
      );
    }

    return errorResponse(
      res,
      500,
      "Unable to update notification"
    );
  }
};

// =========================================================
// MARK ALL AS READ
// =========================================================

const markAllAsRead = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const result =
      await markAllNotificationsAsRead(
        facultyId
      );

    return successResponse(
      res,
      200,
      "All notifications marked as read",
      {
        ...result,
      }
    );
  } catch (error) {
    console.error(
      "Mark all notifications as read error:",
      error.message
    );

    return errorResponse(
      res,
      500,
      "Unable to update notifications"
    );
  }
};

// =========================================================
// GET UNREAD COUNT
// =========================================================

const getUnreadCount = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const count =
      await getUnreadNotificationCount(
        facultyId
      );

    return successResponse(
      res,
      200,
      "Unread notification count retrieved successfully",
      {
        count,
      }
    );
  } catch (error) {
    console.error(
      "Get unread notification count error:",
      error.message
    );

    return errorResponse(
      res,
      500,
      "Unable to retrieve unread notification count"
    );
  }
};

// =========================================================
// DELETE NOTIFICATION
// =========================================================

const removeNotification = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const {
      notificationId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        notificationId
      )
    ) {
      return errorResponse(
        res,
        400,
        "Invalid notification ID"
      );
    }

    await deleteNotification({
      facultyId,
      notificationId,
    });

    return successResponse(
      res,
      200,
      "Notification deleted successfully"
    );
  } catch (error) {
    console.error(
      "Delete notification error:",
      error.message
    );

    if (
      error.message ===
      "Notification not found"
    ) {
      return errorResponse(
        res,
        404,
        error.message
      );
    }

    return errorResponse(
      res,
      500,
      "Unable to delete notification"
    );
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  removeNotification,
};