
"use strict";

const {
  CLAIM_TYPES,
  CLAIM_STATUSES,
  FINANCIAL_YEARS,
} = require("./constants");

/*
 * Check whether a claim type is valid.
 *
 * The constants file remains the single source of truth.
 */
const isValidClaimType = (claimType) => {
  return (
    typeof claimType === "string" &&
    CLAIM_TYPES.includes(claimType)
  );
};

/*
 * Check whether a claim status is valid.
 */
const isValidClaimStatus = (status) => {
  return (
    typeof status === "string" &&
    CLAIM_STATUSES.includes(status)
  );
};

/*
 * Check whether a financial year is valid.
 */
const isValidFinancialYear = (financialYear) => {
  return (
    typeof financialYear === "string" &&
    FINANCIAL_YEARS.includes(financialYear)
  );
};

/*
 * Check whether a claim can be edited.
 *
 * Faculty can edit:
 * - DRAFT claims
 * - RETURNED claims
 *
 * Submitted, under-review, approved, and rejected claims
 * cannot be edited through the normal faculty workflow.
 */
const canEditClaim = (status) => {
  return (
    status === "DRAFT" ||
    status === "RETURNED"
  );
};

/*
 * Check whether a claim can be submitted or resubmitted.
 *
 * A RETURNED claim must be corrected before resubmission.
 * Additional validation is performed by claimService and
 * claimAnalyzer before the claim is accepted.
 */
const canSubmitClaim = (status) => {
  return (
    status === "DRAFT" ||
    status === "RETURNED"
  );
};

/*
 * Check whether a claim can be withdrawn.
 *
 * Only claims that have been submitted and are still
 * under review can be withdrawn at this stage.
 */
const canWithdrawClaim = (status) => {
  return (
    status === "SUBMITTED" ||
    status === "UNDER_REVIEW"
  );
};

/*
 * Safely normalize an incentive amount.
 *
 * Returns:
 * - 0 for missing or empty values
 * - A finite, non-negative number for valid amounts
 * - null for invalid or negative amounts
 *
 * This helper does not determine the official incentive
 * amount. The policy-based backend calculator must do that.
 */
const normalizeIncentiveAmount = (amount) => {
  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {
    return 0;
  }

  if (
    typeof amount === "boolean" ||
    (typeof amount === "string" && !amount.trim())
  ) {
    return null;
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 0
  ) {
    return null;
  }

  return numericAmount;
};

/*
 * Clean form data before saving it.
 *
 * - Accepts plain object form data only.
 * - Removes properties whose values are undefined.
 * - Preserves false, 0, null, empty strings, arrays,
 *   and nested values.
 * - Does not mutate the original object.
 *
 * Callers that accept external input must validate the
 * input before calling this helper.
 */
const cleanFormData = (formData = {}) => {
  if (
    !formData ||
    typeof formData !== "object" ||
    Array.isArray(formData)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(formData).filter(
      ([, value]) => value !== undefined
    )
  );
};

module.exports = {
  isValidClaimType,
  isValidClaimStatus,
  isValidFinancialYear,
  canEditClaim,
  canSubmitClaim,
  canWithdrawClaim,
  normalizeIncentiveAmount,
  cleanFormData,
};
