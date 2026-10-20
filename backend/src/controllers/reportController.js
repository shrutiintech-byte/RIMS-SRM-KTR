const {
  getFacultyReportSummary,
  getFacultyClaimReport,
  getIncentiveByCategory,
  getIncentiveByFinancialYear,
} = require("../services/reportService");

const {
  successResponse,
  errorResponse,
} = require("../utils/responseHelpers");

/*
 * Get overall report summary.
 *
 * GET /api/reports/summary
 */
const getReportSummary = async (req, res) => {
  try {
    const facultyId = req.user.userId;

    const summary =
      await getFacultyReportSummary(
        facultyId,
        {
          financialYear:
            req.query.financialYear,
          claimType:
            req.query.claimType,
        }
      );

    return successResponse(
      res,
      200,
      "Report summary retrieved successfully",
      {
        summary,
      }
    );
  } catch (error) {
    console.error(
      "Get report summary error:",
      error.message
    );

    if (
      error.message ===
        "Faculty ID is required" ||
      error.message ===
        "Invalid faculty ID"
    ) {
      return errorResponse(
        res,
        400,
        error.message
      );
    }

    return errorResponse(
      res,
      500,
      "Unable to retrieve report summary"
    );
  }
};

/*
 * Get claim-wise report.
 *
 * GET /api/reports/claims
 */
const getClaimReport = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const claims =
      await getFacultyClaimReport(
        facultyId,
        {
          financialYear:
            req.query.financialYear,
          claimType:
            req.query.claimType,
          status:
            req.query.status,
        }
      );

    return successResponse(
      res,
      200,
      "Claim report retrieved successfully",
      {
        claims,
      }
    );
  } catch (error) {
    console.error(
      "Get claim report error:",
      error.message
    );

    if (
      error.message ===
        "Faculty ID is required" ||
      error.message ===
        "Invalid faculty ID"
    ) {
      return errorResponse(
        res,
        400,
        error.message
      );
    }

    return errorResponse(
      res,
      500,
      "Unable to retrieve claim report"
    );
  }
};

/*
 * Get approved incentive totals by category.
 *
 * GET /api/reports/by-category
 */
const getByCategory = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const report =
      await getIncentiveByCategory(
        facultyId,
        req.query.financialYear
      );

    return successResponse(
      res,
      200,
      "Category report retrieved successfully",
      {
        report,
      }
    );
  } catch (error) {
    console.error(
      "Get category report error:",
      error.message
    );

    if (
      error.message ===
        "Faculty ID is required" ||
      error.message ===
        "Invalid faculty ID"
    ) {
      return errorResponse(
        res,
        400,
        error.message
      );
    }

    return errorResponse(
      res,
      500,
      "Unable to retrieve category report"
    );
  }
};

/*
 * Get approved incentive totals by financial year.
 *
 * GET /api/reports/by-financial-year
 */
const getByFinancialYear = async (
  req,
  res
) => {
  try {
    const facultyId = req.user.userId;

    const report =
      await getIncentiveByFinancialYear(
        facultyId
      );

    return successResponse(
      res,
      200,
      "Financial year report retrieved successfully",
      {
        report,
      }
    );
  } catch (error) {
    console.error(
      "Get financial year report error:",
      error.message
    );

    if (
      error.message ===
        "Faculty ID is required" ||
      error.message ===
        "Invalid faculty ID"
    ) {
      return errorResponse(
        res,
        400,
        error.message
      );
    }

    return errorResponse(
      res,
      500,
      "Unable to retrieve financial year report"
    );
  }
};

module.exports = {
  getReportSummary,
  getClaimReport,
  getByCategory,
  getByFinancialYear,
};