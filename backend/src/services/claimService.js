
const mongoose = require("mongoose");

const Claim = require("../models/Claim");

const {
  createNotification,
  notifyClaimSubmitted,
  notifyAdminsClaimSubmitted,
} = require("./notificationService");

const {
  analyzeClaim,
  getFacultyForCorrectionEmail,
} = require("./claimAnalyzer");

const { sendEmail } = require("./emailService");

const {
  isValidClaimType,
  isValidFinancialYear,
  canEditClaim,
  canSubmitClaim,
  cleanFormData,
} = require("../utils/claimHelpers");

const {
  calculateResearchProjectIncentive,
} = require("../utils/researchProjectIncentive");

const {
  calculateEContentIncentive,
} = require("../utils/eContentIncentive");

// =========================================================
// CONSTANTS
// =========================================================

const CLAIM_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RETURNED",
];

const SUPPORTED_CALCULATED_CLAIM_TYPES = [
  "RESEARCH_PROJECT",
  "E_CONTENT",
];

// =========================================================
// APPLICATION ERROR HELPER
// =========================================================

const createApplicationError = (
  message,
  statusCode = 400,
  code = undefined
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
};

// =========================================================
// ID VALIDATION
// =========================================================

const validateObjectId = (value, fieldName) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    throw createApplicationError(
      `${fieldName} is required`,
      400,
      "REQUIRED_ID"
    );
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createApplicationError(
      `Invalid ${fieldName.toLowerCase()}`,
      400,
      "INVALID_ID"
    );
  }

  return new mongoose.Types.ObjectId(value);
};

// =========================================================
// BOOLEAN HELPER
// =========================================================

const normalizeBoolean = (value) => {
  if (value === true) return true;
  if (value === false) return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "yes"].includes(normalized)) {
      return true;
    }

    if (["false", "no"].includes(normalized)) {
      return false;
    }
  }

  return false;
};

// =========================================================
// FORM DATA VALIDATION
// =========================================================

const hasFormData = (formData) => {
  return Boolean(
    formData &&
      typeof formData === "object" &&
      !Array.isArray(formData) &&
      Object.keys(formData).length > 0
  );
};

// =========================================================
// RESEARCH PROJECT CALCULATION READINESS
// =========================================================

const isResearchCalculationReady = (formData) => {
  if (
    !formData ||
    typeof formData !== "object" ||
    Array.isArray(formData)
  ) {
    return false;
  }

  const grantCredited = formData.grantCredited;

  if (
    grantCredited === "" ||
    grantCredited === null ||
    grantCredited === undefined ||
    typeof grantCredited === "boolean" ||
    !Number.isFinite(Number(grantCredited)) ||
    Number(grantCredited) <= 0
  ) {
    return false;
  }

  if (formData.projectRole === "PI") {
    return true;
  }

  if (formData.projectRole === "CoPI") {
    return (
      Array.isArray(
        formData.coPrincipalInvestigators
      ) &&
      formData.coPrincipalInvestigators.every(
        (name) =>
          typeof name === "string" &&
          name.trim().length > 0
      )
    );
  }

  return false;
};

// =========================================================
// E-CONTENT ELIGIBILITY
// =========================================================

/**
 * The backend calculator is the source of truth.
 * The client-provided incentiveAmount is never trusted.
 */
const getEContentCalculation = (formData) => {
  const result = calculateEContentIncentive(
    formData || {}
  );

  if (
    !result ||
    typeof result.eligible !== "boolean" ||
    !Array.isArray(result.reasons) ||
    !Number.isFinite(result.amount) ||
    result.amount < 0
  ) {
    throw createApplicationError(
      "The E-Content incentive calculator returned an invalid result.",
      500,
      "INVALID_E_CONTENT_CALCULATION"
    );
  }

  if (!result.eligible && result.amount !== 0) {
    throw createApplicationError(
      "The E-Content calculator returned an amount for an ineligible claim.",
      500,
      "INVALID_E_CONTENT_CALCULATION"
    );
  }

  if (result.eligible && result.amount <= 0) {
    throw createApplicationError(
      "The E-Content calculator returned an invalid eligible amount.",
      500,
      "INVALID_E_CONTENT_CALCULATION"
    );
  }

  return result;
};

// =========================================================
// POLICY-BASED CLAIM CALCULATION
// =========================================================

/**
 * Supported calculation categories:
 * - RESEARCH_PROJECT
 * - E_CONTENT
 *
 * Incomplete drafts may be saved with an amount of zero.
 * All amounts are calculated on the backend.
 *
 * Other claim categories must not be enabled for submission
 * until their official incentive calculations are verified.
 */
