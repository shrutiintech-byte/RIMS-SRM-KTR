
const mongoose = require("mongoose");

const User = require("../models/User");
const Claim = require("../models/Claim");
const Document = require("../models/Document");
const Notification = require("../models/Notification");

const { recordAuditEvent } = require("./auditService");
const { sendEmail } = require("./emailService");

const {
  calculateResearchProjectIncentive,
} = require("../utils/researchProjectIncentive");

// =====================================================
// HELPER: CREATE ERRORS WITH HTTP STATUS CODES
// =====================================================

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// =====================================================
// HELPER: VALIDATE OBJECT IDS
// =====================================================

const validateObjectId = (id, message = "Invalid ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(message, 400);
  }
};

// =====================================================
// 1. GET PENDING FACULTY REGISTRATIONS
// GET /api/admin/registrations
// =====================================================

const getPendingRegistrations = async ({
  page = 1,
  limit = 10,
  search = "",
} = {}) => {
  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(limit, 10) || 10)
  );

  const query = {
    role: "FACULTY",
    accountStatus: "PENDING",
  };

  const searchText =
    typeof search === "string" ? search.trim() : "";

  if (searchText) {
    const escapedSearch = searchText.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const searchRegex = new RegExp(escapedSearch, "i");

    query.$or = [
      { fullName: searchRegex },
      { employeeId: searchRegex },
      { email: searchRegex },
      { department: searchRegex },
      { designation: searchRegex },
    ];
  }

  const [registrations, total] = await Promise.all([
    User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    User.countDocuments(query),
  ]);

  return {
    registrations,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: currentPage * pageSize < total,
      hasPreviousPage: currentPage > 1,
    },
  };
};

// =====================================================
// 2. GET FACULTY REGISTRATION DETAILS
// GET /api/admin/registrations/:id
// =====================================================

const getRegistrationById = async (userId) => {
  validateObjectId(userId, "Invalid registration ID");

  const user = await User.findOne({
    _id: userId,
    role: "FACULTY",
  })
    .select("-passwordHash")
    .lean();

  if (!user) {
    throw createError("Faculty registration not found", 404);
  }

  return user;
};

// =====================================================
// 3. APPROVE FACULTY REGISTRATION
// PATCH /api/admin/registrations/:id/approve
// =====================================================

const approveRegistration = async (userId, adminId) => {
  validateObjectId(userId, "Invalid user ID");
  validateObjectId(adminId, "Invalid admin ID");

  const user = await User.findOne({
    _id: userId,
    role: "FACULTY",
  });

  if (!user) {
    throw createError("Faculty registration not found", 404);
  }

  if (user.accountStatus !== "PENDING") {
    throw createError(
      "Registration has already been processed",
      409
    );
  }

  user.accountStatus = "ACTIVE";
  user.approvedBy = adminId;
  user.approvedAt = new Date();

  user.rejectedBy = null;
  user.rejectedAt = null;
  user.rejectionReason = "";

  await user.save();

  await recordAuditEvent({
    action: "FACULTY_REGISTRATION_APPROVED",
    actorId: adminId,
    targetId: user._id,
    targetType: "User",
    metadata: {
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
      previousStatus: "PENDING",
      newStatus: "ACTIVE",
    },
  });

  return User.findById(user._id)
    .select("-passwordHash")
    .lean();
};

// =====================================================
// 4. REJECT FACULTY REGISTRATION
// PATCH /api/admin/registrations/:id/reject
// =====================================================

const rejectRegistration = async (
  userId,
  adminId,
  rejectionReason
) => {
  validateObjectId(userId, "Invalid user ID");
  validateObjectId(adminId, "Invalid admin ID");

  if (
    typeof rejectionReason !== "string" ||
    !rejectionReason.trim()
  ) {
    throw createError("Rejection reason is required", 400);
  }

  const user = await User.findOne({
    _id: userId,
    role: "FACULTY",
  });

  if (!user) {
    throw createError("Faculty registration not found", 404);
  }

  if (user.accountStatus !== "PENDING") {
    throw createError(
      "Registration has already been processed",
      409
    );
  }

  user.accountStatus = "REJECTED";
  user.rejectedBy = adminId;
  user.rejectedAt = new Date();
  user.rejectionReason = rejectionReason.trim();

  user.approvedBy = null;
  user.approvedAt = null;

  await user.save();

  await recordAuditEvent({
    action: "FACULTY_REGISTRATION_REJECTED",
    actorId: adminId,
    targetId: user._id,
    targetType: "User",
    metadata: {
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
      previousStatus: "PENDING",
      newStatus: "REJECTED",
      rejectionReason: user.rejectionReason,
    },
  });

  return User.findById(user._id)
    .select("-passwordHash")
    .lean();
};

