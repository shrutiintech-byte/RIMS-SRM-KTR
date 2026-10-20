const mongoose = require("mongoose");

const Claim = require("../models/Claim");

/*
 * Validate faculty ID.
 */
const validateFacultyId = (facultyId) => {
  if (!facultyId) {
    throw new Error("Faculty ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(facultyId)) {
    throw new Error("Invalid faculty ID");
  }
};

/*
 * Get overall report summary for a faculty member.
 *
 * All values are calculated from actual MongoDB claims.
 */
const getFacultyReportSummary = async (
  facultyId,
  filters = {}
) => {
  validateFacultyId(facultyId);

  const match = {
    faculty: new mongoose.Types.ObjectId(facultyId),
  };

  if (filters.financialYear) {
    match.financialYear = filters.financialYear;
  }

  if (filters.claimType) {
    match.claimType = filters.claimType;
  }

  const summary = await Claim.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: null,

        totalClaims: {
          $sum: 1,
        },

        draftClaims: {
          $sum: {
            $cond: [
              { $eq: ["$status", "DRAFT"] },
              1,
              0,
            ],
          },
        },

        submittedClaims: {
          $sum: {
            $cond: [
              { $eq: ["$status", "SUBMITTED"] },
              1,
              0,
            ],
          },
        },

        underReviewClaims: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$status",
                  "UNDER_REVIEW",
                ],
              },
              1,
              0,
            ],
          },
        },

        approvedClaims: {
          $sum: {
            $cond: [
              { $eq: ["$status", "APPROVED"] },
              1,
              0,
            ],
          },
        },

        rejectedClaims: {
          $sum: {
            $cond: [
              { $eq: ["$status", "REJECTED"] },
              1,
              0,
            ],
          },
        },

        returnedClaims: {
          $sum: {
            $cond: [
              { $eq: ["$status", "RETURNED"] },
              1,
              0,
            ],
          },
        },

        totalIncentiveRequested: {
          $sum: "$incentiveAmount",
        },

        totalIncentiveApproved: {
          $sum: {
            $cond: [
              { $eq: ["$status", "APPROVED"] },
              "$incentiveAmount",
              0,
            ],
          },
        },
      },
    },
  ]);

  if (summary.length === 0) {
    return {
      totalClaims: 0,
      draftClaims: 0,
      submittedClaims: 0,
      underReviewClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0,
      returnedClaims: 0,
      totalIncentiveRequested: 0,
      totalIncentiveApproved: 0,
    };
  }

  const result = summary[0];

  return {
    totalClaims: result.totalClaims || 0,
    draftClaims: result.draftClaims || 0,
    submittedClaims: result.submittedClaims || 0,
    underReviewClaims:
      result.underReviewClaims || 0,
    approvedClaims:
      result.approvedClaims || 0,
    rejectedClaims:
      result.rejectedClaims || 0,
    returnedClaims:
      result.returnedClaims || 0,
    totalIncentiveRequested:
      result.totalIncentiveRequested || 0,
    totalIncentiveApproved:
      result.totalIncentiveApproved || 0,
  };
};

/*
 * Get claim-wise report data.
 *
 * Returns actual claim records belonging
 * to the logged-in faculty member.
 */
const getFacultyClaimReport = async (
  facultyId,
  filters = {}
) => {
  validateFacultyId(facultyId);

  const query = {
    faculty: facultyId,
  };

  if (filters.financialYear) {
    query.financialYear =
      filters.financialYear;
  }

  if (filters.claimType) {
    query.claimType = filters.claimType;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  return Claim.find(query)
    .select(
      [
        "claimType",
        "status",
        "financialYear",
        "formData",
        "incentiveAmount",
        "declarationAccepted",
        "submittedAt",
        "approvedAt",
        "rejectedAt",
        "reviewedAt",
        "reviewComment",
        "createdAt",
        "updatedAt",
      ].join(" ")
    )
    .sort({
      createdAt: -1,
    });
};

/*
 * Get approved incentive totals grouped by
 * claim category.
 */
const getIncentiveByCategory = async (
  facultyId,
  financialYear
) => {
  validateFacultyId(facultyId);

  const match = {
    faculty:
      new mongoose.Types.ObjectId(facultyId),
    status: "APPROVED",
  };

  if (financialYear) {
    match.financialYear =
      financialYear;
  }

  return Claim.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: "$claimType",

        claimCount: {
          $sum: 1,
        },

        totalAmount: {
          $sum: "$incentiveAmount",
        },
      },
    },

    {
      $sort: {
        totalAmount: -1,
      },
    },
  ]);
};

/*
 * Get approved incentive totals grouped
 * by financial year.
 */
const getIncentiveByFinancialYear = async (
  facultyId
) => {
  validateFacultyId(facultyId);

  return Claim.aggregate([
    {
      $match: {
        faculty:
          new mongoose.Types.ObjectId(
            facultyId
          ),
        status: "APPROVED",
      },
    },

    {
      $group: {
        _id: "$financialYear",

        claimCount: {
          $sum: 1,
        },

        totalAmount: {
          $sum: "$incentiveAmount",
        },
      },
    },

    {
      $sort: {
        _id: -1,
      },
    },
  ]);
};

module.exports = {
  getFacultyReportSummary,
  getFacultyClaimReport,
  getIncentiveByCategory,
  getIncentiveByFinancialYear,
};