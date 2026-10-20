
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  FolderKanban,
  IndianRupee,
  Plus,
  Save,
  Trash2,
  Upload,
  UsersRound,
} from "lucide-react";

import "./ResearchProject.css";

const API_BASE_URL = "http://localhost:5000";
const CURRENT_FINANCIAL_YEAR = "2026-27";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const FINANCIAL_YEARS = [
  { value: "2026-27", label: "2026–27" },
  { value: "2025-26", label: "2025–26" },
  { value: "2024-25", label: "2024–25" },
];

const RESEARCH_PROJECT_INCENTIVE_RATE = 0.05;
const PI_SHARE_PERCENTAGE = 70;
const COPI_SHARE_PERCENTAGE = 30;

/*
 * These patterns flag scheme names for eligibility review.
 * The backend must independently enforce the institutional policy.
 * Do not exclude all projects simply because they are funded by DST or DBT.
 */
const EXCLUDED_RESEARCH_SCHEME_PATTERNS = [
  /ramalingaswamy/i,
  /ramanujan[\s-]*re[\s-]*entry/i,
  /\bnpdf\b/i,
  /\bdst[\s-]*inspire\b/i,
  /\bdbt[\s-]*bet\b/i,
  /\bresearch[\s-]*associate[\s-]*awards?\b/i,
];

const isExcludedResearchScheme = (scheme) => {
  const value = String(scheme || "").trim();

  if (!value) return false;

  return (
    EXCLUDED_RESEARCH_SCHEME_PATTERNS.some((pattern) =>
      pattern.test(value)
    ) || /\bfellowships?\b/i.test(value)
  );
};

const PROJECT_ROLES = [
  { value: "PI", label: "Principal Investigator (PI)" },
  { value: "CoPI", label: "Co-Principal Investigator (Co-PI)" },
];

const DOCUMENT_TYPES = {
  sanctionLetter: "sanctionLetter",
  grantCreditEvidence: "grantCreditEvidence",
  utilizationCertificate: "utilizationCertificate",
};

const DOCUMENT_LABELS = {
  sanctionLetter: "Sanction / Award Letter",
  grantCreditEvidence: "Grant Credit Evidence",
  utilizationCertificate: "Utilization Certificate",
};

const REQUIRED_DOCUMENTS = [
  {
    type: DOCUMENT_TYPES.sanctionLetter,
    label: DOCUMENT_LABELS.sanctionLetter,
  },
  {
    type: DOCUMENT_TYPES.grantCreditEvidence,
    label: DOCUMENT_LABELS.grantCreditEvidence,
  },
  {
    type: DOCUMENT_TYPES.utilizationCertificate,
    label: DOCUMENT_LABELS.utilizationCertificate,
  },
];

const createEmptyForm = () => ({
  projectTitle: "",
  projectSanctionId: "",
  fundingAgency: "",
  fundingScheme: "",
  sanctionedAmount: "",
  grantCredited: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  principalInvestigator: "",
  projectRole: "",
  projectStartDate: "",
  projectEndDate: "",
  durationMonths: "",
});

const createEmptyDocuments = () => ({
  sanctionLetter: null,
  grantCreditEvidence: null,
  utilizationCertificate: null,
});

const getToken = () => localStorage.getItem("rimsToken");

const clearSessionAndRedirect = (navigate) => {
  localStorage.removeItem("rimsToken");
  localStorage.removeItem("rimsUser");
  navigate("/");
};

const normalizeDateForInput = (value) => {
  if (!value) return "";

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getClaimFormData = (claim) => claim?.formData || {};

const getInitialCoPrincipalInvestigators = (claim) => {
  const data = getClaimFormData(claim);

  if (Array.isArray(data.coPrincipalInvestigators)) {
    return data.coPrincipalInvestigators.map((name) =>
      typeof name === "string" ? name : ""
    );
  }

  if (Array.isArray(data.coPIs)) {
    return data.coPIs.map((name) =>
      typeof name === "string" ? name : ""
    );
  }

  return [];
};

const readApiResponse = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(
        `The server returned an unexpected response (${response.status}).`
      );
    }

    throw new Error("The server returned an invalid response.");
  }
};

const getApiErrorMessage = (result, fallback) =>
  result?.message || result?.error || fallback;

const getValidationFindings = (result) => {
  const possibleFindings = [
    result?.details,
    result?.errors,
    result?.validation?.findings,
    result?.validation?.errors,
    result?.validation?.issues,
    result?.data?.details,
    result?.data?.errors,
    result?.data?.validation?.findings,
    result?.data?.validation?.errors,
    result?.data?.validation?.issues,
  ];

  return (
    possibleFindings.find(
      (findings) =>
        Array.isArray(findings) && findings.length > 0
    ) || []
  );
};