// =====================================================
// 5. GET ADMIN DASHBOARD STATISTICS
// GET /api/admin/dashboard
// =====================================================

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalClaims,
    pendingClaims,
    approvedClaims,
    rejectedClaims,
    totalDocuments,
  ] = await Promise.all([
    User.countDocuments(),
    Claim.countDocuments(),
    Claim.countDocuments({
      status: { $in: ["SUBMITTED", "UNDER_REVIEW"] },
    }),
    Claim.countDocuments({ status: "APPROVED" }),
    Claim.countDocuments({ status: "REJECTED" }),
    Document.countDocuments(),
  ]);

  return {
    totalUsers,
    totalClaims,
    pendingClaims,
    approvedClaims,
    rejectedClaims,
    totalDocuments,
  };
};

// =====================================================
// 6. GET ALL CLAIMS
// GET /api/admin/claims
// =====================================================

const getAllClaims = async (filters = {}) => {
  const currentPage = Math.max(
    1,
    parseInt(filters.page, 10) || 1
  );

  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(filters.limit, 10) || 10)
  );

  const query = {
    status: { $ne: "DRAFT" },
  };

  const validStatuses = [
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "RETURNED",
  ];

  if (filters.status) {
    if (!validStatuses.includes(filters.status)) {
      throw createError("Invalid claim status filter", 400);
    }

    query.status = filters.status;
  }

  if (filters.claimType) {
    const claimTypeValues =
      Claim.schema.path("claimType")?.enumValues || [];

    if (
      claimTypeValues.length > 0 &&
      !claimTypeValues.includes(filters.claimType)
    ) {
      throw createError("Invalid claim type filter", 400);
    }

    query.claimType = filters.claimType;
  }

  if (filters.financialYear) {
    const financialYearValues =
      Claim.schema.path("financialYear")?.enumValues || [];

    if (
      financialYearValues.length > 0 &&
      !financialYearValues.includes(filters.financialYear)
    ) {
      throw createError(
        "Invalid financial year filter",
        400
      );
    }

    query.financialYear = filters.financialYear;
  }

  const [claims, total] = await Promise.all([
    Claim.find(query)
      .populate(
        "faculty",
        "fullName email employeeId department"
      )
      .populate("documents")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Claim.countDocuments(query),
  ]);

  return {
    claims,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: currentPage * pageSize < total,
      hasPreviousPage: currentPage > 1,
    },
  };
};

// =====================================================
// 7. GET CLAIM BY ID
// GET /api/admin/claims/:claimId
// =====================================================

const getClaimById = async (claimId) => {
  validateObjectId(claimId, "Invalid claim ID");

  const claim = await Claim.findById(claimId)
    .populate(
      "faculty",
      "fullName email employeeId department"
    )
    .populate("documents");

  if (!claim || claim.status === "DRAFT") {
    throw createError("Claim not found", 404);
  }

  return claim;
};

// =====================================================
// HELPER: VALIDATE CLAIM FOR A DECISION
// =====================================================

const getClaimForDecision = async (claimId, adminId) => {
  validateObjectId(claimId, "Invalid claim ID");
  validateObjectId(adminId, "Invalid admin ID");

  const claim = await Claim.findById(claimId);

  if (!claim || claim.status === "DRAFT") {
    throw createError("Claim not found", 404);
  }

  if (
    !["SUBMITTED", "UNDER_REVIEW"].includes(claim.status)
  ) {
    throw createError(
      "Only submitted or under-review claims can be processed",
      409
    );
  }

  return claim;
};

// =====================================================
// HELPER: CREATE CLAIM NOTIFICATION
// =====================================================

const createClaimNotification = async ({
  recipient,
  claimId,
  type,
  title,
  message,
}) => {
  return Notification.create({
    recipient,
    claim: claimId,
    type,
    title,
    message,
    isRead: false,
  });
};

// =====================================================
// HELPER: SEND CLAIM STATUS EMAIL SAFELY
// =====================================================

