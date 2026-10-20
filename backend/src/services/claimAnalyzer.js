
const Document = require("../models/Document");
const User = require("../models/User");

const {
  calculateEContentIncentive,
} = require("../utils/eContentIncentive");

// =========================================================
// REQUIRED FIELDS
// =========================================================

const REQUIRED_FIELDS = {
  RESEARCH_PROJECT: [
    ["projectTitle", "Enter the research project title."],
  ],

  PATENT: [
    ["patentTitle", "Enter the patent title."],
    ["patentStatus", "Select the current patent status."],
  ],

  JOURNAL_PUBLICATION: [
    ["articleTitle", "Enter the article title."],
    ["journalName", "Enter the journal name."],
    ["publicationType", "Select the publication type."],
    ["indexing", "Select the journal indexing."],
    ["ISSN", "Enter the ISSN."],
    ["publicationDate", "Enter the publication date."],
    ["authorName", "Enter the author name."],
    ["authorRole", "Select the author's role."],
  ],

  RESEARCH_AWARD: [
    ["awardTitle", "Enter the award title."],
    ["awardType", "Select the award type."],
    ["awardingOrganization", "Enter the awarding organization."],
    ["awardLevel", "Select the award level."],
    ["awardDate", "Enter the award date."],
    ["recipientName", "Enter the recipient's name."],
    ["awardDescription", "Describe the award."],
  ],

  UNDERGRADUATE_RESEARCH: [
    ["researchTitle", "Enter the research title."],
    ["studentName", "Enter the student name."],
    ["studentRegisterNumber", "Enter the student register number."],
    ["studentProgram", "Enter the student programme."],
    ["department", "Enter the department."],
    ["researchLevel", "Select the research level."],
    ["projectStartDate", "Enter the project start date."],
    ["projectEndDate", "Enter the project end date."],
    ["facultyName", "Enter the faculty name."],
    ["researchDescription", "Describe the research."],
    ["outcome", "Enter the research outcome."],
  ],

  POSTGRADUATE_RESEARCH: [
    ["researchTitle", "Enter the research title."],
    ["scholarName", "Enter the scholar's name."],
    ["scholarRegisterNumber", "Enter the scholar register number."],
    ["programLevel", "Select the programme level."],
    ["department", "Enter the department."],
    ["researchLevel", "Select the research level."],
    ["projectStartDate", "Enter the project start date."],
    ["projectEndDate", "Enter the project end date."],
    ["facultyName", "Enter the faculty name."],
    ["facultyRole", "Select the faculty role."],
    ["researchArea", "Enter the research area."],
    ["researchDescription", "Describe the research."],
    ["researchOutcome", "Enter the research outcome."],
  ],

  BOOK_CHAPTER: [
    ["publicationType", "Select the publication type."],
    ["title", "Enter the book title."],
    ["isbn", "Enter the ISBN."],
    ["publisher", "Enter the publisher."],
    ["publicationDate", "Enter the publication date."],
    ["financialYear", "Select the financial year."],
    ["authorName", "Enter the author name."],
    ["authorRole", "Select the author role."],
    ["publisherLocation", "Enter the publisher location."],
    ["description", "Describe the publication."],
    ["contribution", "Describe your contribution."],
  ],

  CONFERENCE_PROCEEDINGS: [
    ["conferenceTitle", "Enter the conference title."],
    ["paperTitle", "Enter the paper title."],
    ["conferenceType", "Select the conference type."],
    ["organizer", "Enter the conference organizer."],
    ["conferenceLocation", "Enter the conference location."],
    ["conferenceStartDate", "Enter the conference start date."],
    ["conferenceEndDate", "Enter the conference end date."],
    ["facultyName", "Enter the faculty name."],
    ["presentationType", "Select the presentation type."],
    ["contribution", "Describe your contribution."],
  ],

  PHD_SUPERVISION: [
    ["scholarName", "Enter the scholar's name."],
    ["scholarRegisterNumber", "Enter the scholar register number."],
    ["programType", "Select the programme type."],
    ["department", "Enter the department."],
    ["researchTitle", "Enter the research title."],
    ["supervisionRole", "Select the supervision role."],
    ["registrationDate", "Enter the registration date."],
    ["scholarStatus", "Select the scholar's status."],
    ["financialYear", "Select the financial year."],
    ["facultyName", "Enter the faculty name."],
    ["researchArea", "Enter the research area."],
    ["supervisionDetails", "Enter the supervision details."],
  ],

  E_CONTENT: [
    ["contentTitle", "Enter the e-content title."],
    ["contentType", "Select the content type."],
    ["courseName", "Enter the course name."],
    ["contentLevel", "Select the content level."],
    ["publicationDate", "Enter the publication date."],
    ["financialYear", "Select the financial year."],
    ["facultyName", "Enter the faculty name."],
    ["facultyRole", "Select the faculty role."],
    ["contentDescription", "Describe the e-content."],
  ],

  PROFESSIONAL_DEVELOPMENT: [
    ["developmentTitle", "Enter the programme title."],
    ["developmentType", "Select the development type."],
    ["organizingInstitution", "Enter the organizing institution."],
    ["level", "Select the programme level."],
    ["startDate", "Enter the programme start date."],
    ["endDate", "Enter the programme end date."],
    ["financialYear", "Select the financial year."],
    ["facultyName", "Enter the faculty name."],
    ["participationRole", "Select your participation role."],
    ["description", "Describe the programme."],
  ],
};