const calculateClaimAmount = (
  claimType,
  formData
) => {
  if (claimType === "RESEARCH_PROJECT") {
    if (!isResearchCalculationReady(formData)) {
      return 0;
    }

    const calculatedAmount =
      calculateResearchProjectIncentive(formData);

    if (
      !Number.isFinite(calculatedAmount) ||
      calculatedAmount < 0
    ) {
      throw createApplicationError(
        "The Research Project incentive calculation is invalid.",
        400,
        "INVALID_INCENTIVE_CALCULATION"
      );
    }

    return calculatedAmount;
  }

  if (claimType === "E_CONTENT") {
    const result = getEContentCalculation(formData);

    return result.eligible ? result.amount : 0;
  }

  // Ignore any amount supplied by the frontend.
  return 0;
};

// =========================================================
// GET FACULTY CLAIMS
// =========================================================

const getFacultyClaims = async (
  facultyId,
  filters = {}
) => {
  const facultyObjectId = validateObjectId(
    facultyId,
    "Faculty ID"
  );

  const query = {
    faculty: facultyObjectId,
  };

  if (filters.status) {
    if (!CLAIM_STATUSES.includes(filters.status)) {
      throw createApplicationError(
        "Invalid claim status filter",
        400,
        "INVALID_CLAIM_STATUS"
      );
    }

    query.status = filters.status;
  }

  if (filters.claimType) {
    if (!isValidClaimType(filters.claimType)) {
      throw createApplicationError(
        "Invalid claim type filter",
        400,
        "INVALID_CLAIM_TYPE"
      );
    }

    query.claimType = filters.claimType;
  }

  if (filters.financialYear) {
    if (!isValidFinancialYear(filters.financialYear)) {
      throw createApplicationError(
        "Invalid financial year filter",
        400,
        "INVALID_FINANCIAL_YEAR"
      );
    }

    query.financialYear = filters.financialYear;
  }

  return Claim.find(query)
    .populate(
      "documents",
      "documentType originalName fileSize mimeType status createdAt"
    )
    .sort({ updatedAt: -1 });
};

// =========================================================
// GET SINGLE FACULTY CLAIM
// =========================================================

const getFacultyClaimById = async ({
  facultyId,
  claimId,
}) => {
  const facultyObjectId = validateObjectId(
    facultyId,
    "Faculty ID"
  );

  const claimObjectId = validateObjectId(
    claimId,
    "Claim ID"
  );

  const claim = await Claim.findOne({
    _id: claimObjectId,
    faculty: facultyObjectId,
  }).populate(
    "documents",
    "documentType originalName storedName filePath fileSize mimeType status reviewComment createdAt"
  );

  if (!claim) {
    throw createApplicationError(
      "Claim not found",
      404,
      "CLAIM_NOT_FOUND"
    );
  }

  return claim;
};

// =========================================================
// CREATE CLAIM DRAFT
// =========================================================

const createClaimDraft = async ({
  facultyId,
  claimType,
  financialYear,
  formData,
  incentiveAmount: _clientIncentiveAmount,
  declarationAccepted = false,
}) => {
  const facultyObjectId = validateObjectId(
    facultyId,
    "Faculty ID"
  );

  if (!isValidClaimType(claimType)) {
    throw createApplicationError(
      "Invalid claim type",
      400,
      "INVALID_CLAIM_TYPE"
    );
  }

  if (!isValidFinancialYear(financialYear)) {
    throw createApplicationError(
      "Invalid financial year",
      400,
      "INVALID_FINANCIAL_YEAR"
    );
  }

  if (
    formData !== undefined &&
    formData !== null &&
    (
      typeof formData !== "object" ||
      Array.isArray(formData)
    )
  ) {
    throw createApplicationError(
      "Invalid claim form data",
      400,
      "INVALID_FORM_DATA"
    );
  }

  const cleanedData = cleanFormData(formData || {});

  const calculatedAmount = calculateClaimAmount(
    claimType,
    cleanedData
  );

  const claim = await Claim.create({
    faculty: facultyObjectId,
    claimType,
    status: "DRAFT",
    financialYear,
    formData: cleanedData,
    incentiveAmount: calculatedAmount,
    declarationAccepted:
      normalizeBoolean(declarationAccepted),
    draftSavedAt: new Date(),
  });

  return claim;
};

// =========================================================
// UPDATE CLAIM
// =========================================================