const sendClaimStatusEmailSafely = async ({
  facultyId,
  claimType,
  status,
  comment = "",
}) => {
  if (
    process.env.EMAIL_NOTIFICATIONS_ENABLED !== "true"
  ) {
    return;
  }

  try {
    const faculty = await User.findById(facultyId)
      .select("fullName email notificationPreferences")
      .lean();

    if (!faculty || !faculty.email) {
      return;
    }

    const preferences =
      faculty.notificationPreferences || {};

    if (preferences.emailNotifications === false) {
      return;
    }

    if (
      ["APPROVED", "REJECTED"].includes(status) &&
      preferences.approvalUpdates === false
    ) {
      return;
    }

    if (
      status === "RETURNED" &&
      preferences.claimUpdates === false
    ) {
      return;
    }

    const statusText = {
      APPROVED: "approved",
      REJECTED: "rejected",
      RETURNED: "returned for correction",
    }[status];

    if (!statusText) {
      return;
    }

    const subject =
      `SRM RIMS: Your ${claimType} claim has been ${statusText}`;

    const text = [
      `Dear ${faculty.fullName},`,
      "",
      `Your ${claimType} claim has been ${statusText}.`,
      comment ? `Review comment: ${comment}` : "",
      "",
      "Please log in to SRM RIMS to view your claim details.",
      "",
      "Regards,",
      "SRM RIMS Team",
    ]
      .filter(Boolean)
      .join("\n");

    await sendEmail({
      to: faculty.email,
      subject,
      text,
    });
  } catch (error) {
    // Email failures must not undo the claim decision.
    console.error(
      "SRM RIMS claim status email failed:",
      error.message
    );
  }
};

// =====================================================
// 8. APPROVE CLAIM
// PATCH /api/admin/claims/:claimId/approve
// =====================================================

const approveClaim = async (
  claimId,
  adminId,
  remarks = ""
) => {
  if (typeof remarks !== "string") {
    throw createError("Remarks must be a string", 400);
  }

  const claim = await getClaimForDecision(claimId, adminId);

  // Only Research Project currently has an integrated
  // backend calculator. Do not approve unverified amounts.
  if (claim.claimType !== "RESEARCH_PROJECT") {
    const error = createError(
      `Approval is temporarily unavailable for ${claim.claimType.replace(
        /_/g,
        " "
      )}. Its SRM policy-based incentive calculation must be implemented and verified first.`,
      409
    );

    error.code = "INCENTIVE_CALCULATION_UNAVAILABLE";
    throw error;
  }

  let expectedAmount;

  try {
    expectedAmount = calculateResearchProjectIncentive(
      claim.formData
    );
  } catch (error) {
    throw createError(
      `Research Project incentive validation failed: ${error.message}`,
      400
    );
  }

  if (
    !Number.isFinite(expectedAmount) ||
    expectedAmount <= 0
  ) {
    throw createError(
      "The calculated Research Project incentive amount is invalid.",
      400
    );
  }

  const savedAmount = Number(claim.incentiveAmount);

  if (
    !Number.isFinite(savedAmount) ||
    Math.abs(savedAmount - expectedAmount) > 0.01
  ) {
    throw createError(
      "The saved Research Project incentive does not match the backend calculation. Correct and recalculate the claim before approval.",
      409
    );
  }

  const previousStatus = claim.status;
  const reviewDate = new Date();

  claim.status = "APPROVED";
  claim.reviewedBy = adminId;
  claim.reviewedAt = reviewDate;
  claim.approvedAt = reviewDate;
  claim.rejectedAt = null;
  claim.reviewComment = remarks.trim();

  await claim.save();

  await recordAuditEvent({
    action: "CLAIM_APPROVED",
    actorId: adminId,
    targetId: claim._id,
    targetType: "Claim",
    metadata: {
      claimType: claim.claimType,
      financialYear: claim.financialYear,
      previousStatus,
      incentiveAmount: claim.incentiveAmount,
      reviewComment: claim.reviewComment,
      newStatus: "APPROVED",
    },
  });

  await createClaimNotification({
    recipient: claim.faculty,
    claimId: claim._id,
    type: "CLAIM_APPROVED",
    title: "Claim Approved",
    message:
      `Your ${claim.claimType.replace(
        /_/g,
        " "
      )} claim has been approved.`,
  });

  await sendClaimStatusEmailSafely({
    facultyId: claim.faculty,
    claimType: claim.claimType.replace(/_/g, " "),
    status: "APPROVED",
    comment: claim.reviewComment,
  });

  return claim;
};