// =========================================================
// REQUIRED DOCUMENTS
// =========================================================

const REQUIRED_DOCUMENTS = {
  RESEARCH_PROJECT: [
    ["sanctionLetter", "Project sanction letter"],
    ["grantCreditEvidence", "Grant credit evidence"],
    ["utilizationCertificate", "Utilization certificate"],
  ],

  PATENT: [
    ["patentFilingProof", "Patent filing proof"],
  ],

  JOURNAL_PUBLICATION: [
    ["acceptanceLetter", "Acceptance letter"],
    ["publishedArticle", "Published article"],
    ["indexingProof", "Journal indexing proof"],
  ],

  RESEARCH_AWARD: [
    ["awardCertificate", "Award certificate"],
  ],

  UNDERGRADUATE_RESEARCH: [
    ["projectApproval", "Project approval document"],
    ["researchReport", "Research report"],
  ],

  POSTGRADUATE_RESEARCH: [
    ["approvalLetter", "Approval letter"],
    ["registrationProof", "Registration proof"],
    ["researchReport", "Research report"],
  ],

  BOOK_CHAPTER: [
    ["bookCopy", "Book copy"],
    ["publicationProof", "Publication proof"],
    ["isbnProof", "ISBN proof"],
  ],

  CONFERENCE_PROCEEDINGS: [
    ["acceptanceLetter", "Acceptance letter"],
    ["presentationCertificate", "Presentation certificate"],
    ["proceedingsPaper", "Conference proceedings paper"],
  ],

  PHD_SUPERVISION: [
    ["registrationProof", "Scholar registration proof"],
    ["supervisorApproval", "Supervisor approval"],
    ["progressReport", "Progress report"],
  ],

  E_CONTENT: [
    ["approvalLetter", "Approval letter"],
    ["contentProof", "E-content proof"],
  ],

  PROFESSIONAL_DEVELOPMENT: [
    ["participationCertificate", "Participation certificate"],
    ["programmeBrochure", "Programme brochure"],
  ],
};

// =========================================================
// DATE RANGE VALIDATION
// =========================================================

const DATE_RANGES = {
  UNDERGRADUATE_RESEARCH: [
    ["projectStartDate", "projectEndDate", "Project"],
  ],

  POSTGRADUATE_RESEARCH: [
    ["projectStartDate", "projectEndDate", "Research project"],
  ],

  CONFERENCE_PROCEEDINGS: [
    ["conferenceStartDate", "conferenceEndDate", "Conference"],
  ],

  PROFESSIONAL_DEVELOPMENT: [
    ["startDate", "endDate", "Programme"],
  ],
};

// =========================================================
// GENERAL HELPERS
// =========================================================

const hasValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

const getValue = (formData, field) => formData?.[field];

const addFinding = (findings, field, category, message) => {
  findings.push({
    field,
    category,
    message,
  });
};

const isValidDate = (value) => {
  if (!hasValue(value)) {
    return false;
  }

  const parsed = new Date(value);

  return !Number.isNaN(parsed.getTime());
};

// =========================================================
// E-CONTENT POLICY VALIDATION
// =========================================================

