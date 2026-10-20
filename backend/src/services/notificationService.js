
const mongoose = require("mongoose");

const Notification = require("../models/Notification");
const User = require("../models/User");
const Claim = require("../models/Claim");

// =========================================================
// VALIDATION HELPERS
// =========================================================

const isValidObjectId = (id) =>
  Boolean(id) && mongoose.Types.ObjectId.isValid(id);

const getUserId = (params = {}) =>
  params.userId || params.facultyId;

// =========================================================
// CREATE NOTIFICATION
// =========================================================

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  claim = null,
  metadata = {},
}) => {
  if (!isValidObjectId(recipient)) {
    throw new Error("A valid notification recipient is required");
  }

  if (
    typeof type !== "string" ||
    !type.trim()
  ) {
    throw new Error("Notification type is required");
  }

  if (
    typeof title !== "string" ||
    !title.trim()
  ) {
    throw new Error("Notification title is required");
  }

  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    throw new Error("Notification message is required");
  }

  if (claim && !isValidObjectId(claim)) {
    throw new Error("Invalid claim ID");
  }

  const safeMetadata =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
      ? metadata
      : {};

  return Notification.create({
    recipient,
    type: type.trim(),
    title: title.trim(),
    message: message.trim(),
    claim: claim || null,
    metadata: safeMetadata,
    isRead: false,
    readAt: null,
  });
};

// =========================================================
// GET NOTIFICATIONS FOR THE AUTHENTICATED USER
// =========================================================

const getFacultyNotifications = async ({
  userId,
  facultyId,
  type,
  isRead,
  limit = 20,
}) => {
  const recipientId = userId || facultyId;

  if (!isValidObjectId(recipientId)) {
    throw new Error("A valid user ID is required");
  }

  const query = {
    recipient: recipientId,
  };

  if (type) {
    query.type = type;
  }

  if (isRead !== undefined) {
    if (
      isRead !== true &&
      isRead !== false &&
      isRead !== "true" &&
      isRead !== "false"
    ) {
      throw new Error("Invalid read-status filter");
    }

    query.isRead =
      isRead === true || isRead === "true";
  }

  const parsedLimit = Number(limit);

  const safeLimit =
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0 &&
    parsedLimit <= 100
      ? parsedLimit
      : 20;

  return Notification.find(query)
    .populate(
      "claim",
      "claimType status financialYear incentiveAmount"
    )
    .sort({ createdAt: -1 })
    .limit(safeLimit);
};

// =========================================================
// GET ONE NOTIFICATION
// =========================================================

const getFacultyNotificationById = async ({
  userId,
  facultyId,
  notificationId,
}) => {
  const recipientId = userId || facultyId;

  if (!isValidObjectId(recipientId)) {
    throw new Error("A valid user ID is required");
  }

  if (!isValidObjectId(notificationId)) {
    throw new Error("Invalid notification ID");
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: recipientId,
  }).populate(
    "claim",
    "claimType status financialYear incentiveAmount"
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};

// =========================================================
// MARK ONE NOTIFICATION AS READ
// =========================================================

const markNotificationAsRead = async ({
  userId,
  facultyId,
  notificationId,
}) => {
  const recipientId = userId || facultyId;

  if (!isValidObjectId(recipientId)) {
    throw new Error("A valid user ID is required");
  }

  if (!isValidObjectId(notificationId)) {
    throw new Error("Invalid notification ID");
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: recipientId,
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();
  }

  return notification;
};

// =========================================================
// MARK ALL NOTIFICATIONS AS READ
// =========================================================