// =====================================================
// 9. REJECT CLAIM
// PATCH /api/admin/claims/:claimId/reject
// =====================================================

const rejectClaim = async (
  claimId,
  adminId,
  remarks
) => {
  if (
    typeof remarks !== "string" ||
    !remarks.trim()
  ) {
    throw createError(
      "Rejection remarks are required",
      400
    );
  }

  const claim = await getClaimForDecision(claimId, adminId);

  const previousStatus = claim.status;
  const reviewDate = new Date();

  claim.status = "REJECTED";
  claim.reviewedBy = adminId;
  claim.reviewedAt = reviewDate;
  claim.rejectedAt = reviewDate;
  claim.approvedAt = null;
  claim.reviewComment = remarks.trim();

  await claim.save();

  await recordAuditEvent({
    action: "CLAIM_REJECTED",
    actorId: adminId,
    targetId: claim._id,
    targetType: "Claim",
    metadata: {
      claimType: claim.claimType,
      financialYear: claim.financialYear,
      previousStatus,
      reviewComment: claim.reviewComment,
      newStatus: "REJECTED",
    },
  });

  await createClaimNotification({
    recipient: claim.faculty,
    claimId: claim._id,
    type: "CLAIM_REJECTED",
    title: "Claim Rejected",
    message:
      `Your ${claim.claimType.replace(
        /_/g,
        " "
      )} claim was rejected. ` +
      `Reason: ${claim.reviewComment}`,
  });

  await sendClaimStatusEmailSafely({
    facultyId: claim.faculty,
    claimType: claim.claimType.replace(/_/g, " "),
    status: "REJECTED",
    comment: claim.reviewComment,
  });

  return claim;
};

// =====================================================
// 10. RETURN CLAIM FOR CORRECTIONS
// PATCH /api/admin/claims/:claimId/return
// =====================================================

const returnClaimForCorrection = async (
  claimId,
  adminId,
  remarks
) => {
  if (
    typeof remarks !== "string" ||
    !remarks.trim()
  ) {
    throw createError(
      "Correction comments are required",
      400
    );
  }

  const claim = await getClaimForDecision(claimId, adminId);

  const previousStatus = claim.status;
  const reviewComment = remarks.trim();
  const reviewDate = new Date();

  claim.status = "RETURNED";
  claim.reviewedBy = adminId;
  claim.reviewedAt = reviewDate;
  claim.approvedAt = null;
  claim.rejectedAt = null;
  claim.reviewComment = reviewComment;

  await claim.save();

  await recordAuditEvent({
    action: "CLAIM_RETURNED",
    actorId: adminId,
    targetId: claim._id,
    targetType: "Claim",
    metadata: {
      claimType: claim.claimType,
      financialYear: claim.financialYear,
      previousStatus,
      reviewComment,
      newStatus: "RETURNED",
    },
  });

  await createClaimNotification({
    recipient: claim.faculty,
    claimId: claim._id,
    type: "CLAIM_RETURNED",
    title: "Claim Returned for Corrections",
    message:
      `Your ${claim.claimType.replace(
        /_/g,
        " "
      )} claim has been returned for corrections. ` +
      `Please review the comments: ${reviewComment}`,
  });

  await sendClaimStatusEmailSafely({
    facultyId: claim.faculty,
    claimType: claim.claimType.replace(/_/g, " "),
    status: "RETURNED",
    comment: reviewComment,
  });

  return claim;
};

// =====================================================
// 11. GET ALL USERS
// =====================================================

const getAllUsers = async () => {
  return User.find()
    .select("-passwordHash")
    .sort({ createdAt: -1 });
};

// =====================================================
// 12. GET ALL DOCUMENTS
// =====================================================

const getAllDocuments = async () => {
  return Document.find().sort({ createdAt: -1 });
};

// =====================================================
// EXPORT ADMIN SERVICE FUNCTIONS
// =====================================================

module.exports = {
  getPendingRegistrations,
  getRegistrationById,
  approveRegistration,
  rejectRegistration,
  getDashboardStats,
  getAllClaims,
  getClaimById,
  approveClaim,
  rejectClaim,
  returnClaimForCorrection,
  getAllUsers,
  getAllDocuments,
};
