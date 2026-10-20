
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const defaultNotificationPreferences = {
  emailNotifications: true,
  claimUpdates: true,
  approvalUpdates: true,
  documentUpdates: true,
  systemNotifications: true,
};

const allowedPreferenceFields = Object.keys(
  defaultNotificationPreferences
);

/*
|--------------------------------------------------------------------------
| GET SETTINGS
|--------------------------------------------------------------------------
| Returns the authenticated user's notification preferences and
| account activity details.
*/

const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "notificationPreferences passwordChangedAt lastLogin"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    const notificationPreferences = {
      ...defaultNotificationPreferences,
      ...(user.notificationPreferences?.toObject?.() ||
        user.notificationPreferences ||
        {}),
    };

    return res.status(200).json({
      success: true,
      message: "Settings retrieved successfully",
      data: {
        notificationPreferences,
        passwordChangedAt: user.passwordChangedAt || null,
        lastLogin: user.lastLogin || null,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve settings",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE NOTIFICATION SETTINGS
|--------------------------------------------------------------------------
| Updates only the supplied, permitted preference fields.
| Unspecified preferences remain unchanged.
|
| Note: emailNotifications is a user preference only. It does not enable
| server-side email delivery. EMAIL_NOTIFICATIONS_ENABLED remains a
| separate environment-level switch.
*/

const updateSettings = async (req, res) => {
  try {
    const { notificationPreferences } = req.body || {};

    if (
      !notificationPreferences ||
      typeof notificationPreferences !== "object" ||
      Array.isArray(notificationPreferences)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notification preferences must be provided as an object",
      });
    }

    const suppliedFields = Object.keys(notificationPreferences);

    if (suppliedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one notification preference is required",
      });
    }

    const invalidFields = suppliedFields.filter(
      (field) => !allowedPreferenceFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more notification preference fields are invalid",
        errors: invalidFields,
      });
    }

    const updates = {};

    for (const field of suppliedFields) {
      if (typeof notificationPreferences[field] !== "boolean") {
        return res.status(400).json({
          success: false,
          message: `${field} must be true or false`,
        });
      }

      updates[`notificationPreferences.${field}`] =
        notificationPreferences[field];
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("notificationPreferences");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    const savedPreferences =
      user.notificationPreferences?.toObject?.() ||
      user.notificationPreferences ||
      {};

    const finalPreferences = {
      ...defaultNotificationPreferences,
      ...savedPreferences,
    };

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: {
        notificationPreferences: finalPreferences,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification preferences",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
| Verifies the current password and stores only the new password hash.
*/

const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body || {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password, and confirmation are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirmation password do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters",
      });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "New password must not exceed 128 characters",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your current password",
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  changePassword,
};