const updateClaim = async ({
  facultyId,
  claimId,
  claimType,
  financialYear,
  formData,
  incentiveAmount: _clientIncentiveAmount,
  declarationAccepted,
}) => {
  const facultyObjectId = validateObjectId(
    facultyId,
    "Faculty ID"
  );

  const claimObjectId = validateObjectId(
    claimId,
    "Claim ID"
  );

  const claim = await Claim.findOne({
    _id: claimObjectId,
    faculty: facultyObjectId,
  });

  if (!claim) {
    throw createApplicationError(
      "Claim not found",
      404,
      "CLAIM_NOT_FOUND"
    );
  }

  if (!canEditClaim(claim.status)) {
    throw createApplicationError(
      "This claim can no longer be edited",
      400,
      "CLAIM_NOT_EDITABLE"
    );
  }

  const originalStatus = claim.status;

  if (claimType !== undefined) {
    if (!isValidClaimType(claimType)) {
      throw createApplicationError(
        "Invalid claim type",
        400,
        "INVALID_CLAIM_TYPE"
      );
    }

    claim.claimType = claimType;
  }

  if (financialYear !== undefined) {
    if (!isValidFinancialYear(financialYear)) {
      throw createApplicationError(
        "Invalid financial year",
        400,
        "INVALID_FINANCIAL_YEAR"
      );
    }

    claim.financialYear = financialYear;
  }

  if (formData !== undefined) {
    if (
      !formData ||
      typeof formData !== "object" ||
      Array.isArray(formData)
    ) {
      throw createApplicationError(
        "Invalid claim form data",
        400,
        "INVALID_FORM_DATA"
      );
    }

    claim.formData = cleanFormData(formData);
  }

  // Always calculate from the latest saved form data.
  claim.incentiveAmount = calculateClaimAmount(
    claim.claimType,
    claim.formData
  );

  if (declarationAccepted !== undefined) {
    claim.declarationAccepted =
      normalizeBoolean(declarationAccepted);
  }

  if (originalStatus === "DRAFT") {
    claim.status = "DRAFT";
    claim.draftSavedAt = new Date();

    claim.reviewedBy = null;
    claim.reviewedAt = null;
    claim.reviewComment = "";
    claim.rejectedAt = null;
    claim.approvedAt = null;
  } else if (originalStatus === "RETURNED") {
    // Preserve the existing returned-claim workflow.
    // Resubmission is handled separately by submitClaim().
    claim.status = "RETURNED";
    claim.draftSavedAt = null;

    claim.rejectedAt = null;
    claim.approvedAt = null;
  }

  await claim.save();

  return claim;
};

// =========================================================
// SUBMIT / RESUBMIT CLAIM
// =========================================================