const validateEContentPolicy = (claim, findings) => {
  const formData = claim.formData || {};

  const result = calculateEContentIncentive(formData);

  if (
    !result ||
    typeof result.eligible !== "boolean" ||
    !Array.isArray(result.reasons) ||
    !Number.isFinite(result.amount)
  ) {
    throw new Error(
      "The E-Content incentive calculator returned an invalid result."
    );
  }

  for (const reason of result.reasons) {
    addFinding(
      findings,
      "eContentEligibility",
      "policy",
      reason
    );
  }

  const savedAmount = Number(claim.incentiveAmount);

  if (
    result.eligible &&
    savedAmount !== result.amount
  ) {
    addFinding(
      findings,
      "incentiveAmount",
      "amount",
      `The E-Content incentive should be ₹${result.amount.toLocaleString(
        "en-IN"
      )} according to the eligibility calculation.`
    );
  }

  if (
    !result.eligible &&
    Number.isFinite(savedAmount) &&
    savedAmount > 0
  ) {
    addFinding(
      findings,
      "incentiveAmount",
      "amount",
      "The E-Content incentive amount must be zero until all policy eligibility requirements are satisfied."
    );
  }
};

// =========================================================
// FORM FIELD VALIDATION
// =========================================================

const validateClaimFields = (claim, findings) => {
  const formData = claim.formData || {};
  const claimType = claim.claimType;

  if (
    !formData ||
    typeof formData !== "object" ||
    Array.isArray(formData)
  ) {
    addFinding(
      findings,
      "formData",
      "field",
      "The claim form data is invalid."
    );

    return;
  }

  if (!REQUIRED_FIELDS[claimType]) {
    addFinding(
      findings,
      "claimType",
      "configuration",
      "The analyzer does not have validation rules configured for this claim type."
    );

    return;
  }

  for (const [field, message] of REQUIRED_FIELDS[claimType]) {
    if (!hasValue(getValue(formData, field))) {
      addFinding(findings, field, "field", message);
    }
  }

  if (claimType === "E_CONTENT") {
    validateEContentPolicy(claim, findings);
  }

  // A book chapter must include its chapter title.
  if (
    formData.publicationType === "Book Chapter" &&
    !hasValue(formData.chapterTitle)
  ) {
    addFinding(
      findings,
      "chapterTitle",
      "field",
      "Enter the chapter title."
    );
  }

  // Validate custom values when the user selects Other.
  const conditionalFields = [
    [
      "programType",
      "Other",
      "otherProgram",
      "Specify the programme type.",
    ],
    [
      "programLevel",
      "Other",
      "otherProgram",
      "Specify the programme level.",
    ],
    [
      "developmentType",
      "Other",
      "otherDevelopmentType",
      "Specify the development type.",
    ],
    [
      "awardType",
      "Other",
      "otherAwardType",
      "Specify the award type.",
    ],
    [
      "conferenceType",
      "Other",
      "otherConferenceType",
      "Specify the conference type.",
    ],
    [
      "presentationType",
      "Other",
      "otherPresentationType",
      "Specify the presentation type.",
    ],
    [
      "contentType",
      "Other",
      "otherContentType",
      "Specify the content type.",
    ],
    [
      "indexing",
      "Other",
      "otherIndexing",
      "Specify the indexing service.",
    ],
  ];

  for (const [
    selector,
    expected,
    field,
    message,
  ] of conditionalFields) {
    if (
      typeof formData[selector] === "string" &&
      formData[selector].trim().toLowerCase() ===
        expected.toLowerCase() &&
      !hasValue(formData[field])
    ) {
      addFinding(findings, field, "field", message);
    }
  }

  // Validate configured date ranges.
  for (const [
    startField,
    endField,
    label,
  ] of DATE_RANGES[claimType] || []) {
    const start = formData[startField];
    const end = formData[endField];

    if (!hasValue(start) || !hasValue(end)) {
      continue;
    }

    if (!isValidDate(start) || !isValidDate(end)) {
      addFinding(
        findings,
        endField,
        "date",
        `${label} dates must be valid dates. Please check the entered dates.`
      );

      continue;
    }

    if (new Date(end) < new Date(start)) {
      addFinding(
        findings,
        endField,
        "date",
        `${label} end date cannot be earlier than its start date.`
      );
    }
  }

  // Validate individual date fields where supplied.
  const dateFieldsByClaimType = {
    JOURNAL_PUBLICATION: ["publicationDate"],
    RESEARCH_AWARD: ["awardDate"],
    BOOK_CHAPTER: ["publicationDate"],
    PHD_SUPERVISION: ["registrationDate"],
    E_CONTENT: ["publicationDate"],
  };

  for (const field of dateFieldsByClaimType[claimType] || []) {
    if (
      hasValue(formData[field]) &&
      !isValidDate(formData[field])
    ) {
      addFinding(
        findings,
        field,
        "date",
        "Enter a valid date."
      );
    }
  }

  // Validate the saved, server-calculated amount.
  // This analyzer checks the stored amount; claimService must calculate it.
  const amount = claim.incentiveAmount;

  if (
    amount === undefined ||
    amount === null ||
    amount === "" ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) < 0
  ) {
    addFinding(
      findings,
      "incentiveAmount",
      "amount",
      "The calculated incentive amount is invalid."
    );
  }

  // Validate names in collections when those collections are supplied.
  const namedCollections = [
    ["students", "name", "student"],
    ["coAuthors", "name", "co-author"],
    ["coAuthors", "authorName", "co-author"],
    ["coSupervisors", "name", "co-supervisor"],
    ["additionalScholars", "name", "additional scholar"],
    ["coCreators", "name", "co-creator"],
  ];

  for (const [
    collectionName,
    nameField,
    label,
  ] of namedCollections) {
    const collection = formData[collectionName];

    if (
      !Array.isArray(collection) ||
      collection.length === 0
    ) {
      continue;
    }

    collection.forEach((item, index) => {
      if (!hasValue(item?.[nameField])) {
        addFinding(
          findings,
          `${collectionName}.${index}.${nameField}`,
          "field",
          `Enter the name of ${label} ${index + 1}.`
        );
      }
    });
  }
};

