
const roundCurrency = (amount) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

// Amounts stated on page 4 of the uploaded SRM FSH policy.
// These are base amounts, not confirmed individual shares.
const PATENT_INCENTIVES = Object.freeze({
  Published: 3000,
  Granted: 5000,
  "Technology Transfer": 50000,
});

const SUPPORTED_PATENT_TYPES = Object.freeze([
  "Indian Patent",
  "International Patent",
]);

const SUPPORTED_PATENT_STATUSES = Object.freeze([
  "Filed",
  "Published",
  "Granted",
  "Technology Transfer",
]);

const SUPPORTED_PATENT_ROLES = Object.freeze([
  "Inventor",
  "Co-Inventor",
]);

const validatePatentData = (formData) => {
  if (
    !formData ||
    typeof formData !== "object" ||
    Array.isArray(formData)
  ) {
    throw new Error("Valid patent claim details are required.");
  }

  const {
    patentTitle,
    patentType,
    patentStatus,
    patentRole,
    inventorName,
    coInventors = [],
  } = formData;

  if (
    typeof patentTitle !== "string" ||
    !patentTitle.trim()
  ) {
    throw new Error("Enter the patent title.");
  }

  if (!SUPPORTED_PATENT_TYPES.includes(patentType)) {
    throw new Error("Select a valid patent type.");
  }

  if (!SUPPORTED_PATENT_STATUSES.includes(patentStatus)) {
    throw new Error("Select a valid patent status.");
  }

  if (!SUPPORTED_PATENT_ROLES.includes(patentRole)) {
    throw new Error("Select a valid patent role.");
  }

  if (
    typeof inventorName !== "string" ||
    !inventorName.trim()
  ) {
    throw new Error("Enter the inventor's name.");
  }

  if (!Array.isArray(coInventors)) {
    throw new Error("Co-inventors must be provided as a list.");
  }

  if (
    coInventors.some(
      (inventor) =>
        !inventor ||
        typeof inventor.name !== "string" ||
        !inventor.name.trim()
    )
  ) {
    throw new Error(
      "Every co-inventor must have a valid name."
    );
  }

  return {
    patentTitle: patentTitle.trim(),
    patentType,
    patentStatus,
    patentRole,
    inventorName: inventorName.trim(),
    coInventors: coInventors.map((inventor) => ({
      ...inventor,
      name: inventor.name.trim(),
    })),
  };
};

/**
 * Calculates the base incentive stated in the policy.
 *
 * Filed:               ₹0
 * Published:           ₹3,000
 * Granted:             ₹5,000
 * Technology Transfer: ₹50,000
 *
 * The policy does not specify how the amount is divided
 * among co-inventors. Do not treat the base amount as a
 * confirmed individual payment.
 */
const calculatePatentIncentive = (formData) => {
  const validated = validatePatentData(formData);

  if (validated.patentStatus === "Filed") {
    return {
      calculationType: "PATENT",
      patentType: validated.patentType,
      patentStatus: validated.patentStatus,
      baseIncentiveAmount: 0,
      claimantAmount: 0,
      currency: "INR",
      eligibleForListedOutcomeIncentive: false,
      requiresReview: false,
      message:
        "The uploaded policy does not list an incentive for a patent that is only filed.",
    };
  }

  const baseIncentiveAmount =
    PATENT_INCENTIVES[validated.patentStatus];

  if (!Number.isFinite(baseIncentiveAmount)) {
    throw new Error(
      "No incentive amount is configured for this patent status."
    );
  }

  return {
    calculationType: "PATENT",
    patentType: validated.patentType,
    patentStatus: validated.patentStatus,
    baseIncentiveAmount: roundCurrency(baseIncentiveAmount),
    claimantAmount: null,
    currency: "INR",
    eligibleForListedOutcomeIncentive: true,
    requiresReview: true,
    message:
      "The policy-listed base incentive is calculated. Confirm the applicable inventor allocation rule before treating it as an individual payable amount.",
  };
};

module.exports = {
  PATENT_INCENTIVES,
  SUPPORTED_PATENT_TYPES,
  SUPPORTED_PATENT_STATUSES,
  SUPPORTED_PATENT_ROLES,
  validatePatentData,
  calculatePatentIncentive,
};
