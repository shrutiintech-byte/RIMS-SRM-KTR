
"use strict";

// =========================================================
// E-CONTENT INCENTIVE POLICY CONSTANTS
// =========================================================

const E_CONTENT_INCENTIVE_AMOUNT = 50000;

const MINIMUM_COURSE_CREDITS = 1;
const MINIMUM_TEACHING_EXPERIENCE_YEARS = 5;

const APPROVED_GOVERNMENT_PLATFORMS = Object.freeze([
  "e-pg pathshala",
  "cec",
  "swayam",
  "nptel",
  "nmeict",
]);

// =========================================================
// HELPER FUNCTIONS
// =========================================================

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase().replace(/\s+/g, " ");
};

const isYes = (value) => {
  if (value === true) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  return ["yes", "true"].includes(normalizeText(value));
};

const hasValue = (value) => {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
};

const parseNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    typeof value === "boolean"
  ) {
    return NaN;
  }

  if (typeof value === "string" && !value.trim()) {
    return NaN;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : NaN;
};

// =========================================================
// E-CONTENT INCENTIVE CALCULATOR
// =========================================================

/**
 * Calculates the E-Content incentive based on the supplied
 * SRM policy requirements.
 *
 * Requirements:
 * 1. PhD qualification.
 * 2. At least five years of teaching experience in the
 *    concerned discipline.
 * 3. A completed course carrying at least one credit.
 * 4. Course developed under a government initiative.
 * 5. Necessary institutional infrastructure.
 * 6. SWAYAM four-quadrant approach.
 *
 * Amount: ₹50,000 per eligible completed course.
 *
 * IMPORTANT:
 * The calculator does not trust the amount submitted by
 * the frontend.
 *
 * An unlisted government initiative requires manual
 * verification. Entering its name alone does not prove
 * that it is an eligible government initiative.
 *
 * @param {Object} formData
 * @returns {{
 *   eligible: boolean,
 *   amount: number,
 *   reasons: string[],
 *   requiresManualVerification: boolean
 * }}
 */
const calculateEContentIncentive = (formData = {}) => {
  const reasons = [];
  let requiresManualVerification = false;

  // -------------------------------------------------------
  // 1. Validate input
  // -------------------------------------------------------

  if (
    !formData ||
    typeof formData !== "object" ||
    Array.isArray(formData)
  ) {
    return {
      eligible: false,
      amount: 0,
      reasons: [
        "Invalid E-Content incentive form data.",
      ],
      requiresManualVerification: false,
    };
  }

  // -------------------------------------------------------
  // 2. Read government initiative
  // -------------------------------------------------------

  const selectedInitiative = normalizeText(
    hasValue(formData.governmentInitiative)
      ? formData.governmentInitiative
      : formData.platform
  );

  const otherGovernmentInitiativeName = normalizeText(
    formData.otherGovernmentInitiativeName
  );

  const credits = parseNumber(formData.creditCount);

  const experienceYears = parseNumber(
    formData.teachingExperienceYears
  );

  // -------------------------------------------------------
  // 3. PhD qualification
  // -------------------------------------------------------

  if (!isYes(formData.isPhDHolder)) {
    reasons.push(
      "A PhD qualification is required."
    );
  }

  // -------------------------------------------------------
  // 4. Teaching experience
  // -------------------------------------------------------

  if (
    !Number.isFinite(experienceYears) ||
    experienceYears < MINIMUM_TEACHING_EXPERIENCE_YEARS
  ) {
    reasons.push(
      "At least 5 years of teaching experience in the concerned discipline is required."
    );
  }

  // -------------------------------------------------------
  // 5. Minimum course credits
  // -------------------------------------------------------

  if (
    !Number.isFinite(credits) ||
    credits < MINIMUM_COURSE_CREDITS
  ) {
    reasons.push(
      "The completed course must carry at least 1 credit."
    );
  }

  // -------------------------------------------------------
  // 6. Course completion
  // -------------------------------------------------------

  if (!isYes(formData.courseCompleted)) {
    reasons.push(
      "The course must be completed."
    );
  }

  // -------------------------------------------------------
  // 7. Government initiative validation
  // -------------------------------------------------------

  const isListedPlatform =
    APPROVED_GOVERNMENT_PLATFORMS.includes(
      selectedInitiative
    );

  const isOtherInitiative =
    selectedInitiative === "other" ||
    selectedInitiative === "other government initiative";

  if (isListedPlatform) {
    // A listed initiative matches the configured policy list.
    // Supporting documents must still be checked by the
    // existing claim review process.
  } else if (isOtherInitiative) {
    if (!otherGovernmentInitiativeName) {
      reasons.push(
        "Provide the name of the other government initiative."
      );
    } else {
      // A name alone cannot establish government sponsorship.
      // Do not automatically treat this claim as eligible.
      requiresManualVerification = true;

      reasons.push(
        "The other government initiative must be verified by an authorized reviewer before eligibility can be confirmed."
      );
    }
  } else {
    reasons.push(
      "Select an approved government initiative or select Other Government Initiative and provide its name for verification."
    );
  }

  // -------------------------------------------------------
  // 8. Institutional infrastructure
  // -------------------------------------------------------

  if (!isYes(formData.infrastructureAvailable)) {
    reasons.push(
      "Necessary institutional infrastructure must be available."
    );
  }

  // -------------------------------------------------------
  // 9. SWAYAM four-quadrant approach
  // -------------------------------------------------------

  if (!isYes(formData.fourQuadrantCompliant)) {
    reasons.push(
      "The course must follow the SWAYAM four-quadrant approach."
    );
  }

  // -------------------------------------------------------
  // 10. Final calculation
  // -------------------------------------------------------

  const eligible = reasons.length === 0;

  return {
    eligible,
    amount: eligible
      ? E_CONTENT_INCENTIVE_AMOUNT
      : 0,
    reasons,
    requiresManualVerification,
  };
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  E_CONTENT_INCENTIVE_AMOUNT,
  MINIMUM_COURSE_CREDITS,
  MINIMUM_TEACHING_EXPERIENCE_YEARS,
  APPROVED_GOVERNMENT_PLATFORMS,
  calculateEContentIncentive,
};