const markAllNotificationsAsRead = async (userId) => {
  if (!isValidObjectId(userId)) {
    throw new Error("A valid user ID is required");
  }

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

// =========================================================
// DELETE ONE NOTIFICATION
// =========================================================

const deleteNotification = async ({
  userId,
  facultyId,
  notificationId,
}) => {
  const recipientId = userId || facultyId;

  if (!isValidObjectId(recipientId)) {
    throw new Error("A valid user ID is required");
  }

  if (!isValidObjectId(notificationId)) {
    throw new Error("Invalid notification ID");
  }

  const result = await Notification.deleteOne({
    _id: notificationId,
    recipient: recipientId,
  });

  if (result.deletedCount === 0) {
    throw new Error("Notification not found");
  }

  return true;
};

// =========================================================
// GET UNREAD NOTIFICATION COUNT
// =========================================================

const getUnreadNotificationCount = async (userId) => {
  if (!isValidObjectId(userId)) {
    throw new Error("A valid user ID is required");
  }

  return Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
};

// =========================================================
// NOTIFY ACTIVE ADMINS
// =========================================================

const notifyActiveAdmins = async ({
  type,
  title,
  message,
  claimId,
  metadata = {},
}) => {
  const admins = await User.find({
    role: "ADMIN",
    accountStatus: "ACTIVE",
  })
    .select("_id")
    .lean();

  const results = await Promise.allSettled(
    admins.map((admin) =>
      createNotification({
        recipient: admin._id,
        type,
        title,
        message,
        claim: claimId,
        metadata,
      })
    )
  );

  const failedCount = results.filter(
    (result) => result.status === "rejected"
  ).length;

  if (failedCount > 0) {
    console.error(
      `Failed to create ${failedCount} admin notification(s).`
    );
  }

  return {
    notifiedCount: results.length - failedCount,
    failedCount,
  };
};

// =========================================================
// CLAIM SUBMITTED — FACULTY CONFIRMATION
// =========================================================

const notifyClaimSubmitted = async ({
  facultyId,
  claimId,
  claimType,
}) => {
  return createNotification({
    recipient: facultyId,
    type: "CLAIM_SUBMITTED",
    title: "Claim submitted",
    message: `Your ${claimType} claim has been submitted successfully.`,
    claim: claimId,
    metadata: {
      claimType,
      event: "CLAIM_SUBMITTED",
    },
  });
};

// =========================================================
// CLAIM SUBMITTED — ADMIN NOTIFICATION
// =========================================================

const notifyAdminsClaimSubmitted = async ({
  facultyId,
  claimId,
  claimType,
}) => {
  const faculty = await User.findById(facultyId)
    .select("fullName employeeId")
    .lean();

  const facultyName =
    faculty?.fullName || "A faculty member";

  return notifyActiveAdmins({
    type: "CLAIM_SUBMITTED",
    title: "New claim submitted",
    message: `${facultyName} has submitted a ${claimType} claim for review.`,
    claimId,
    metadata: {
      facultyId: String(facultyId),
      facultyName,
      claimType,
      event: "CLAIM_SUBMITTED",
    },
  });
};

// =========================================================
// CLAIM APPROVED
// =========================================================

const notifyClaimApproved = async ({
  facultyId,
  claimId,
  claimType,
}) => {
  return createNotification({
    recipient: facultyId,
    type: "CLAIM_APPROVED",
    title: "Claim approved",
    message: `Your ${claimType} claim has been approved.`,
    claim: claimId,
    metadata: {
      claimType,
      event: "CLAIM_APPROVED",
    },
  });
};

// =========================================================
// CLAIM REJECTED
// =========================================================

const notifyClaimRejected = async ({
  facultyId,
  claimId,
  claimType,
  reason = "",
}) => {
  const normalizedReason =
    typeof reason === "string"
      ? reason.trim()
      : "";

  const message = normalizedReason
    ? `Your ${claimType} claim has been rejected. Reason: ${normalizedReason}`
    : `Your ${claimType} claim has been rejected.`;

  return createNotification({
    recipient: facultyId,
    type: "CLAIM_REJECTED",
    title: "Claim rejected",
    message,
    claim: claimId,
    metadata: {
      reason: normalizedReason,
      claimType,
      event: "CLAIM_REJECTED",
    },
  });
};

// =========================================================
// CLAIM RETURNED FOR CORRECTIONS
// =========================================================

const notifyClaimReturned = async ({
  facultyId,
  claimId,
  claimType,
  comment = "",
}) => {
  const normalizedComment =
    typeof comment === "string"
      ? comment.trim()
      : "";

  const message = normalizedComment
    ? `Your ${claimType} claim has been returned for correction. Comment: ${normalizedComment}`
    : `Your ${claimType} claim has been returned for correction.`;

  return createNotification({
    recipient: facultyId,
    type: "CLAIM_RETURNED",
    title: "Claim returned for correction",
    message,
    claim: claimId,
    metadata: {
      comment: normalizedComment,
      claimType,
      event: "CLAIM_RETURNED",
    },
  });
};

// =========================================================
// DOCUMENT UPLOADED
// =========================================================

const notifyDocumentUploaded = async ({
  facultyId,
  claimId,
  documentType,
}) => {
  // Always confirm the upload to the faculty member.
  const facultyResult = await Promise.allSettled([
    createNotification({
      recipient: facultyId,
      type: "DOCUMENT_UPLOADED",
      title: "Document uploaded",
      message: `Your ${documentType} document has been uploaded successfully.`,
      claim: claimId,
      metadata: {
        documentType,
        event: "DOCUMENT_UPLOADED",
      },
    }),
  ]);

  const facultyFailed =
    facultyResult[0].status === "rejected";

  if (facultyFailed) {
    console.error(
      "Failed to create faculty document-upload notification:",
      facultyResult[0].reason?.message
    );
  }

  // Notify admins about supporting documents uploaded for a
  // returned claim. This includes replacement documents.
  let adminResult = {
    notifiedCount: 0,
    failedCount: 0,
  };

  try {
    const claim = await Claim.findOne({
      _id: claimId,
      faculty: facultyId,
    })
      .select("status claimType")
      .lean();

    if (claim && claim.status === "RETURNED") {
      const faculty = await User.findById(facultyId)
        .select("fullName")
        .lean();

      const facultyName =
        faculty?.fullName || "A faculty member";

      adminResult = await notifyActiveAdmins({
        type: "DOCUMENT_UPLOADED",
        title: "Corrected document uploaded",
        message: `${facultyName} uploaded a ${documentType} document for a returned ${claim.claimType} claim.`,
        claimId,
        metadata: {
          facultyId: String(facultyId),
          facultyName,
          documentType,
          claimType: claim.claimType,
          event: "DOCUMENT_UPLOADED",
        },
      });
    }
  } catch (error) {
    console.error(
      "Failed to notify admins about document upload:",
      error.message
    );
  }

  return {
    facultyNotified: !facultyFailed,
    adminNotifiedCount: adminResult.notifiedCount,
    adminNotificationFailures: adminResult.failedCount,
  };
};

// =========================================================
// DOCUMENT REJECTED
// =========================================================

const notifyDocumentRejected = async ({
  facultyId,
  claimId,
  documentId,
  documentType,
  reason,
}) => {
  const normalizedReason =
    typeof reason === "string"
      ? reason.trim()
      : "";

  if (!normalizedReason) {
    throw new Error(
      "A document rejection reason is required"
    );
  }

  return createNotification({
    recipient: facultyId,
    type: "DOCUMENT_REJECTED",
    title: "Supporting document rejected",
    message: `Your ${documentType} document was rejected. Reason: ${normalizedReason}`,
    claim: claimId,
    metadata: {
      documentId: String(documentId),
      documentType,
      reason: normalizedReason,
      event: "DOCUMENT_REJECTED",
    },
  });
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  createNotification,

  // These existing names are retained for compatibility.
  getFacultyNotifications,
  getFacultyNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,

  notifyActiveAdmins,
  notifyClaimSubmitted,
  notifyAdminsClaimSubmitted,
  notifyClaimApproved,
  notifyClaimRejected,
  notifyClaimReturned,
  notifyDocumentUploaded,
  notifyDocumentRejected,
};
