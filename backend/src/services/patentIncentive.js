
const {
  calculatePatentIncentive,
  validatePatentData,
} = require("../utils/patentIncentive");

/**
 * Calculates a patent claim using the policy calculator.
 *
 * This service does not invent an individual inventor's
 * share. Published and Granted claims require review until
 * the applicable distribution rule has been verified.
 */
const calculatePatentClaimIncentive = (formData) => {
  const validatedData = validatePatentData(formData);

  const calculation = calculatePatentIncentive(validatedData);

  if (
    !calculation ||
    typeof calculation !== "object" ||
    !Number.isFinite(calculation.baseIncentiveAmount)
  ) {
    throw new Error(
      "Patent incentive calculation returned an invalid result."
    );
  }

  return {
    ...calculation,
    requiresReview: calculation.requiresReview === true,
    claimantAmount: calculation.claimantAmount,
    calculationDetails: {
      patentTitle: validatedData.patentTitle,
      patentType: validatedData.patentType,
      patentStatus: validatedData.patentStatus,
      inventorName: validatedData.inventorName,
      coInventorCount: validatedData.coInventors.length,
    },
  };
};

module.exports = {
  calculatePatentClaimIncentive,
};