const submitClaim = async ({
  facultyId,
  claimId,
}) => {
  const facultyObjectId = validateObjectId(
    facultyId,
    "Faculty ID"
  );

  const claimObjectId = validateObjectId(
    claimId,
    "Claim ID"
  );

  const claim = await Claim.findOne({
    _id: claimObjectId,
    faculty: facultyObjectId,
  });

  if (!claim) {
    throw createApplicationError(
      "Claim not found",
      404,
      "CLAIM_NOT_FOUND"
    );
  }

  if (!canSubmitClaim(claim.status)) {
    throw createApplicationError(
      "This claim cannot be submitted in its current status",
      400,
      "CLAIM_NOT_SUBMITTABLE"
    );
  }

  if (!claim.declarationAccepted) {
    throw createApplicationError(
      "You must accept the declaration before submitting the claim",
      400,
      "DECLARATION_REQUIRED"
    );
  }

  if (!hasFormData(claim.formData)) {
    throw createApplicationError(
      "Claim information is required before submission",
      400,
      "CLAIM_FORM_REQUIRED"
    );
  }

  // -------------------------------------------------------
  // BLOCK UNVERIFIED INCENTIVE CATEGORIES
  // -------------------------------------------------------

  if (
    !SUPPORTED_CALCULATED_CLAIM_TYPES.includes(
      claim.claimType
    )
  ) {
    throw createApplicationError(
      `Submission is temporarily unavailable for ${claim.claimType.replace(
        /_/g,
        " "
      )} because its SRM policy-based incentive calculation has not yet been verified. Your draft has been preserved.`,
      400,
      "INCENTIVE_CALCULATION_UNAVAILABLE"
    );
  }

  let finalAmount = 0;

  // -------------------------------------------------------
  // RESEARCH PROJECT VALIDATION AND CALCULATION
  // -------------------------------------------------------

  if (claim.claimType === "RESEARCH_PROJECT") {
    const fundingScheme =
      claim.formData?.fundingScheme;

    if (
      typeof fundingScheme !== "string" ||
      !fundingScheme.trim()
    ) {
      throw createApplicationError(
        "Funding scheme is required before submitting a Research Project claim.",
        400,
        "FUNDING_SCHEME_REQUIRED"
      );
    }

    if (!isResearchCalculationReady(claim.formData)) {
      throw createApplicationError(
        "Complete the Research Project grant amount, project role, and Co-PI details before submitting.",
        400,
        "RESEARCH_PROJECT_DETAILS_REQUIRED"
      );
    }

    finalAmount =
      calculateResearchProjectIncentive(
        claim.formData
      );

    if (
      !Number.isFinite(finalAmount) ||
      finalAmount <= 0
    ) {
      throw createApplicationError(
        "The Research Project incentive amount is invalid.",
        400,
        "INVALID_INCENTIVE_CALCULATION"
      );
    }
  }

  // -------------------------------------------------------
  // E-CONTENT VALIDATION AND CALCULATION
  // -------------------------------------------------------

  if (claim.claimType === "E_CONTENT") {
    const eContentResult = getEContentCalculation(
      claim.formData
    );

    if (!eContentResult.eligible) {
      const reasonList = eContentResult.reasons
        .map(
          (reason, index) =>
            `${index + 1}. ${reason}`
        )
        .join("\n");

      throw createApplicationError(
        `The E-Content claim does not meet all eligibility requirements:\n${reasonList}`,
        400,
        "E_CONTENT_NOT_ELIGIBLE"
      );
    }

    finalAmount = eContentResult.amount;
  }

  // Never use the frontend-supplied amount.
  claim.incentiveAmount = finalAmount;

  // -------------------------------------------------------
  // ANALYZE CLAIM BEFORE SUBMISSION
  // -------------------------------------------------------

  let analysis;

  try {
    analysis = await analyzeClaim(claim);
  } catch (error) {
    console.error(
      "Claim analysis failed:",
      error.message || error
    );

    throw createApplicationError(
      "Claim validation could not be completed. Please try again later.",
      500,
      "CLAIM_ANALYSIS_FAILED"
    );
  }

  if (
    !analysis ||
    typeof analysis.valid !== "boolean"
  ) {
    throw createApplicationError(
      "Claim validation returned an invalid response. Please try again later.",
      500,
      "CLAIM_ANALYSIS_FAILED"
    );
  }

  // -------------------------------------------------------
  // INVALID CLAIM: NOTIFY FACULTY AND PROVIDE CORRECTIONS
  // -------------------------------------------------------

  if (!analysis.valid) {
    const findings = Array.isArray(
      analysis.findings
    )
      ? analysis.findings
      : [];

    const correctionList = findings
      .map(
        (finding, index) =>
          `${index + 1}. ${
            finding.message ||
            "Please review this field."
          }`
      )
      .join("\n");

    const notificationMessage =
      `Your ${claim.claimType.replace(/_/g, " ")} claim ` +
      `needs ${findings.length} correction(s). ` +
      "Open the claim to review the required changes.";

    try {
      await createNotification({
        recipient: claim.faculty,
        type: "CLAIM_VALIDATION_FAILED",
        title: "Claim needs corrections",
        message: notificationMessage,
        claim: claim._id,
        metadata: {
          claimType: claim.claimType,
          findings,
          analyzedAt: analysis.analyzedAt,
        },
      });
    } catch (error) {
      console.error(
        "Claim correction notification failed:",
        error.message || error
      );
    }

    // Email is optional and must not block validation feedback.
    if (
      process.env.EMAIL_NOTIFICATIONS_ENABLED === "true"
    ) {
      try {
        const faculty =
          await getFacultyForCorrectionEmail(
            claim.faculty
          );

        const preferences =
          faculty?.notificationPreferences || {};

        const emailAllowed =
          Boolean(faculty?.email) &&
          preferences.emailNotifications !== false &&
          preferences.claimUpdates !== false;

        if (emailAllowed) {
          const facultyName =
            faculty.fullName || "Faculty member";

          const emailText = [
            `Dear ${facultyName},`,
            "",
            `Your ${claim.claimType.replace(
              /_/g,
              " "
            )} claim requires corrections before it can be submitted.`,
            "",
            "Please correct the following issues:",
            "",
            correctionList ||
              "Please review the claim details.",
            "",
            "After making the corrections, review your supporting documents and submit the claim again.",
            "",
            "Final claim review and approval remain subject to the administrator's review.",
            "",
            "Regards,",
            "SRM RIMS",
          ].join("\n");

          await sendEmail({
            to: faculty.email,
            subject:
              "SRM RIMS: Corrections required for your claim",
            text: emailText,
          });
        }
      } catch (error) {
        console.error(
          "Claim correction email failed:",
          error.message || error
        );
      }
    }

    const validationError = createApplicationError(
      `Claim needs corrections:\n${
        correctionList ||
        "Please review the claim details."
      }`,
      400,
      "CLAIM_VALIDATION_FAILED"
    );

    validationError.details = findings;
    validationError.validation = analysis;

    throw validationError;
  }

  // -------------------------------------------------------
  // VALID CLAIM: SAVE SUBMISSION
  // -------------------------------------------------------

  claim.status = "SUBMITTED";
  claim.submittedAt = new Date();
  claim.draftSavedAt = null;

  // Clear previous decision information on resubmission.
  claim.reviewedBy = null;
  claim.reviewedAt = null;
  claim.reviewComment = "";
  claim.rejectedAt = null;
  claim.approvedAt = null;

  await claim.save();

  // -------------------------------------------------------
  // NOTIFY FACULTY AND ADMIN
  // -------------------------------------------------------

  const notificationResults = await Promise.allSettled([
    notifyClaimSubmitted({
      facultyId: claim.faculty,
      claimId: claim._id,
      claimType: claim.claimType,
    }),

    notifyAdminsClaimSubmitted({
      facultyId: claim.faculty,
      claimId: claim._id,
      claimType: claim.claimType,
    }),
  ]);

  notificationResults.forEach((result, index) => {
    if (result.status === "rejected") {
      const recipientType =
        index === 0 ? "faculty" : "admin";

      console.error(
        `Claim submission ${recipientType} notification failed:`,
        result.reason?.message || result.reason
      );
    }
  });

  return claim;
};

