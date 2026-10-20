
const mongoose = require("mongoose");

const {
  createClaimDraft,
  getFacultyClaims,
  getFacultyClaimById,
  updateClaim,
  submitClaim,
  deleteDraft,
  getFacultyClaimSummary,
} = require("../services/claimService");

const {
  successResponse,
  errorResponse,
} = require("../utils/responseHelpers");

// =========================================================
// ERROR RESPONSE HELPERS
// =========================================================

const getErrorStatus = (error, fallback = 500) => {
  const statusCode = Number(error?.statusCode);

  if (
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
  ) {
    return statusCode;
  }

  if (error?.name === "ValidationError") {
    return 400;
  }

  if (error?.name === "CastError") {
    return 400;
  }

  if (error?.code === 11000) {
    return 409;
  }

  return fallback;
};

const isNotFoundError = (error) =>
  error?.code === "CLAIM_NOT_FOUND" ||
  error?.message === "Claim not found";

const sendSubmissionError = (res, error) => {
  const statusCode = getErrorStatus(error, 500);

  const response = {
    success: false,
    message:
      statusCode >= 500
        ? "Unable to submit claim due to a server error."
        : error.message || "Unable to submit claim.",
  };

  if (error?.code) {
    response.code = error.code;
  }

  if (Array.isArray(error?.details)) {
    response.details = error.details;
  }

  if (error?.validation) {
    response.validation = error.validation;
  }

  return res.status(statusCode).json(response);
};

// =========================================================
// CREATE CLAIM DRAFT
// POST /api/claims
// =========================================================

const createDraft = async (req, res) => {
  try {
    const facultyId = req.user.userId;

    const {
      claimType,
      financialYear,
      formData,
      incentiveAmount,
      declarationAccepted,
    } = req.body;

    if (!claimType || !financialYear) {
      return errorResponse(
        res,
        400,
        "Claim type and financial year are required"
      );
    }

    const claim = await createClaimDraft({
      facultyId,
      claimType,
      financialYear,
      formData,
      incentiveAmount,
      declarationAccepted,
    });

    return successResponse(
      res,
      201,
      "Claim draft created successfully",
      { claim }
    );
  } catch (error) {
    console.error(
      "Create claim draft error:",
      error.message || error
    );

    const statusCode = getErrorStatus(error, 500);

    return errorResponse(
      res,
      statusCode,
      statusCode >= 500
        ? "Unable to create claim draft"
        : error.message || "Unable to create claim draft"
    );
  }
};

// =========================================================
// GET FACULTY CLAIMS
// GET /api/claims
// =========================================================

const getClaims = async (req, res) => {
  try {
    const facultyId = req.user.userId;

    const claims = await getFacultyClaims(facultyId, {
      status: req.query.status,
      claimType: req.query.claimType,
      financialYear: req.query.financialYear,
    });

    return successResponse(
      res,
      200,
      "Claims retrieved successfully",
      { claims }
    );
  } catch (error) {
    console.error(
      "Get claims error:",
      error.message || error
    );

    const statusCode = getErrorStatus(error, 500);

    return errorResponse(
      res,
      statusCode,
      statusCode >= 500
        ? "Unable to retrieve claims"
        : error.message || "Unable to retrieve claims"
    );
  }
};

// =========================================================
// GET SINGLE CLAIM
// GET /api/claims/:claimId
// =========================================================

const getClaimById = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { claimId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return errorResponse(
        res,
        400,
        "Invalid claim ID"
      );
    }

    const claim = await getFacultyClaimById({
      facultyId,
      claimId,
    });

    return successResponse(
      res,
      200,
      "Claim retrieved successfully",
      { claim }
    );
  } catch (error) {
    console.error(
      "Get claim by ID error:",
      error.message || error
    );

    if (isNotFoundError(error)) {
      return errorResponse(
        res,
        404,
        "Claim not found"
      );
    }

    const statusCode = getErrorStatus(error, 500);

    return errorResponse(
      res,
      statusCode,
      statusCode >= 500
        ? "Unable to retrieve claim"
        : error.message || "Unable to retrieve claim"
    );
  }
};

// =========================================================
// UPDATE CLAIM
// PATCH /api/claims/:claimId
// =========================================================

const updateClaimController = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { claimId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return errorResponse(
        res,
        400,
        "Invalid claim ID"
      );
    }

    const {
      claimType,
      financialYear,
      formData,
      incentiveAmount,
      declarationAccepted,
    } = req.body;

    const claim = await updateClaim({
      facultyId,
      claimId,
      claimType,
      financialYear,
      formData,
      incentiveAmount,
      declarationAccepted,
    });

    return successResponse(
      res,
      200,
      "Claim updated successfully",
      { claim }
    );
  } catch (error) {
    console.error(
      "Update claim error:",
      error.message || error
    );

    if (isNotFoundError(error)) {
      return errorResponse(
        res,
        404,
        "Claim not found"
      );
    }

    const statusCode = getErrorStatus(error, 500);

    return errorResponse(
      res,
      statusCode,
      statusCode >= 500
        ? "Unable to update claim"
        : error.message || "Unable to update claim"
    );
  }
};

// =========================================================
// SUBMIT / RESUBMIT CLAIM
// POST /api/claims/:claimId/submit
// =========================================================

const submitClaimController = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { claimId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return errorResponse(
        res,
        400,
        "Invalid claim ID"
      );
    }

    const claim = await submitClaim({
      facultyId,
      claimId,
    });

    return successResponse(
      res,
      200,
      "Claim submitted successfully",
      { claim }
    );
  } catch (error) {
    console.error(
      "Submit claim error:",
      error.message || error
    );

    if (isNotFoundError(error)) {
      return errorResponse(
        res,
        404,
        "Claim not found"
      );
    }

    // Preserve validation findings for the faculty UI.
    // Hide internal error messages for server failures.
    return sendSubmissionError(res, error);
  }
};

// =========================================================
// DELETE CLAIM DRAFT
// DELETE /api/claims/:claimId
// =========================================================

const deleteClaimDraft = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    const { claimId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return errorResponse(
        res,
        400,
        "Invalid claim ID"
      );
    }

    await deleteDraft({
      facultyId,
      claimId,
    });

    return successResponse(
      res,
      200,
      "Draft deleted successfully"
    );
  } catch (error) {
    console.error(
      "Delete draft error:",
      error.message || error
    );

    if (isNotFoundError(error)) {
      return errorResponse(
        res,
        404,
        "Claim not found"
      );
    }

    const statusCode = getErrorStatus(error, 500);

    return errorResponse(
      res,
      statusCode,
      statusCode >= 500
        ? "Unable to delete claim draft"
        : error.message || "Unable to delete claim draft"
    );
  }
};

// =========================================================
// GET FACULTY CLAIM SUMMARY
// GET /api/claims/summary
// =========================================================

const getClaimSummary = async (req, res) => {
  try {
    const facultyId = req.user.userId;

    const summary = await getFacultyClaimSummary(
      facultyId
    );

    return successResponse(
      res,
      200,
      "Claim summary retrieved successfully",
      { summary }
    );
  } catch (error) {
    console.error(
      "Get claim summary error:",
      error.message || error
    );

    const statusCode = getErrorStatus(error, 500);

    return errorResponse(
      res,
      statusCode,
      statusCode >= 500
        ? "Unable to retrieve claim summary"
        : error.message || "Unable to retrieve claim summary"
    );
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  createDraft,
  getClaims,
  getClaimById,
  updateClaimController,
  submitClaimController,
  deleteClaimDraft,
  getClaimSummary,
};
