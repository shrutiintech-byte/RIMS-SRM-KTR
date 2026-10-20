
const RESEARCH_PROJECT_RATE = 0.05;
const PI_SHARE = 0.70;
const COPI_SHARE = 0.30;

// =========================================================
// CURRENCY ROUNDING
// =========================================================

const roundCurrency = (amount) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

// =========================================================
// POLICY EXCLUSIONS
// =========================================================

const EXCLUDED_SCHEME_PATTERNS = [
  /ramalingaswamy/i,
  /ramanujan[\s-]*re[\s-]*entry/i,
  /\bnpdf\b/i,
  /\bdst[\s-]*inspire\b/i,
  /\bdbt[\s-]*bet\b/i,
  /\bresearch[\s-]*associate[\s-]*awards?\b/i,
];

const FELLOWSHIP_PATTERN = /\bfellowships?\b/i;

const getExcludedSchemeReason = (formData = {}) => {
  const schemeFields = [
    formData.fundingScheme,
    formData.grantType,
    formData.fundingType,
  ];

  const descriptiveFields = [
    formData.fundingAgency,
    formData.projectTitle,
    ...schemeFields,
  ];

  const descriptiveText = descriptiveFields
    .filter((value) => typeof value === "string")
    .join(" ");

  const matchedScheme = EXCLUDED_SCHEME_PATTERNS.find(
    (pattern) => pattern.test(descriptiveText)
  );

  if (matchedScheme) {
    return (
      "This funding scheme appears to fall under a category " +
      "excluded by the SRMIST incentive policy. Please verify " +
      "the scheme and confirm eligibility before proceeding."
    );
  }

  const schemeText = schemeFields
    .filter((value) => typeof value === "string")
    .join(" ");

  if (FELLOWSHIP_PATTERN.test(schemeText)) {
    return (
      "Fellowship funding may be excluded under the applicable " +
      "policy. Please verify eligibility before proceeding."
    );
  }

  return null;
};

// =========================================================
// VALIDATE RESEARCH PROJECT DATA
// =========================================================

const validateResearchProjectData = (formData) => {
  if (
    !formData ||
    typeof formData !== "object" ||
    Array.isArray(formData)
  ) {
    throw new Error(
      "Research project information is required."
    );
  }

  // Check the policy exclusions before calculating an incentive.
  const exclusionReason = getExcludedSchemeReason(formData);

  if (exclusionReason) {
    throw new Error(exclusionReason);
  }

  // Validate the amount of research grant credited.
  const rawGrantCredited = formData.grantCredited;

  if (
    rawGrantCredited === "" ||
    rawGrantCredited === null ||
    rawGrantCredited === undefined ||
    typeof rawGrantCredited === "boolean"
  ) {
    throw new Error(
      "Grant credited must be a valid amount greater than zero."
    );
  }

  const grantCredited = Number(rawGrantCredited);

  if (
    !Number.isFinite(grantCredited) ||
    grantCredited <= 0
  ) {
    throw new Error(
      "Grant credited must be a valid amount greater than zero."
    );
  }

  // Validate the claimant's role.
  if (
    formData.projectRole !== "PI" &&
    formData.projectRole !== "CoPI"
  ) {
    throw new Error(
      "A valid project role (PI or CoPI) is required."
    );
  }

  let totalCoPICount = 0;

  if (formData.projectRole === "CoPI") {
    const coPIs = formData.coPrincipalInvestigators;

    if (!Array.isArray(coPIs)) {
      throw new Error(
        "Please provide the Co-Principal Investigator details."
      );
    }

    if (
      coPIs.some(
        (name) =>
          typeof name !== "string" ||
          !name.trim()
      )
    ) {
      throw new Error(
        "Please provide valid names for the other Co-PIs."
      );
    }

    // Assumption: this array contains the other Co-PIs,
    // not including the current claimant.
    totalCoPICount = coPIs.length + 1;
  }

  return {
    grantCredited,
    projectRole: formData.projectRole,
    totalCoPICount,
  };
};

// =========================================================
// CALCULATE RESEARCH PROJECT INCENTIVE BREAKDOWN
// =========================================================

const calculateResearchProjectBreakdown = (formData) => {
  const {
    grantCredited,
    projectRole,
    totalCoPICount,
  } = validateResearchProjectData(formData);

  // Total project incentive = 5% of the grant credited.
  const totalIncentive = roundCurrency(
    grantCredited * RESEARCH_PROJECT_RATE
  );

  let claimantShareRate;
  let claimantAmount;

  if (projectRole === "PI") {
    // Principal Investigator receives 70% of the total incentive.
    claimantShareRate = PI_SHARE;

    claimantAmount = roundCurrency(
      totalIncentive * PI_SHARE
    );
  } else {
    // The 30% Co-PI pool is divided equally among all Co-PIs,
    // including the claimant.
    if (totalCoPICount < 1) {
      throw new Error(
        "The total number of Co-PIs must be at least one."
      );
    }

    claimantShareRate = COPI_SHARE / totalCoPICount;

    claimantAmount = roundCurrency(
      (totalIncentive * COPI_SHARE) /
        totalCoPICount
    );
  }

  return {
    calculationType: "RESEARCH_PROJECT",
    grantCredited,
    incentiveRate: RESEARCH_PROJECT_RATE,
    totalIncentive,
    projectRole,
    piShareRate: PI_SHARE,
    coPiShareRate: COPI_SHARE,
    totalCoPICount,
    claimantShareRate,
    claimantAmount,
    currency: "INR",
  };
};

// =========================================================
// CALCULATE CLAIMANT INCENTIVE AMOUNT
// =========================================================

const calculateResearchProjectIncentive = (formData) => {
  const breakdown =
    calculateResearchProjectBreakdown(formData);

  return breakdown.claimantAmount;
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  RESEARCH_PROJECT_RATE,
  PI_SHARE,
  COPI_SHARE,
  roundCurrency,
  getExcludedSchemeReason,
  validateResearchProjectData,
  calculateResearchProjectBreakdown,
  calculateResearchProjectIncentive,
};