// =========================================================
// DELETE DRAFT
// =========================================================

const deleteDraft = async ({
  facultyId,
  claimId,
}) => {
  const facultyObjectId = validateObjectId(
    facultyId,
    "Faculty ID"
  );

  const claimObjectId = validateObjectId(
    claimId,
    "Claim ID"
  );

  const claim = await Claim.findOne({
    _id: claimObjectId,
    faculty: facultyObjectId,
  });

  if (!claim) {
    throw createApplicationError(
      "Claim not found",
      404,
      "CLAIM_NOT_FOUND"
    );
  }

  if (claim.status !== "DRAFT") {
    throw createApplicationError(
      "Only draft claims can be deleted",
      400,
      "CLAIM_NOT_DRAFT"
    );
  }

  await Claim.deleteOne({
    _id: claim._id,
    faculty: facultyObjectId,
    status: "DRAFT",
  });

  return true;
};

// =========================================================
// FACULTY CLAIM SUMMARY
// =========================================================

const getFacultyClaimSummary = async (facultyId) => {
  const facultyObjectId = validateObjectId(
    facultyId,
    "Faculty ID"
  );

  const [
    totalClaims,
    submittedClaims,
    underReviewClaims,
    approvedClaims,
    rejectedClaims,
    draftClaims,
    returnedClaims,
  ] = await Promise.all([
    Claim.countDocuments({
      faculty: facultyObjectId,
    }),

    Claim.countDocuments({
      faculty: facultyObjectId,
      status: "SUBMITTED",
    }),

    Claim.countDocuments({
      faculty: facultyObjectId,
      status: "UNDER_REVIEW",
    }),

    Claim.countDocuments({
      faculty: facultyObjectId,
      status: "APPROVED",
    }),

    Claim.countDocuments({
      faculty: facultyObjectId,
      status: "REJECTED",
    }),

    Claim.countDocuments({
      faculty: facultyObjectId,
      status: "DRAFT",
    }),

    Claim.countDocuments({
      faculty: facultyObjectId,
      status: "RETURNED",
    }),
  ]);

  const approvedAmountResult = await Claim.aggregate([
    {
      $match: {
        faculty: facultyObjectId,
        status: "APPROVED",
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$incentiveAmount",
        },
      },
    },
  ]);

  const approvedAmount =
    approvedAmountResult.length > 0
      ? approvedAmountResult[0].total
      : 0;

  return {
    totalClaims,
    submittedClaims,
    underReviewClaims,
    approvedClaims,
    rejectedClaims,
    draftClaims,
    returnedClaims,
    approvedAmount,
  };
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  createClaimDraft,
  getFacultyClaims,
  getFacultyClaimById,
  updateClaim,
  submitClaim,
  deleteDraft,
  getFacultyClaimSummary,
};