const formatValidationFinding = (finding) => {
  if (typeof finding === "string") {
    return finding.trim();
  }

  if (!finding || typeof finding !== "object") {
    return "";
  }

  const message =
    typeof finding.message === "string"
      ? finding.message.trim()
      : typeof finding.msg === "string"
      ? finding.msg.trim()
      : "";

  const field =
    typeof finding.field === "string"
      ? finding.field.trim()
      : typeof finding.path === "string"
      ? finding.path.trim()
      : typeof finding.param === "string"
      ? finding.param.trim()
      : "";

  if (message && field) {
    const normalizedMessage = message.toLowerCase();
    const normalizedField = field.toLowerCase();

    if (
      normalizedMessage.startsWith(`${normalizedField}:`) ||
      normalizedMessage.startsWith(`${normalizedField} `)
    ) {
      return message;
    }

    return `${field}: ${message}`;
  }

  if (message) return message;

  if (field) {
    return `${field}: Please correct this field.`;
  }

  return "";
};

const getDetailedApiErrors = (result) => {
  const findings = getValidationFindings(result);

  const messages = findings
    .map(formatValidationFinding)
    .filter(Boolean);

  return [...new Set(messages)];
};

function ResearchProject() {
  const navigate = useNavigate();
  const location = useLocation();

  const draftClaim =
    location.state?.draftClaim ||
    location.state?.returnedClaim ||
    location.state?.claim ||
    null;

  const isEditingDraft = Boolean(
    location.state?.isEditingDraft && draftClaim?._id
  );

  const isEditingReturnedClaim = Boolean(
    draftClaim?._id &&
      (
        draftClaim.status === "RETURNED" ||
        location.state?.isEditingReturnedClaim === true
      )
  );

  const [claimId, setClaimId] = useState(
    draftClaim?._id || null
  );

  const [formData, setFormData] = useState(() => {
    const draftFormData = getClaimFormData(draftClaim);

    return {
      ...createEmptyForm(),
      ...draftFormData,
      financialYear:
        draftClaim?.financialYear ||
        draftFormData.financialYear ||
        CURRENT_FINANCIAL_YEAR,
      projectTitle:
        typeof draftFormData.projectTitle === "string"
          ? draftFormData.projectTitle
          : "",
      projectSanctionId:
        typeof draftFormData.projectSanctionId === "string"
          ? draftFormData.projectSanctionId
          : "",
      fundingAgency:
        typeof draftFormData.fundingAgency === "string"
          ? draftFormData.fundingAgency
          : "",
      fundingScheme:
        typeof draftFormData.fundingScheme === "string"
          ? draftFormData.fundingScheme
          : "",
      principalInvestigator:
        typeof draftFormData.principalInvestigator === "string"
          ? draftFormData.principalInvestigator
          : "",
      projectStartDate: normalizeDateForInput(
        draftFormData.projectStartDate
      ),
      projectEndDate: normalizeDateForInput(
        draftFormData.projectEndDate
      ),
    };
  });

  const [coPrincipalInvestigators, setCoPrincipalInvestigators] =
    useState(() =>
      getInitialCoPrincipalInvestigators(draftClaim)
    );

  const [documents, setDocuments] = useState(
    createEmptyDocuments
  );

  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [errors, setErrors] = useState([]);
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] =
    useState(null);

  useEffect(() => {
    if (!draftClaim?._id) return;

    const draftFormData = getClaimFormData(draftClaim);

    setClaimId(draftClaim._id);

    setFormData({
      ...createEmptyForm(),
      ...draftFormData,
      financialYear:
        draftClaim.financialYear ||
        draftFormData.financialYear ||
        CURRENT_FINANCIAL_YEAR,
      projectTitle:
        typeof draftFormData.projectTitle === "string"
          ? draftFormData.projectTitle
          : "",
      projectSanctionId:
        typeof draftFormData.projectSanctionId === "string"
          ? draftFormData.projectSanctionId
          : "",
      fundingAgency:
        typeof draftFormData.fundingAgency === "string"
          ? draftFormData.fundingAgency
          : "",
      fundingScheme:
        typeof draftFormData.fundingScheme === "string"
          ? draftFormData.fundingScheme
          : "",
      principalInvestigator:
        typeof draftFormData.principalInvestigator === "string"
          ? draftFormData.principalInvestigator
          : "",
      projectStartDate: normalizeDateForInput(
        draftFormData.projectStartDate
      ),
      projectEndDate: normalizeDateForInput(
        draftFormData.projectEndDate
      ),
    });

    setCoPrincipalInvestigators(
      getInitialCoPrincipalInvestigators(draftClaim)
    );

    setDocuments(createEmptyDocuments());
    setErrors([]);
    setSavedMessage("");
  }, [draftClaim]);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      if (!claimId) {
        setUploadedDocuments([]);
        return;
      }

      const token = getToken();

      if (!token) {
        clearSessionAndRedirect(navigate);
        return;
      }

      try {
        setLoadingDocuments(true);

        const response = await fetch(
          `${API_BASE_URL}/api/documents?claimId=${encodeURIComponent(
            claimId
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          clearSessionAndRedirect(navigate);
          return;
        }

        const result = await readApiResponse(response);

        if (!response.ok) {
          const error = new Error(
            getApiErrorMessage(
              result,
              "Unable to load claim documents."
            )
          );

          error.details = getDetailedApiErrors(result);
          throw error;
        }

        if (!cancelled) {
          const loadedDocuments = Array.isArray(
            result?.data?.documents
          )
            ? result.data.documents
            : [];

          setUploadedDocuments(loadedDocuments);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Load research project documents error:",
            error
          );

          const details = Array.isArray(error?.details)
            ? error.details
            : [];

          setErrors(
            details.length > 0
              ? details
              : [
                  error.message ||
                    "Unable to load claim documents.",
                ]
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      }
    };

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [claimId, navigate]);

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors([]);
    setSavedMessage("");
  };

  const addCoPrincipalInvestigator = () => {
    setCoPrincipalInvestigators((previous) => [
      ...previous,
      "",
    ]);

    setErrors([]);
    setSavedMessage("");
  };

  const updateCoPrincipalInvestigator = (index, value) => {
    setCoPrincipalInvestigators((previous) =>
      previous.map((name, itemIndex) =>
        itemIndex === index ? value : name
      )
    );

    setErrors([]);
    setSavedMessage("");
  };

  const removeCoPrincipalInvestigator = (index) => {
    setCoPrincipalInvestigators((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );

    setErrors([]);
    setSavedMessage("");
  };

  const getUploadedDocument = (documentType) =>
    uploadedDocuments.find(
      (document) => document.documentType === documentType
    );

  const hasDocument = (documentType) =>
    Boolean(
      documents[documentType] ||
        getUploadedDocument(documentType)
    );

  const validateDocument = (file) => {
    if (!file) return null;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    const allowedExtensions = /\.(pdf|jpe?g|png)$/i;

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.test(file.name)
    ) {
      return "Only PDF, JPG, JPEG, and PNG files are allowed.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "Each document must be 10 MB or smaller.";
    }

    return null;
  };

  const handleDocumentChange = (documentType, file) => {
    if (!file) return;

    const fileError = validateDocument(file);

    if (fileError) {
      setErrors([
        `${DOCUMENT_LABELS[documentType]}: ${fileError}`,
      ]);

      setSavedMessage("");
      return;
    }

    setDocuments((previous) => ({
      ...previous,
      [documentType]: file,
    }));

    setErrors([]);
    setSavedMessage("");
  };

  /*
   * PRELIMINARY FRONTEND CALCULATIONS
   * The backend must independently calculate and verify the amount.
   */

  const schemeExcluded = isExcludedResearchScheme(
    formData.fundingScheme
  );

  const grantAmount = Number(formData.grantCredited) || 0;

  const totalProjectIncentive = useMemo(
    () =>
      !schemeExcluded &&
      Number.isFinite(grantAmount) &&
      grantAmount > 0
        ? grantAmount * RESEARCH_PROJECT_INCENTIVE_RATE
        : 0,
    [grantAmount, schemeExcluded]
  );

  const facultyShare = useMemo(() => {
    if (schemeExcluded) return 0;

    if (formData.projectRole === "PI") {
      return (
        totalProjectIncentive *
        (PI_SHARE_PERCENTAGE / 100)
      );
    }

    if (formData.projectRole === "CoPI") {
      const totalCoPICount =
        coPrincipalInvestigators.length + 1;

      return (
        (totalProjectIncentive *
          (COPI_SHARE_PERCENTAGE / 100)) /
        totalCoPICount
      );
    }

    return 0;
  }, [
    schemeExcluded,
    formData.projectRole,
    totalProjectIncentive,
    coPrincipalInvestigators.length,
  ]);

  const applicableShare = useMemo(() => {
    if (formData.projectRole === "PI") {
      return "70%";
    }

    if (formData.projectRole === "CoPI") {
      const totalCoPICount =
        coPrincipalInvestigators.length + 1;

      return `30% ÷ ${totalCoPICount} Co-PI${
        totalCoPICount > 1 ? "s" : ""
      }`;
    }

    return "—";
  }, [
    formData.projectRole,
    coPrincipalInvestigators.length,
  ]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(
      Number.isFinite(Number(amount)) ? Number(amount) : 0
    );

  /*
   * FORM VALIDATION
   */

  const validateForm = () => {
    const validationErrors = [];

    if (
      typeof formData.projectTitle !== "string" ||
      !formData.projectTitle.trim()
    ) {
      validationErrors.push("Project Title is required.");
    }

    if (
      typeof formData.projectSanctionId !== "string" ||
      !formData.projectSanctionId.trim()
    ) {
      validationErrors.push("Project / Sanction ID is required.");
    }

    if (
      typeof formData.fundingAgency !== "string" ||
      !formData.fundingAgency.trim()
    ) {
      validationErrors.push("Funding Agency is required.");
    }

    if (
      typeof formData.fundingScheme !== "string" ||
      !formData.fundingScheme.trim()
    ) {
      validationErrors.push("Funding Scheme is required.");
    } else if (schemeExcluded) {
      validationErrors.push(
        "This funding scheme may be excluded under the SRMIST incentive policy. Please verify eligibility with the authorized institutional office before submitting."
      );
    }

    const sanctionedAmount = Number(formData.sanctionedAmount);
    const creditedAmount = Number(formData.grantCredited);
    const duration = Number(formData.durationMonths);

    if (
      formData.sanctionedAmount === "" ||
      !Number.isFinite(sanctionedAmount) ||
      sanctionedAmount <= 0
    ) {
      validationErrors.push(
        "Sanctioned Amount must be greater than zero."
      );
    }

    if (
      formData.grantCredited === "" ||
      !Number.isFinite(creditedAmount) ||
      creditedAmount <= 0
    ) {
      validationErrors.push(
        "Research Grant Credited must be greater than zero."
      );
    }

    if (
      Number.isFinite(sanctionedAmount) &&
      sanctionedAmount > 0 &&
      Number.isFinite(creditedAmount) &&
      creditedAmount > sanctionedAmount
    ) {
      validationErrors.push(
        "Research Grant Credited cannot exceed the Sanctioned Amount."
      );
    }

    if (
      !FINANCIAL_YEARS.some(
        (year) => year.value === formData.financialYear
      )
    ) {
      validationErrors.push(
        "Please select a valid Financial Year."
      );
    }

    if (
      typeof formData.principalInvestigator !== "string" ||
      !formData.principalInvestigator.trim()
    ) {
      validationErrors.push(
        "Principal Investigator is required."
      );
    }

    if (
      !PROJECT_ROLES.some(
        (role) => role.value === formData.projectRole
      )
    ) {
      validationErrors.push("Your Project Role is required.");
    }

    if (
      formData.projectRole === "CoPI" &&
      coPrincipalInvestigators.length === 0
    ) {
      validationErrors.push(
        "At least one other Co-Principal Investigator is required for a Co-PI claim."
      );
    }

    if (
      formData.projectRole === "CoPI" &&
      coPrincipalInvestigators.some(
        (name) => typeof name !== "string" || !name.trim()
      )
    ) {
      validationErrors.push(
        "Please complete all Co-Principal Investigator names."
      );
    }

    if (
      formData.durationMonths === "" ||
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      validationErrors.push(
        "Duration must be a positive whole number of months."
      );
    }

    if (!formData.projectStartDate) {
      validationErrors.push("Project Start Date is required.");
    }

    if (
      formData.projectStartDate &&
      formData.projectEndDate &&
      formData.projectEndDate < formData.projectStartDate
    ) {
      validationErrors.push(
        "Expected End Date cannot be earlier than the Project Start Date."
      );
    }

    REQUIRED_DOCUMENTS.forEach(({ type, label }) => {
      if (!hasDocument(type)) {
        validationErrors.push(`${label} is required.`);
      }
    });

    Object.entries(documents).forEach(([type, file]) => {
      if (!file) return;

      const fileError = validateDocument(file);

      if (fileError) {
        validationErrors.push(
          `${DOCUMENT_LABELS[type]}: ${fileError}`
        );
      }
    });

    return validationErrors;
  };

  /*
   * CLAIM PAYLOAD
   */

  const buildClaimPayload = () => ({
    claimType: "RESEARCH_PROJECT",
    financialYear: formData.financialYear,

    // Client-side estimate only; backend must recalculate.
    incentiveAmount: Number(facultyShare || 0),

    declarationAccepted: true,

    formData: {
      ...formData,
      coPrincipalInvestigators,
    },
  });

  /*
   * SAVE OR UPDATE CLAIM
   */

  const saveClaim = async () => {
    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired.");
    }

    const isUpdating = Boolean(claimId);

    const response = await fetch(
      isUpdating
        ? `${API_BASE_URL}/api/claims/${encodeURIComponent(claimId)}`
        : `${API_BASE_URL}/api/claims`,
      {
        method: isUpdating ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildClaimPayload()),
      }
    );

    if (response.status === 401) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired.");
    }

    const result = await readApiResponse(response);

    if (!response.ok) {
      const error = new Error(
        getApiErrorMessage(
          result,
          "Unable to save the claim."
        )
      );

      error.details = getDetailedApiErrors(result);
      throw error;
    }

    const savedClaim = result?.data?.claim;
    const savedClaimId =
      savedClaim?._id || result?.data?._id || claimId;

    if (!savedClaimId) {
      throw new Error(
        "The claim was saved but no claim ID was returned."
      );
    }

    setClaimId(savedClaimId);

    return {
      ...(savedClaim || {}),
      _id: savedClaimId,
    };
  };

  /*
   * UPLOAD ONE DOCUMENT
   */

  const uploadDocument = async (
    currentClaimId,
    documentType,
    file
  ) => {
    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired.");
    }

    const fileError = validateDocument(file);

    if (fileError) {
      throw new Error(
        `${DOCUMENT_LABELS[documentType]}: ${fileError}`
      );
    }

    const formDataToUpload = new FormData();

    formDataToUpload.append("claimId", currentClaimId);
    formDataToUpload.append("documentType", documentType);
    formDataToUpload.append("document", file);

    const response = await fetch(
      `${API_BASE_URL}/api/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToUpload,
      }
    );

    if (response.status === 401) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired.");
    }

    const result = await readApiResponse(response);

    if (!response.ok) {
      const error = new Error(
        getApiErrorMessage(
          result,
          `Unable to upload ${DOCUMENT_LABELS[documentType]}.`
        )
      );

      error.details = getDetailedApiErrors(result);
      throw error;
    }

    return result?.data?.document || null;
  };

  /*
   * UPLOAD SELECTED DOCUMENTS
   */

  const uploadSelectedDocuments = async (currentClaimId) => {
    const selectedDocuments = REQUIRED_DOCUMENTS.map(
      ({ type }) => ({
        type,
        file: documents[type],
      })
    );

    const uploaded = [];

    for (const item of selectedDocuments) {
      if (!item.file) continue;

      const document = await uploadDocument(
        currentClaimId,
        item.type,
        item.file
      );

      if (document) {
        uploaded.push(document);
      }
    }

    if (uploaded.length > 0) {
      setUploadedDocuments((previous) => {
        const updatedDocuments = [...previous];

        uploaded.forEach((newDocument) => {
          const existingIndex = updatedDocuments.findIndex(
            (document) =>
              document._id === newDocument._id ||
              document.documentType === newDocument.documentType
          );

          if (existingIndex >= 0) {
            updatedDocuments[existingIndex] = newDocument;
          } else {
            updatedDocuments.push(newDocument);
          }
        });

        return updatedDocuments;
      });

      setDocuments((previous) => {
        const updated = { ...previous };

        uploaded.forEach((uploadedDocument) => {
          const type = uploadedDocument.documentType;

          if (type && updated[type]) {
            updated[type] = null;
          }
        });

        return updated;
      });
    }

    return uploaded;
  };

  /*
   * DISPLAY ERRORS
   */

  const displayError = (error, fallback) => {
    const details = Array.isArray(error?.details)
      ? error.details
      : [];

    const formattedDetails = details
      .map((detail) =>
        typeof detail === "string"
          ? detail.trim()
          : formatValidationFinding(detail)
      )
      .filter(Boolean);

    setErrors(
      formattedDetails.length > 0
        ? [...new Set(formattedDetails)]
        : [error?.message || fallback]
    );

    setSavedMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
   * SAVE DRAFT OR SAVE CORRECTIONS
   */

  const handleSaveDraft = async () => {
    if (saving || submitting) return;

    try {
      setSaving(true);
      setErrors([]);
      setSavedMessage("");

      const savedClaim = await saveClaim();

      await uploadSelectedDocuments(savedClaim._id);

      setSavedMessage(
        isEditingReturnedClaim
          ? "Corrections saved. Your claim remains returned until you resubmit it."
          : "Draft saved successfully."
      );
    } catch (error) {
      console.error(
        "Save research project draft error:",
        error
      );

      displayError(error, "Unable to save the draft.");
    } finally {
      setSaving(false);
    }
  };

  /*
   * SUBMIT OR RESUBMIT CLAIM
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || submitting) return;

    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSavedMessage("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSubmitting(true);
      setErrors([]);
      setSavedMessage("");

      const savedClaim = await saveClaim();

      await uploadSelectedDocuments(savedClaim._id);

      const token = getToken();

      if (!token) {
        clearSessionAndRedirect(navigate);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/claims/${encodeURIComponent(
          savedClaim._id
        )}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        clearSessionAndRedirect(navigate);
        return;
      }

      const result = await readApiResponse(response);

      if (!response.ok) {
        const submissionError = new Error(
          getApiErrorMessage(
            result,
            "Unable to submit the claim."
          )
        );

        submissionError.details = getDetailedApiErrors(result);
        throw submissionError;
      }

      setSavedMessage(
        isEditingReturnedClaim
          ? "Corrected claim resubmitted successfully."
          : "Claim submitted successfully."
      );

      window.setTimeout(() => {
        navigate("/claims");
      }, 900);
    } catch (error) {
      console.error(
        "Submit research project claim error:",
        error
      );

      displayError(error, "Unable to submit the claim.");
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * DELETE DOCUMENT
   */

  const handleDeleteDocument = async (documentId) => {
    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      return;
    }

    if (!documentId || deletingDocumentId) return;

    try {
      setDeletingDocumentId(documentId);
      setErrors([]);
      setSavedMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/documents/${encodeURIComponent(
          documentId
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        clearSessionAndRedirect(navigate);
        return;
      }

      const result = await readApiResponse(response);

      if (!response.ok) {
        const deleteError = new Error(
          getApiErrorMessage(
            result,
            "Unable to delete the document."
          )
        );

        deleteError.details = getDetailedApiErrors(result);
        throw deleteError;
      }

      setUploadedDocuments((previous) =>
        previous.filter(
          (document) => document._id !== documentId
        )
      );

      setSavedMessage("Document removed successfully.");
    } catch (error) {
      console.error(
        "Delete research project document error:",
        error
      );

      displayError(error, "Unable to delete the document.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  /*
   * PAGE RENDER
   */

  return (
    <div className="rims-page research-project-page">
      <section className="research-project-header">
        <button
          type="button"
          className="research-project-back"
          onClick={() => navigate("/claims")}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <div className="research-project-heading">
          <span className="page-eyebrow">INCENTIVE CATEGORY</span>

          <h1 className="page-title">
            {isEditingReturnedClaim
              ? "Correct Returned Research Project Claim"
              : isEditingDraft
              ? "Continue Research Project Claim"
              : "New Research Project Claim"}
          </h1>

          <p className="page-description">
            {isEditingReturnedClaim
              ? "Correct the requested details and supporting documents, then resubmit this existing claim."
              : "Submit an incentive claim for an externally funded research project under the FSH Policy on Incentives R1.0."}
          </p>
        </div>
      </section>

      {isEditingReturnedClaim && draftClaim?.reviewComment && (
        <section className="rims-card research-validation-card">
          <div className="research-validation-header">
            <CircleAlert size={18} />

            <div>
              <strong>Administrator's correction request</strong>
              <span>
                Please address the following feedback before resubmitting.
              </span>
            </div>
          </div>

          <p>{draftClaim.reviewComment}</p>
        </section>
      )}

      {errors.length > 0 && (
        <section
          className="rims-card research-validation-card"
          role="alert"
          aria-live="assertive"
        >
          <div className="research-validation-header">
            <CircleAlert size={18} />

            <div>
              <strong>Please review the following items</strong>
              <span>
                Correct the following items before continuing.
              </span>
            </div>
          </div>

          <ul className="research-validation-list">
            {errors.map((error, index) => (
              <li key={`${error}-${index}`}>
                <span>×</span>
                {error}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* PROJECT INFORMATION */}

        <section className="rims-card research-form-card">
          <SectionHeader
            icon={<FolderKanban size={18} />}
            title="Project Information"
            description="Enter the basic details of the externally funded research project."
          />

          <div className="research-form-body">
            <div className="research-form-grid">
              <Field full label="Project Title" required>
                <input
                  type="text"
                  value={formData.projectTitle}
                  onChange={(event) =>
                    updateField("projectTitle", event.target.value)
                  }
                  placeholder="Enter the research project title"
                />
              </Field>

              <Field label="Project / Sanction ID" required>
                <input
                  type="text"
                  value={formData.projectSanctionId}
                  onChange={(event) =>
                    updateField(
                      "projectSanctionId",
                      event.target.value
                    )
                  }
                  placeholder="Enter project or sanction ID"
                />
              </Field>

              <Field label="Funding Agency" required>
                <input
                  type="text"
                  value={formData.fundingAgency}
                  onChange={(event) =>
                    updateField("fundingAgency", event.target.value)
                  }
                  placeholder="Enter funding agency"
                />
              </Field>

              <Field
                label="Funding Scheme"
                required
                hint="Enter the exact scheme name stated in your sanction or award letter."
              >
                <input
                  type="text"
                  value={formData.fundingScheme}
                  onChange={(event) =>
                    updateField("fundingScheme", event.target.value)
                  }
                  placeholder="Enter the funding scheme name"
                />
              </Field>

              <Field
                label="Sanctioned Amount"
                required
                hint="Total sanctioned amount stated in the sanction documentation."
              >
                <CurrencyInput
                  value={formData.sanctionedAmount}
                  onChange={(value) =>
                    updateField("sanctionedAmount", value)
                  }
                />
              </Field>

              <Field
                label="Financial Year"
                required
                hint="Financial year in which the research grant was credited in the SRMIST account."
              >
                <select
                  value={formData.financialYear}
                  onChange={(event) =>
                    updateField("financialYear", event.target.value)
                  }
                >
                  {FINANCIAL_YEARS.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </section>

        {/* INCENTIVE BASIS */}

        <section className="rims-card research-form-card">
          <SectionHeader
            icon={<IndianRupee size={18} />}
            title="Incentive Basis"
            description="Provide the research grant amount credited during the selected financial year."
          />

          <div className="research-form-body">
            <div className="research-form-grid">
              <Field
                full
                label="Research Grant Credited"
                required
                hint="Enter the research grant credited in the SRMIST account during the selected financial year."
              >
                <CurrencyInput
                  value={formData.grantCredited}
                  onChange={(value) =>
                    updateField("grantCredited", value)
                  }
                />
              </Field>
            </div>

            <div className="research-policy-note">
              <CircleAlert size={17} />

              <div>
                <strong>Policy calculation</strong>
                <p>
                  Research Project incentive = 5% of the research
                  grant credited in the SRMIST account during the
                  relevant financial year.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INVESTIGATORS */}

        <section className="rims-card research-form-card">
          <SectionHeader
            icon={<UsersRound size={18} />}
            title="Investigators"
            description="Identify the investigators associated with this project and your role."
          />

          <div className="research-form-body">
            <div className="research-form-grid">
              <Field label="Principal Investigator" required>
                <input
                  type="text"
                  value={formData.principalInvestigator}
                  onChange={(event) =>
                    updateField(
                      "principalInvestigator",
                      event.target.value
                    )
                  }
                  placeholder="Enter principal investigator"
                />
              </Field>

              <Field label="Your Role" required>
                <select
                  value={formData.projectRole}
                  onChange={(event) => {
                    const role = event.target.value;

                    updateField("projectRole", role);

                    if (role === "PI") {
                      setCoPrincipalInvestigators([]);
                    }
                  }}
                >
                  <option value="">Select your role</option>

                  {PROJECT_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="research-subsection">
              <div className="research-subsection-header">
                <div>
                  <h3>Co-Principal Investigators</h3>
                  <p>Add the Co-PIs associated with this project.</p>
                </div>

                <button
                  type="button"
                  className="research-add-button"
                  onClick={addCoPrincipalInvestigator}
                >
                  <Plus size={15} />
                  Add Co-PI
                </button>
              </div>

              {coPrincipalInvestigators.length === 0 ? (
                <div className="research-empty-inline">
                  <UsersRound size={18} />
                  <span>
                    No Co-Principal Investigators added.
                  </span>
                </div>
              ) : (
                <div className="research-co-pi-list">
                  {coPrincipalInvestigators.map((name, index) => (
                    <div
                      className="research-co-pi-row"
                      key={`co-pi-${index}`}
                    >
                      <span className="research-co-pi-number">
                        {index + 1}
                      </span>

                      <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                          updateCoPrincipalInvestigator(
                            index,
                            event.target.value
                          )
                        }
                        placeholder={`Co-Principal Investigator ${
                          index + 1
                        }`}
                      />

                      <button
                        type="button"
                        className="research-remove-button"
                        onClick={() =>
                          removeCoPrincipalInvestigator(index)
                        }
                        aria-label={`Remove Co-Principal Investigator ${
                          index + 1
                        }`}
                        title="Remove Co-PI"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PROJECT DURATION */}

        <section className="rims-card research-form-card">
          <SectionHeader
            icon={<FolderKanban size={18} />}
            title="Project Duration"
            description="Record the project period from the sanction documentation."
          />

          <div className="research-form-body">
            <div className="research-form-grid">
              <Field label="Duration (months)" required>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.durationMonths}
                  onChange={(event) =>
                    updateField(
                      "durationMonths",
                      event.target.value
                    )
                  }
                  placeholder="Enter duration"
                />
              </Field>

              <Field label="Project Start Date" required>
                <input
                  type="date"
                  value={formData.projectStartDate}
                  onChange={(event) =>
                    updateField(
                      "projectStartDate",
                      event.target.value
                    )
                  }
                />
              </Field>

              <Field label="Expected End Date">
                <input
                  type="date"
                  min={formData.projectStartDate || undefined}
                  value={formData.projectEndDate}
                  onChange={(event) =>
                    updateField(
                      "projectEndDate",
                      event.target.value
                    )
                  }
                />
              </Field>
            </div>
          </div>
        </section>

        {/* SUPPORTING DOCUMENTS */}

        <section className="rims-card research-form-card">
          <SectionHeader
            icon={<FileCheck2 size={18} />}
            title="Supporting Documents"
            description="Attach the documents required to support the Research Project incentive claim."
          />

          <div className="research-form-body">
            <div className="research-document-list">
              <DocumentUpload
                label={DOCUMENT_LABELS.sanctionLetter}
                description="Document confirming the externally funded research project."
                required
                file={documents.sanctionLetter}
                uploadedDocument={getUploadedDocument(
                  DOCUMENT_TYPES.sanctionLetter
                )}
                deletingDocumentId={deletingDocumentId}
                onChange={(file) =>
                  handleDocumentChange("sanctionLetter", file)
                }
                onDelete={handleDeleteDocument}
              />

              <DocumentUpload
                label={DOCUMENT_LABELS.grantCreditEvidence}
                description="Evidence showing that the research grant was credited in the SRMIST account."
                required
                file={documents.grantCreditEvidence}
                uploadedDocument={getUploadedDocument(
                  DOCUMENT_TYPES.grantCreditEvidence
                )}
                deletingDocumentId={deletingDocumentId}
                onChange={(file) =>
                  handleDocumentChange("grantCreditEvidence", file)
                }
                onDelete={handleDeleteDocument}
              />

              <DocumentUpload
                label={DOCUMENT_LABELS.utilizationCertificate}
                description="Utilization Certificate required for release of the research project incentive."
                required
                file={documents.utilizationCertificate}
                uploadedDocument={getUploadedDocument(
                  DOCUMENT_TYPES.utilizationCertificate
                )}
                deletingDocumentId={deletingDocumentId}
                onChange={(file) =>
                  handleDocumentChange(
                    "utilizationCertificate",
                    file
                  )
                }
                onDelete={handleDeleteDocument}
              />
            </div>

            {loadingDocuments && (
              <div className="research-document-note">
                <FileText size={17} />
                <p>Loading previously uploaded documents...</p>
              </div>
            )}

            <div className="research-document-note">
              <FileText size={17} />
              <p>
                Accepted formats: PDF, JPG, JPEG, and PNG. Maximum
                file size: 10 MB per document.
              </p>
            </div>
          </div>
        </section>

        {/* INCENTIVE CALCULATION */}

        <section className="rims-card research-form-card">
          <SectionHeader
            icon={<Calculator size={18} />}
            title="Incentive Calculation"
            description="View the preliminary Research Project incentive calculation based on Policy R1.0."
          />

          <div className="research-form-body">
            <div className="research-calculation-result">
              <div>
                <span>Your Estimated Incentive</span>
                <small>
                  Based on the information entered above
                </small>
              </div>

              <strong>{formatCurrency(facultyShare)}</strong>
            </div>

            {schemeExcluded && (
              <div className="research-policy-note" role="alert">
                <CircleAlert size={17} />

                <div>
                  <strong>Eligibility verification required</strong>
                  <p>
                    This scheme may fall under a category excluded
                    by the SRMIST policy. The incentive estimate is
                    suppressed. Confirm eligibility with the
                    authorized institutional office before proceeding.
                  </p>
                </div>
              </div>
            )}

            <div className="research-calculation-grid">
              <CalculationItem
                label="Research Grant Credited"
                value={formatCurrency(grantAmount)}
              />

              <CalculationItem
                label="Policy Rate"
                value="5%"
              />

              <CalculationItem
                label="Total Project Incentive"
                value={formatCurrency(totalProjectIncentive)}
              />

              <CalculationItem
                label="Your Role"
                value={
                  formData.projectRole === "PI"
                    ? "Principal Investigator"
                    : formData.projectRole === "CoPI"
                    ? "Co-Principal Investigator"
                    : "—"
                }
              />

              <CalculationItem
                label="Applicable Share"
                value={applicableShare}
              />

              <CalculationItem
                label="Financial Year"
                value={
                  FINANCIAL_YEARS.find(
                    (year) =>
                      year.value === formData.financialYear
                  )?.label || "—"
                }
              />
            </div>

            <div className="research-calculation-explanation">
              <div className="research-calculation-equation">
                <span>Grant Credited</span>
                <strong>×</strong>
                <span>5%</span>
                <strong>=</strong>
                <span>Total Project Incentive</span>
              </div>

              <p>
                PI share: 70% of the total project incentive. Co-PI
                share: 30% of the total project incentive divided by
                the total number of Co-PIs, including the claimant.
                Final eligibility and amount are subject to institutional
                verification.
              </p>
            </div>
          </div>
        </section>

        {/* SUBMISSION */}

        <section className="rims-card research-submission-card">
          <div className="research-submission-content">
            <div>
              <span className="page-eyebrow">
                CLAIM SUBMISSION
              </span>

              <h2>
                {isEditingReturnedClaim
                  ? "Ready to resubmit your claim?"
                  : "Ready to submit?"}
              </h2>

              <p>
                {isEditingReturnedClaim
                  ? "Correct the administrator's feedback, replace any incorrect documents, and resubmit this claim for review."
                  : "Save your work as a draft or submit the completed claim for institutional verification."}
              </p>
            </div>

            <div className="research-submission-meta">
              <span>Policy</span>
              <strong>R1.0</strong>
            </div>
          </div>

          <div className="research-form-actions">
            <button
              type="button"
              className="research-secondary-button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
            >
              <Save size={16} />
              {saving
                ? "Saving..."
                : isEditingReturnedClaim
                ? "Save Corrections"
                : "Save as Draft"}
            </button>

            <button
              type="submit"
              className="research-primary-button"
              disabled={saving || submitting}
            >
              <FileCheck2 size={16} />
              {submitting
                ? "Submitting..."
                : isEditingReturnedClaim
                ? "Resubmit Claim"
                : "Submit Claim"}
            </button>
          </div>
        </section>

        {savedMessage && (
          <div
            className="research-form-message"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 size={16} />
            <span>{savedMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
}

/* SECTION HEADER */

function SectionHeader({ icon, title, description }) {
  return (
    <div className="research-form-section-header">
      <div className="research-form-section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

/* FIELD */

function Field({
  label,
  required = false,
  hint,
  full = false,
  children,
}) {
  return (
    <div
      className={`research-field ${
        full ? "research-field-full" : ""
      }`}
    >
      <label>
        {label}
        {required && <span>*</span>}
      </label>

      {children}

      {hint && <small>{hint}</small>}
    </div>
  );
}

/* CURRENCY INPUT */

function CurrencyInput({ value, onChange }) {
  return (
    <div className="research-input-prefix">
      <span>₹</span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0.00"
      />
    </div>
  );
}

/* CALCULATION ITEM */

function CalculationItem({ label, value }) {
  return (
    <div className="research-calculation-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* DOCUMENT UPLOAD */

function DocumentUpload({
  label,
  description,
  required = false,
  file,
  uploadedDocument,
  deletingDocumentId,
  onChange,
  onDelete,
}) {
  return (
    <div className="research-document-item">
      <div className="research-document-information">
        <div className="research-document-icon">
          <FileText size={18} />
        </div>

        <div>
          <div className="research-document-title">
            <strong>{label}</strong>

            {required && (
              <span className="research-document-required">
                Required
              </span>
            )}
          </div>

          <p>{description}</p>

          {uploadedDocument && (
            <div className="research-uploaded-document">
              <span>
                Uploaded:{" "}
                {uploadedDocument.originalName || "Document"}
              </span>

              <button
                type="button"
                onClick={() => onDelete(uploadedDocument._id)}
                disabled={
                  deletingDocumentId === uploadedDocument._id
                }
              >
                <Trash2 size={14} />

                {deletingDocumentId === uploadedDocument._id
                  ? "Removing..."
                  : "Remove"}
              </button>
            </div>
          )}
        </div>
      </div>

      <label className="research-upload-button">
        <Upload size={15} />

        <span>{file ? "Replace File" : "Choose File"}</span>

        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];

            if (selectedFile) {
              onChange(selectedFile);
            }

            event.target.value = "";
          }}
        />
      </label>

      {file && (
        <span className="research-selected-file">
          {file.name}
        </span>
      )}
    </div>
  );
}

export default ResearchProject;
