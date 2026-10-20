const User = require("../models/User");

const {
  getFacultyClaimSummary,
} = require("../services/claimService");

const {
  getUnreadNotificationCount,
} = require("../services/notificationService");

const {
  successResponse,
  errorResponse,
} = require("../utils/responseHelpers");

/*
 * Get dashboard data for the logged-in faculty.
 *
 * GET /api/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const facultyId = req.user.userId;

    /*
     * Fetch the faculty profile and claim/notification
     * information from the actual database.
     */
    const [user, claimSummary, unreadNotifications] =
      await Promise.all([
        User.findById(facultyId).select(
          "-passwordHash"
        ),

        getFacultyClaimSummary(
          facultyId
        ),

        getUnreadNotificationCount(
          facultyId
        ),
      ]);

    if (!user) {
      return errorResponse(
        res,
        404,
        "Faculty profile not found"
      );
    }

    /*
     * Dashboard contains only information belonging
     * to the authenticated faculty member.
     */
    return successResponse(
      res,
      200,
      "Dashboard data retrieved successfully",
      {
        user: {
          id: user._id,
          employeeId: user.employeeId,
          fullName: user.fullName,
          email: user.email,
          department: user.department,
          designation: user.designation,
          role: user.role,
          accountStatus: user.accountStatus,
          profilePhoto: user.profilePhoto,
        },

        claims: claimSummary,

        notifications: {
          unreadCount:
            unreadNotifications,
        },
      }
    );
  } catch (error) {
    console.error(
      "Get dashboard error:",
      error.message
    );

    return errorResponse(
      res,
      500,
      "Unable to retrieve dashboard data"
    );
  }
};

module.exports = {
  getDashboard,
};