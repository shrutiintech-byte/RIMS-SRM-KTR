const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

// =========================================================
// REQUEST ACCESS
// =========================================================

const requestAccess = async (req, res) => {
  try {
    const {
      fullName,
      employeeId,
      email,
      department,
      designation,
      password,
      confirmPassword,
      declarationAccepted,
    } = req.body;

    // 1. Validate required fields.
    if (
      !fullName ||
      !employeeId ||
      !email ||
      !department ||
      !designation ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // 2. Validate password confirmation.
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // 3. Validate declaration acceptance.
    const isDeclarationAccepted =
      declarationAccepted === true ||
      declarationAccepted === "true";

    if (!isDeclarationAccepted) {
      return res.status(400).json({
        success: false,
        message: "You must accept the declaration",
      });
    }

    // 4. Normalize registration details.
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim();

    // 5. Check for an existing employee ID.
    const existingEmployee = await User.findOne({
      employeeId: normalizedEmployeeId,
    });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee ID is already registered",
      });
    }

    // 6. Check for an existing email.
    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // 7. Hash the password.
    const passwordHash = await bcrypt.hash(password, 12);

    // 8. Save the optional profile photo path.
    const profilePhoto = req.file
      ? `/uploads/profile-photos/${req.file.filename}`
      : null;

    // 9. Create the faculty access request.
    const user = await User.create({
      employeeId: normalizedEmployeeId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "FACULTY",
      accountStatus: "PENDING",
      department: department.trim(),
      designation: designation.trim(),
      profilePhoto,
      declarationAccepted: true,
    });

    return res.status(201).json({
      success: true,
      message:
        "Access request submitted successfully. Your account is pending approval.",
      data: {
        userId: user._id,
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        accountStatus: user.accountStatus,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error("Request access error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to submit access request",
    });
  }
};

// =========================================================
// LOGIN
// =========================================================

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 1. Validate login fields.
    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      !identifier.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email/Employee ID and password are required",
      });
    }

    // 2. Normalize the login identifier.
    const loginIdentifier = identifier.trim();

    // 3. Find the user by email or employee ID.
    const user = await User.findOne({
      $or: [
        {
          email: loginIdentifier.toLowerCase(),
        },
        {
          employeeId: loginIdentifier,
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 4. Verify the stored password hash.
    if (
      typeof user.passwordHash !== "string" ||
      !user.passwordHash
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 5. Allow login only for active accounts.
    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Account is ${String(
          user.accountStatus || "inactive"
        ).toLowerCase()}`,
      });
    }

    // 6. Verify that the JWT secret is configured.
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Unable to login",
      });
    }

    // 7. Generate the authentication token.
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // 8. Update the last login time.
    user.lastLogin = new Date();
    await user.save();

    // 9. Return the login response.
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
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
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

// =========================================================
// CHANGE PASSWORD
// =========================================================

const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // 1. Validate required fields.
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
        message: "All password fields are required",
      });
    }

    // 2. Enforce password length limits.
    // bcrypt supports a maximum of 72 UTF-8 bytes.
    if (
      newPassword.length < 8 ||
      Buffer.byteLength(newPassword, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The new password must contain at least 8 characters and must not exceed 72 UTF-8 bytes",
      });
    }

    // 3. Validate password confirmation.
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirmation do not match",
      });
    }

    // 4. Prevent reuse of the current password.
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Your new password must be different from your current password",
      });
    }

    // 5. Ensure the request is authenticated.
    // The user ID must come from the verified JWT middleware.
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 6. Find the authenticated user's account.
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    // 7. Only active accounts may change their passwords.
    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    // 8. Ensure the account has a stored password hash.
    if (
      typeof user.passwordHash !== "string" ||
      !user.passwordHash
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to verify the current password",
      });
    }

    // 9. Verify the current password.
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: "Your current password is incorrect",
      });
    }

    // 10. Hash the new password using the same approach as registration.
    user.passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    // 11. Save the updated password hash.
    await user.save();

    // 12. Return the success response expected by the frontend.
    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please sign in again if prompted.",
    });
  } catch (error) {
    console.error(
      "Change password error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to change password. Please try again.",
    });
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  requestAccess,
  login,
  changePassword,
};