
const express = require("express");
const path = require("path");
const User = require("../models/User");

const {
  requestAccess,
  login,
  changePassword,
} = require("../controllers/authController");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  uploadProfilePhoto,
} = require("../config/upload");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Faculty and Admin authentication
 */

/**
 * @swagger
 * /api/auth/request-access:
 *   post:
 *     summary: Submit a faculty registration request
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - fullName
 *               - email
 *               - password
 *               - confirmPassword
 *               - department
 *               - designation
 *               - declarationAccepted
 *             properties:
 *               employeeId:
 *                 type: string
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *               department:
 *                 type: string
 *               designation:
 *                 type: string
 *               declarationAccepted:
 *                 type: boolean
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Registration request submitted successfully
 *       400:
 *         description: Invalid registration details
 *       409:
 *         description: Employee ID or email already registered
 *       500:
 *         description: Unable to submit access request
 */
router.post(
  "/request-access",
  uploadProfilePhoto.single("profilePhoto"),
  requestAccess
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login as a Faculty member or Admin
 *     tags: [Authentication]
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change the authenticated user's password
 *     tags: [Authentication]
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
 *         description: Invalid password details
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Account is not active
 *       404:
 *         description: User account not found
 *       500:
 *         description: Unable to change password
 */
router.post(
  "/change-password",
  authenticateToken,
  changePassword
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/me",
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.userId
      ).select("-passwordHash");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: {
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
        },
      });
    } catch (error) {
      console.error(
        "Get profile error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve profile",
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/profile-photo:
 *   get:
 *     summary: Retrieve the authenticated user's profile photograph
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/profile-photo",
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.userId
      ).select("profilePhoto");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      if (!user.profilePhoto) {
        return res.status(404).json({
          success: false,
          message: "Profile photograph not found",
        });
      }

      const filename = path.basename(
        user.profilePhoto
      );

      const photoPath = path.join(
        __dirname,
        "../../uploads/profile-photos",
        filename
      );

      return res.sendFile(
        photoPath,
        (error) => {
          if (error) {
            console.error(
              "Profile photo retrieval error:",
              error.message
            );

            if (!res.headersSent) {
              return res.status(404).json({
                success: false,
                message:
                  "Profile photograph could not be retrieved",
              });
            }
          }
        }
      );
    } catch (error) {
      console.error(
        "Get profile photo error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve profile photograph",
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/admin-test:
 *   get:
 *     summary: Verify Admin authorization
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/admin-test",
  authenticateToken,
  authorizeRoles("ADMIN"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin authorization verified",
      data: {
        userId: req.user.userId,
        role: req.user.role,
      },
    });
  }
);

module.exports = router;
