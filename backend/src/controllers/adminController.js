
const path = require("path");
const adminService = require("../services/adminService");
const documentService = require("../services/documentService");

// =====================================================
// HELPER: SEND ERROR RESPONSE
// =====================================================

const handleControllerError = (res, error) => {
  console.error("Admin controller error:", error);

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

// =====================================================
// 1. GET ALL PENDING REGISTRATIONS
// GET /api/admin/registrations
// =====================================================

const getPendingRegistrations = async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    const result = await adminService.getPendingRegistrations({
      page,
      limit,
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Pending registrations retrieved successfully",
      data: result.registrations,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 2. GET REGISTRATION DETAILS
// GET /api/admin/registrations/:id
// =====================================================

const getRegistrationById = async (req, res) => {
  try {
    const user = await adminService.getRegistrationById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Registration details retrieved successfully",
      data: user,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 3. APPROVE REGISTRATION
// PATCH /api/admin/registrations/:id/approve
// =====================================================

const approveRegistration = async (req, res) => {
  try {
    const adminId = req.user.userId;

    const user = await adminService.approveRegistration(
      req.params.id,
      adminId
    );

    return res.status(200).json({
      success: true,
      message: "Faculty registration approved successfully",
      data: user,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 4. REJECT REGISTRATION
// PATCH /api/admin/registrations/:id/reject
// =====================================================

const rejectRegistration = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { rejectionReason } = req.body || {};

    const user = await adminService.rejectRegistration(
      req.params.id,
      adminId,
      rejectionReason
    );

    return res.status(200).json({
      success: true,
      message: "Faculty registration rejected successfully",
      data: user,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 5. GET ADMIN DASHBOARD STATISTICS
// GET /api/admin/dashboard
// =====================================================

const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();

    return res.status(200).json({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 6. GET ALL CLAIMS
// GET /api/admin/claims
// =====================================================

const getAllClaims = async (req, res) => {
  try {
    const {
      page,
      limit,
      status,
      claimType,
      financialYear,
    } = req.query;

    const result = await adminService.getAllClaims({
      page,
      limit,
      status,
      claimType,
      financialYear,
    });

    return res.status(200).json({
      success: true,
      message: "Claims retrieved successfully",
      data: result.claims,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 7. GET CLAIM DETAILS
// GET /api/admin/claims/:claimId
// =====================================================

const getClaimById = async (req, res) => {
  try {
    const claim = await adminService.getClaimById(
      req.params.claimId
    );

    return res.status(200).json({
      success: true,
      message: "Claim details retrieved successfully",
      data: claim,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 8. VIEW CLAIM DOCUMENT
// GET /api/admin/claims/:claimId/documents/:documentId/file
// =====================================================

const viewClaimDocument = async (req, res) => {
  try {
    const { claimId, documentId } = req.params;

    const { document, filePath } =
      await documentService.getAdminClaimDocumentFilePath({
        claimId,
        documentId,
      });

    const safeFilename = path
      .basename(document.originalName || "document")
      .replace(/["\r\n]/g, "_");

    res.setHeader(
      "Content-Type",
      document.mimeType || "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeFilename}"`
    );

    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.sendFile(filePath, (error) => {
      if (error) {
        console.error(
          "Unable to send claim document:",
          error.message
        );

        if (!res.headersSent) {
          handleControllerError(res, error);
        }
      }
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 9. REJECT AN INDIVIDUAL CLAIM DOCUMENT
// PATCH /api/admin/claims/:claimId/documents/:documentId/reject
// =====================================================

const rejectClaimDocument = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { claimId, documentId } = req.params;

    // Accept either field name to support both frontend conventions.
    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim()
        : typeof req.body?.rejectionReason === "string"
          ? req.body.rejectionReason.trim()
          : "";

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required.",
      });
    }

    if (reason.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "The rejection reason cannot exceed 2000 characters.",
      });
    }

    const document = await documentService.rejectDocument({
      adminId,
      claimId,
      documentId,
      reason,
    });

    return res.status(200).json({
      success: true,
      message:
        "Document rejected successfully. The faculty member can upload a replacement.",
      data: document,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 10. APPROVE CLAIM
// PATCH /api/admin/claims/:claimId/approve
// =====================================================

const approveClaim = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { remarks = "" } = req.body || {};

    const claim = await adminService.approveClaim(
      req.params.claimId,
      adminId,
      remarks
    );

    return res.status(200).json({
      success: true,
      message: "Claim approved successfully",
      data: claim,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 11. REJECT CLAIM
// PATCH /api/admin/claims/:claimId/reject
// =====================================================

const rejectClaim = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { remarks } = req.body || {};

    const claim = await adminService.rejectClaim(
      req.params.claimId,
      adminId,
      remarks
    );

    return res.status(200).json({
      success: true,
      message: "Claim rejected successfully",
      data: claim,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// 12. RETURN CLAIM FOR CORRECTIONS
// PATCH /api/admin/claims/:claimId/return
// =====================================================

const returnClaimForCorrection = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { remarks } = req.body || {};

    if (
      typeof remarks !== "string" ||
      !remarks.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Correction comments are required",
      });
    }

    const claim =
      await adminService.returnClaimForCorrection(
        req.params.claimId,
        adminId,
        remarks.trim()
      );

    return res.status(200).json({
      success: true,
      message: "Claim returned to faculty for corrections",
      data: claim,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// =====================================================
// EXPORT CONTROLLERS
// =====================================================

module.exports = {
  getPendingRegistrations,
  getRegistrationById,
  approveRegistration,
  rejectRegistration,
  getDashboardStats,
  getAllClaims,
  getClaimById,
  viewClaimDocument,
  rejectClaimDocument,
  approveClaim,
  rejectClaim,
  returnClaimForCorrection,
};