// =========================================================
// DOCUMENT VALIDATION
// =========================================================

const validateDocuments = async (claim, findings) => {
  const requiredDocuments = [
    ...(REQUIRED_DOCUMENTS[claim.claimType] || []),
  ];

  const formData = claim.formData || {};

  if (
    claim.claimType === "PATENT" &&
    formData.patentStatus === "Published"
  ) {
    requiredDocuments.push([
      "publicationProof",
      "Patent publication proof",
    ]);
  }

  if (
    claim.claimType === "PATENT" &&
    formData.patentStatus === "Granted"
  ) {
    requiredDocuments.push([
      "patentCertificate",
      "Patent certificate",
    ]);
  }

  if (claim.claimType === "RESEARCH_AWARD") {
    requiredDocuments.push([
      "awardLetter",
      "Award letter or official communication",
    ]);
  }

  const documents = await Document.find({
    claim: claim._id,
    faculty: claim.faculty,
  })
    .select(
      "documentType status reviewComment originalName replacedBy createdAt"
    )
    .sort({ createdAt: 1 })
    .lean();

  // Only the current, non-replaced version of a document is considered.
  const currentDocuments = documents.filter(
    (document) =>
      document.replacedBy === null ||
      document.replacedBy === undefined
  );

  for (const [
    documentType,
    label,
  ] of requiredDocuments) {
    const matchingDocuments = currentDocuments.filter(
      (document) => document.documentType === documentType
    );

    if (matchingDocuments.length === 0) {
      addFinding(
        findings,
        `documents.${documentType}`,
        "document",
        `Upload the required ${label}.`
      );

      continue;
    }

    // Documents are sorted oldest first, so inspect the latest current one.
    const latestDocument =
      matchingDocuments[matchingDocuments.length - 1];

    if (
      !["UPLOADED", "VERIFIED"].includes(latestDocument.status)
    ) {
      addFinding(
        findings,
        `documents.${documentType}`,
        "document",
        latestDocument.status === "REJECTED"
          ? `${label} was rejected. ${
              latestDocument.reviewComment?.trim()
                ? `Reviewer feedback: ${latestDocument.reviewComment.trim()}`
                : "Upload a corrected replacement document."
            }`
          : `${label} has an invalid or unsupported review status.`
      );
    }
  }
};

// =========================================================
// CLAIM ANALYSIS
// =========================================================

const analyzeClaim = async (claim) => {
  const findings = [];

  if (!claim || !claim._id || !claim.faculty) {
    throw new Error(
      "A saved claim with a faculty reference is required for analysis."
    );
  }

  validateClaimFields(claim, findings);

  await validateDocuments(claim, findings);

  return {
    claimId: String(claim._id),
    claimType: claim.claimType,
    valid: findings.length === 0,
    findings,
    analyzedAt: new Date().toISOString(),
  };
};

// =========================================================
// FACULTY DETAILS FOR CORRECTION EMAILS
// =========================================================

const getFacultyForCorrectionEmail = async (facultyId) => {
  return User.findById(facultyId)
    .select("fullName email notificationPreferences")
    .lean();
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  analyzeClaim,
  getFacultyForCorrectionEmail,
};
