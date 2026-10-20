
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  IndianRupee,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import "./PostgraduateResearch.css";

// =========================================================
// API CONFIGURATION
// =========================================================

const API_BASE_URL = "http://localhost:5000";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

const RESEARCH_LEVELS = [
  "Department Level",
  "Institution Level",
  "Inter-Institutional",
  "National",
  "International",
];

const FACULTY_ROLES = [
  "Research Supervisor",
  "Co-Supervisor",
  "Research Mentor",
];

const PROGRAM_LEVELS = [
  "M.Tech",
  "M.E.",
  "M.Phil.",
  "Ph.D.",
  "Other",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPES = {
  approvalLetter: "approvalLetter",
  registrationProof: "registrationProof",
  researchReport: "researchReport",
  completionCertificate: "completionCertificate",
  supportingEvidence: "supportingEvidence",
};

const DOCUMENT_LABELS = {
  approvalLetter: "Research Approval Letter",
  registrationProof: "Scholar Registration Proof",
  researchReport: "Research Report",
  completionCertificate: "Completion Certificate",
  supportingEvidence: "Supporting Evidence",
};

// =========================================================
// INITIAL FORM DATA
// =========================================================

const createInitialFormData = () => ({
  researchTitle: "",
  scholarName: "",
  scholarRegisterNumber: "",
  programLevel: "",
  otherProgram: "",
  department: "",
  researchLevel: "",
  projectStartDate: "",
  projectEndDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  facultyName: "",
  facultyRole: "",
  researchArea: "",
  researchDescription: "",
  researchOutcome: "",
  incentiveAmount: "",
});

const createInitialDocuments = () => ({
  approvalLetter: null,
  registrationProof: null,
  researchReport: null,
  completionCertificate: null,
  supportingEvidence: null,
});

// =========================================================
// HELPERS
// =========================================================

const getToken = () => {
  return localStorage.getItem("rimsToken");
};

const getClaimFormData = (claim) => {
  return claim?.formData || {};
};

const normalizeDate = (value) => {
  if (!value) return "";

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

const getErrorMessage = async (response) => {
  try {
    const result = await response.json();

    return (
      result?.message ||
      "Something went wrong. Please try again."
    );
  } catch {
    return "Something went wrong. Please try again.";
  }
};

// =========================================================
// COMPONENT
// =========================================================

function PostgraduateResearch() {
  const navigate = useNavigate();
  const location = useLocation();

  const draftClaim =
    location.state?.draftClaim || null;

  const isEditingDraft = Boolean(
    location.state?.isEditingDraft &&
      draftClaim?._id
  );

  const [claimId, setClaimId] = useState(
    draftClaim?._id || null
  );

  const [formData, setFormData] = useState(() => {
    const existingData = getClaimFormData(draftClaim);

    return {
      ...createInitialFormData(),
      ...existingData,
      financialYear:
        draftClaim?.financialYear ||
        existingData.financialYear ||
        CURRENT_FINANCIAL_YEAR,
      incentiveAmount:
        draftClaim?.incentiveAmount ??
        existingData.incentiveAmount ??
        "",
      projectStartDate: normalizeDate(
        existingData.projectStartDate
      ),
      projectEndDate: normalizeDate(
        existingData.projectEndDate
      ),
    };
  });

  const [scholars, setScholars] = useState(() => {
    const existingScholars =
      getClaimFormData(draftClaim).scholars;

    return Array.isArray(existingScholars)
      ? existingScholars.map((scholar, index) => ({
          ...scholar,
          id: scholar.id || `${Date.now()}-${index}`,
        }))
      : [];
  });

  const [documents, setDocuments] = useState(
    createInitialDocuments
  );

  const [uploadedDocuments, setUploadedDocuments] =
    useState([]);

  const [declarationAccepted, setDeclarationAccepted] =
    useState(Boolean(draftClaim?.declarationAccepted));

  const [errors, setErrors] = useState({});

  const [apiError, setApiError] = useState("");

  const [savedMessage, setSavedMessage] = useState("");

  const [saving, setSaving] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [loadingDocuments, setLoadingDocuments] =
    useState(false);

  // =========================================================
  // SESSION HANDLING
  // =========================================================

  const handleSessionExpired = () => {
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("rimsUser");

    navigate("/");
  };

  // =========================================================
  // LOAD EXISTING DOCUMENTS WHEN EDITING A DRAFT
  // =========================================================

  useEffect(() => {
    const loadDocuments = async () => {
      if (!claimId) {
        setUploadedDocuments([]);
        return;
      }

      const token = getToken();

      if (!token) {
        handleSessionExpired();
        return;
      }

      try {
        setLoadingDocuments(true);

        const response = await fetch(
          `${API_BASE_URL}/api/documents?claimId=${claimId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          handleSessionExpired();
          return;
        }

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response)
          );
        }

        const result = await response.json();

        setUploadedDocuments(
          Array.isArray(result?.data?.documents)
            ? result.data.documents
            : []
        );
      } catch (error) {
        console.error(
          "Unable to load postgraduate documents:",
          error
        );

        setApiError(error.message);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [claimId]);

  // =========================================================
  // FIELD CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiError("");
    setSavedMessage("");
  };

  // =========================================================
  // DOCUMENT SELECTION
  // =========================================================

  const handleFileChange = (name, file) => {
    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiError("");
    setSavedMessage("");

    if (!file) {
      setDocuments((previous) => ({
        ...previous,
        [name]: null,
      }));

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((previous) => ({
        ...previous,
        [name]: "File size must not exceed 10 MB.",
      }));

      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors((previous) => ({
        ...previous,
        [name]:
          "Only PDF, JPG, JPEG, and PNG files are allowed.",
      }));

      return;
    }

    setDocuments((previous) => ({
      ...previous,
      [name]: file,
    }));
  };

  // =========================================================
  // ADDITIONAL SCHOLARS
  // =========================================================

  const addScholar = () => {
    setScholars((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: "",
        registerNumber: "",
        programLevel: "",
      },
    ]);

    setSavedMessage("");
  };

  const updateScholar = (id, field, value) => {
    setScholars((previous) =>
      previous.map((scholar) =>
        scholar.id === id
          ? {
              ...scholar,
              [field]: value,
            }
          : scholar
      )
    );

    setErrors((previous) => ({
      ...previous,
      scholars: "",
    }));

    setSavedMessage("");
  };

  const removeScholar = (id) => {
    setScholars((previous) =>
      previous.filter((scholar) => scholar.id !== id)
    );

    setErrors((previous) => ({
      ...previous,
      scholars: "",
    }));
  };

  // =========================================================
  // CHECK EXISTING DOCUMENTS
  // =========================================================

  const hasDocument = (documentType) => {
    return uploadedDocuments.some(
      (document) =>
        document.documentType === documentType
    );
  };

  // =========================================================
  // FORM VALIDATION
  // =========================================================

  const validateForm = () => {
    const newErrors = {};

    if (!formData.researchTitle.trim()) {
      newErrors.researchTitle =
        "Research title is required.";
    }

    if (!formData.scholarName.trim()) {
      newErrors.scholarName =
        "Primary scholar name is required.";
    }

    if (!formData.scholarRegisterNumber.trim()) {
      newErrors.scholarRegisterNumber =
        "Scholar register number is required.";
    }

    if (!formData.programLevel) {
      newErrors.programLevel =
        "Program level is required.";
    }

    if (
      formData.programLevel === "Other" &&
      !formData.otherProgram.trim()
    ) {
      newErrors.otherProgram =
        "Please specify the program level.";
    }

    if (!formData.department.trim()) {
      newErrors.department =
        "Department is required.";
    }

    if (!formData.researchLevel) {
      newErrors.researchLevel =
        "Research level is required.";
    }

    if (!formData.projectStartDate) {
      newErrors.projectStartDate =
        "Project start date is required.";
    }

    if (!formData.projectEndDate) {
      newErrors.projectEndDate =
        "Project end date is required.";
    }

    if (
      formData.projectStartDate &&
      formData.projectEndDate &&
      formData.projectEndDate < formData.projectStartDate
    ) {
      newErrors.projectEndDate =
        "End date cannot be before the start date.";
    }

    if (!formData.financialYear) {
      newErrors.financialYear =
        "Financial year is required.";
    }

    if (!formData.facultyName.trim()) {
      newErrors.facultyName =
        "Faculty name is required.";
    }

    if (!formData.facultyRole) {
      newErrors.facultyRole =
        "Faculty role is required.";
    }

    if (!formData.researchArea.trim()) {
      newErrors.researchArea =
        "Research area is required.";
    }

    if (!formData.researchDescription.trim()) {
      newErrors.researchDescription =
        "Research description is required.";
    }

    if (!formData.researchOutcome.trim()) {
      newErrors.researchOutcome =
        "Research outcome is required.";
    }

    if (
      formData.incentiveAmount !== "" &&
      (
        !Number.isFinite(Number(formData.incentiveAmount)) ||
        Number(formData.incentiveAmount) < 0
      )
    ) {
      newErrors.incentiveAmount =
        "Enter a valid non-negative incentive amount.";
    }

    // Required documents can be either already uploaded
    // or selected now.

    const requiredDocuments = [
      "approvalLetter",
      "registrationProof",
      "researchReport",
    ];

    requiredDocuments.forEach((documentType) => {
      if (
        !documents[documentType] &&
        !hasDocument(documentType)
      ) {
        newErrors[documentType] =
          `${DOCUMENT_LABELS[documentType]} is required.`;
      }
    });

    if (!declarationAccepted) {
      newErrors.declaration =
        "You must accept the declaration.";
    }

    const invalidScholar = scholars.some(
      (scholar) => !scholar.name.trim()
    );

    if (invalidScholar) {
      newErrors.scholars =
        "Enter the name for every additional scholar.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =========================================================
  // BUILD BACKEND CLAIM PAYLOAD
  // =========================================================

  const buildClaimPayload = () => {
    const cleanedScholars = scholars.map(
      ({ id, ...scholar }) => scholar
    );

    return {
      claimType: "POSTGRADUATE_RESEARCH",

      financialYear: formData.financialYear,

      incentiveAmount: Number(
        formData.incentiveAmount || 0
      ),

      declarationAccepted,

      formData: {
        ...formData,
        scholars: cleanedScholars,
      },
    };
  };

  // =========================================================
  // CREATE OR UPDATE CLAIM
  // =========================================================

  const saveClaim = async () => {
    const token = getToken();

    if (!token) {
      handleSessionExpired();

      throw new Error("Your session has expired.");
    }

    const isUpdating = Boolean(claimId);

    const response = await fetch(
      isUpdating
        ? `${API_BASE_URL}/api/claims/${claimId}`
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
      handleSessionExpired();

      throw new Error("Your session has expired.");
    }

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response)
      );
    }

    const result = await response.json();

    const savedClaim = result?.data?.claim;

    const savedClaimId =
      savedClaim?._id ||
      result?.data?._id ||
      claimId;

    if (!savedClaimId) {
      throw new Error(
        "Claim was saved, but the server did not return a claim ID."
      );
    }

    setClaimId(savedClaimId);

    return savedClaimId;
  };

  // =========================================================
  // UPLOAD ONE DOCUMENT TO BACKEND
  // =========================================================

  const uploadDocument = async (
    currentClaimId,
    documentType,
    file
  ) => {
    const token = getToken();

    if (!token) {
      handleSessionExpired();

      throw new Error("Your session has expired.");
    }

    const uploadData = new FormData();

    uploadData.append("claimId", currentClaimId);
    uploadData.append("documentType", documentType);
    uploadData.append("document", file);

    const response = await fetch(
      `${API_BASE_URL}/api/documents`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: uploadData,
      }
    );

    if (response.status === 401) {
      handleSessionExpired();

      throw new Error("Your session has expired.");
    }

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response)
      );
    }

    const result = await response.json();

    return result?.data?.document;
  };

  // =========================================================
  // UPLOAD ALL NEWLY SELECTED DOCUMENTS
  // =========================================================

  const uploadSelectedDocuments = async (currentClaimId) => {
    const selectedDocuments = Object.entries(
      DOCUMENT_TYPES
    );

    for (const [fieldName, documentType] of selectedDocuments) {
      const file = documents[fieldName];

      if (!file) {
        continue;
      }

      const uploadedDocument = await uploadDocument(
        currentClaimId,
        documentType,
        file
      );

      if (uploadedDocument) {
        setUploadedDocuments((previous) => [
          ...previous,
          uploadedDocument,
        ]);
      }

      // Clear only the file that was uploaded successfully.
      setDocuments((previous) => ({
        ...previous,
        [fieldName]: null,
      }));
    }
  };

  // =========================================================
  // SAVE DRAFT
  // =========================================================

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setApiError("");
      setSavedMessage("");

      const savedClaimId = await saveClaim();

      await uploadSelectedDocuments(savedClaimId);

      setSavedMessage(
        "Postgraduate research draft saved successfully."
      );
    } catch (error) {
      console.error(
        "Save postgraduate research draft error:",
        error
      );

      setApiError(
        error.message || "Unable to save the draft."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // SUBMIT CLAIM
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setApiError("");
    setSavedMessage("");

    const isValid = validateForm();

    if (!isValid) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSubmitting(true);

      // First save the claim as a draft.
      const savedClaimId = await saveClaim();

      // Upload any newly selected documents.
      await uploadSelectedDocuments(savedClaimId);

      const token = getToken();

      if (!token) {
        handleSessionExpired();
        return;
      }

      // Finally submit the saved claim.
      const response = await fetch(
        `${API_BASE_URL}/api/claims/${savedClaimId}/submit`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response)
        );
      }

      setSavedMessage(
        "Postgraduate research claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 1000);
    } catch (error) {
      console.error(
        "Postgraduate claim submission error:",
        error
      );

      setApiError(
        error.message || "Unable to submit the claim."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // DELETE AN UPLOADED DOCUMENT
  // =========================================================

  const handleDeleteDocument = async (documentId) => {
    const token = getToken();

    if (!token) {
      handleSessionExpired();
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${documentId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response)
        );
      }

      setUploadedDocuments((previous) =>
        previous.filter(
          (document) => document._id !== documentId
        )
      );

      setSavedMessage("Document removed successfully.");
    } catch (error) {
      setApiError(error.message);
    }
  };

  // =========================================================
  // VIEW UPLOADED DOCUMENT
  // =========================================================

  const handleViewDocument = async (documentId) => {
    const token = getToken();

    if (!token) {
      handleSessionExpired();
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${documentId}/file`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(
          "Unable to open this document."
        );
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    } catch (error) {
      setApiError(error.message);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="postgraduate-research-page">

      {/* PAGE HEADER */}

      <header className="postgraduate-research-header">
        <button
          type="button"
          className="postgraduate-research-back"
          onClick={() => navigate("/claims")}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <div className="postgraduate-research-heading">
          <div className="postgraduate-research-eyebrow">
            INCENTIVE CATEGORY
          </div>

          <div className="postgraduate-research-title-row">
            <div className="postgraduate-research-title-icon">
              <BookOpen size={22} />
            </div>

            <div>
              <h1 className="postgraduate-research-page-title">
                {isEditingDraft
                  ? "Continue Postgraduate Research Claim"
                  : "Postgraduate Research"}
              </h1>

              <p className="postgraduate-research-page-description">
                Submit an incentive claim for postgraduate
                research supervision, mentoring, and research
                outcomes.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* API ERROR */}

      {apiError && (
        <div className="postgraduate-research-message">
          <span>{apiError}</span>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {savedMessage && (
        <div className="postgraduate-research-message">
          <CheckCircle2 size={17} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* FORM */}

      <form
        className="postgraduate-research-form"
        onSubmit={handleSubmit}
      >

        {/* RESEARCH INFORMATION */}

        <section className="postgraduate-research-card">
          <SectionHeader
            icon={<BookOpen size={18} />}
            title="Research Information"
            description="Provide the core information about the postgraduate research activity."
          />

          <div className="postgraduate-research-form-body">
            <div className="postgraduate-research-form-grid">

              <FormField
                label="Research Title"
                required
                error={errors.researchTitle}
                full
              >
                <input
                  type="text"
                  name="researchTitle"
                  value={formData.researchTitle}
                  onChange={handleChange}
                  placeholder="Enter the research title"
                />
              </FormField>

              <FormField
                label="Primary Scholar Name"
                required
                error={errors.scholarName}
              >
                <input
                  type="text"
                  name="scholarName"
                  value={formData.scholarName}
                  onChange={handleChange}
                  placeholder="Enter scholar name"
                />
              </FormField>

              <FormField
                label="Scholar Register Number"
                required
                error={errors.scholarRegisterNumber}
              >
                <input
                  type="text"
                  name="scholarRegisterNumber"
                  value={formData.scholarRegisterNumber}
                  onChange={handleChange}
                  placeholder="Enter register number"
                />
              </FormField>

              <FormField
                label="Program Level"
                required
                error={errors.programLevel}
              >
                <select
                  name="programLevel"
                  value={formData.programLevel}
                  onChange={handleChange}
                >
                  <option value="">Select program level</option>

                  {PROGRAM_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </FormField>

              {formData.programLevel === "Other" && (
                <FormField
                  label="Specify Program"
                  required
                  error={errors.otherProgram}
                >
                  <input
                    type="text"
                    name="otherProgram"
                    value={formData.otherProgram}
                    onChange={handleChange}
                    placeholder="Specify the program"
                  />
                </FormField>
              )}

              <FormField
                label="Department"
                required
                error={errors.department}
              >
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Enter department"
                />
              </FormField>

              <FormField
                label="Research Level"
                required
                error={errors.researchLevel}
              >
                <select
                  name="researchLevel"
                  value={formData.researchLevel}
                  onChange={handleChange}
                >
                  <option value="">Select research level</option>

                  {RESEARCH_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Project Start Date"
                required
                error={errors.projectStartDate}
              >
                <input
                  type="date"
                  name="projectStartDate"
                  value={formData.projectStartDate}
                  onChange={handleChange}
                />
              </FormField>

              <FormField
                label="Project End Date"
                required
                error={errors.projectEndDate}
              >
                <input
                  type="date"
                  name="projectEndDate"
                  value={formData.projectEndDate}
                  onChange={handleChange}
                />
              </FormField>

              <FormField
                label="Financial Year"
                required
                error={errors.financialYear}
              >
                <select
                  name="financialYear"
                  value={formData.financialYear}
                  onChange={handleChange}
                >
                  {FINANCIAL_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </FormField>

            </div>
          </div>
        </section>

        {/* SCHOLAR INFORMATION */}

        <section className="postgraduate-research-card">
          <SectionHeader
            icon={<Users size={18} />}
            title="Scholar Information"
            description="Add additional scholars involved in the postgraduate research activity."
          />

          <div className="postgraduate-research-form-body">
            <div className="postgraduate-research-subsection">

              <div className="postgraduate-research-subsection-header">
                <div>
                  <strong>Additional Scholars</strong>
                  <p>
                    Add other scholars associated with this
                    research activity, if applicable.
                  </p>
                </div>

                <button
                  type="button"
                  className="postgraduate-research-secondary-button"
                  onClick={addScholar}
                >
                  <Plus size={15} />
                  <span>Add Scholar</span>
                </button>
              </div>

              {scholars.length === 0 ? (
                <div className="postgraduate-research-empty-inline">
                  No additional scholars added.
                </div>
              ) : (
                <div className="postgraduate-research-scholar-list">
                  {scholars.map((scholar, index) => (
                    <div
                      className="postgraduate-research-scholar-row"
                      key={scholar.id}
                    >
                      <div className="postgraduate-research-scholar-number">
                        {index + 1}
                      </div>

                      <div className="postgraduate-research-scholar-fields">

                        <div className="postgraduate-research-field">
                          <label>
                            Scholar Name <span>*</span>
                          </label>

                          <input
                            type="text"
                            value={scholar.name}
                            onChange={(event) =>
                              updateScholar(
                                scholar.id,
                                "name",
                                event.target.value
                              )
                            }
                            placeholder="Enter scholar name"
                          />
                        </div>

                        <div className="postgraduate-research-field">
                          <label>Register Number</label>

                          <input
                            type="text"
                            value={scholar.registerNumber}
                            onChange={(event) =>
                              updateScholar(
                                scholar.id,
                                "registerNumber",
                                event.target.value
                              )
                            }
                            placeholder="Enter register number"
                          />
                        </div>

                        <div className="postgraduate-research-field">
                          <label>Program Level</label>

                          <select
                            value={scholar.programLevel}
                            onChange={(event) =>
                              updateScholar(
                                scholar.id,
                                "programLevel",
                                event.target.value
                              )
                            }
                          >
                            <option value="">Select program</option>

                            {PROGRAM_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </div>

                      </div>

                      <button
                        type="button"
                        className="postgraduate-research-delete-button"
                        onClick={() => removeScholar(scholar.id)}
                        aria-label="Remove scholar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errors.scholars && (
                <p className="postgraduate-research-error">
                  {errors.scholars}
                </p>
              )}

            </div>
          </div>
        </section>

        {/* FACULTY INFORMATION */}

        <section className="postgraduate-research-card">
          <SectionHeader
            icon={<Users size={18} />}
            title="Faculty Information"
            description="Provide the faculty details associated with the research activity."
          />

          <div className="postgraduate-research-form-body">
            <div className="postgraduate-research-form-grid">

              <FormField
                label="Faculty Name"
                required
                error={errors.facultyName}
              >
                <input
                  type="text"
                  name="facultyName"
                  value={formData.facultyName}
                  onChange={handleChange}
                  placeholder="Enter faculty name"
                />
              </FormField>

              <FormField
                label="Faculty Role"
                required
                error={errors.facultyRole}
              >
                <select
                  name="facultyRole"
                  value={formData.facultyRole}
                  onChange={handleChange}
                >
                  <option value="">Select faculty role</option>

                  {FACULTY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Research Area"
                required
                error={errors.researchArea}
                full
              >
                <input
                  type="text"
                  name="researchArea"
                  value={formData.researchArea}
                  onChange={handleChange}
                  placeholder="Enter research area"
                />
              </FormField>

              <FormField
                label="Research Description"
                required
                error={errors.researchDescription}
                full
              >
                <textarea
                  name="researchDescription"
                  value={formData.researchDescription}
                  onChange={handleChange}
                  placeholder="Describe the research activity"
                  rows={4}
                />
              </FormField>

              <FormField
                label="Research Outcome"
                required
                error={errors.researchOutcome}
                full
              >
                <textarea
                  name="researchOutcome"
                  value={formData.researchOutcome}
                  onChange={handleChange}
                  placeholder="Describe the research outcome or achievement"
                  rows={4}
                />
              </FormField>

            </div>
          </div>
        </section>

        {/* INCENTIVE INFORMATION */}

        <section className="postgraduate-research-card">
          <SectionHeader
            icon={<IndianRupee size={18} />}
            title="Incentive Information"
            description="Enter the incentive amount associated with this research activity."
          />

          <div className="postgraduate-research-form-body">
            <div className="postgraduate-research-form-grid">

              <FormField
                label="Incentive Amount"
                error={errors.incentiveAmount}
              >
                <div className="postgraduate-research-currency-input">
                  <span>
                    <IndianRupee size={14} />
                  </span>

                  <input
                    type="number"
                    name="incentiveAmount"
                    value={formData.incentiveAmount}
                    onChange={handleChange}
                    min="0"
                    placeholder="Enter amount"
                  />
                </div>
              </FormField>

            </div>
          </div>
        </section>

        {/* SUPPORTING DOCUMENTS */}

        <section className="postgraduate-research-card">
          <SectionHeader
            icon={<FileText size={18} />}
            title="Supporting Documents"
            description="Attach the documents required to support the Postgraduate Research incentive claim."
          />

          <div className="postgraduate-research-form-body">

            {loadingDocuments && (
              <p className="postgraduate-research-document-note">
                Loading previously uploaded documents...
              </p>
            )}

            <div className="postgraduate-research-document-list">

              <DocumentUpload
                label="Research Approval Letter"
                description="Document confirming approval of the postgraduate research activity."
                required
                file={documents.approvalLetter}
                existingDocuments={uploadedDocuments.filter(
                  (document) =>
                    document.documentType ===
                    DOCUMENT_TYPES.approvalLetter
                )}
                error={errors.approvalLetter}
                onChange={(file) =>
                  handleFileChange("approvalLetter", file)
                }
                onView={handleViewDocument}
                onDelete={handleDeleteDocument}
              />

              <DocumentUpload
                label="Scholar Registration Proof"
                description="Official document confirming registration of the postgraduate scholar."
                required
                file={documents.registrationProof}
                existingDocuments={uploadedDocuments.filter(
                  (document) =>
                    document.documentType ===
                    DOCUMENT_TYPES.registrationProof
                )}
                error={errors.registrationProof}
                onChange={(file) =>
                  handleFileChange("registrationProof", file)
                }
                onView={handleViewDocument}
                onDelete={handleDeleteDocument}
              />

              <DocumentUpload
                label="Research Report"
                description="Research report or documented evidence of the postgraduate research activity."
                required
                file={documents.researchReport}
                existingDocuments={uploadedDocuments.filter(
                  (document) =>
                    document.documentType ===
                    DOCUMENT_TYPES.researchReport
                )}
                error={errors.researchReport}
                onChange={(file) =>
                  handleFileChange("researchReport", file)
                }
                onView={handleViewDocument}
                onDelete={handleDeleteDocument}
              />

              <DocumentUpload
                label="Completion Certificate"
                description="Certificate confirming completion of the research activity, where applicable."
                file={documents.completionCertificate}
                existingDocuments={uploadedDocuments.filter(
                  (document) =>
                    document.documentType ===
                    DOCUMENT_TYPES.completionCertificate
                )}
                error={errors.completionCertificate}
                onChange={(file) =>
                  handleFileChange(
                    "completionCertificate",
                    file
                  )
                }
                onView={handleViewDocument}
                onDelete={handleDeleteDocument}
              />

              <DocumentUpload
                label="Supporting Evidence"
                description="Additional evidence supporting the postgraduate research incentive claim."
                file={documents.supportingEvidence}
                existingDocuments={uploadedDocuments.filter(
                  (document) =>
                    document.documentType ===
                    DOCUMENT_TYPES.supportingEvidence
                )}
                error={errors.supportingEvidence}
                onChange={(file) =>
                  handleFileChange(
                    "supportingEvidence",
                    file
                  )
                }
                onView={handleViewDocument}
                onDelete={handleDeleteDocument}
              />

            </div>

            <div className="postgraduate-research-document-note">
              <FileText size={17} />

              <p>
                Accepted formats: PDF, JPG, JPEG, and PNG.
                Maximum file size 10 MB per document.
              </p>
            </div>

          </div>
        </section>

        {/* DECLARATION */}

        <section className="postgraduate-research-card postgraduate-research-declaration-card">
          <SectionHeader
            icon={<CheckCircle2 size={18} />}
            title="Declaration"
            description="Please confirm that the information submitted is accurate."
          />

          <div className="postgraduate-research-form-body">

            <label className="postgraduate-research-declaration">
              <input
                type="checkbox"
                checked={declarationAccepted}
                onChange={(event) => {
                  setDeclarationAccepted(
                    event.target.checked
                  );

                  setErrors((previous) => ({
                    ...previous,
                    declaration: "",
                  }));
                }}
              />

              <span>
                I hereby declare that the information and
                supporting documents submitted in this claim
                are true and accurate to the best of my
                knowledge. I understand that the claim will
                be reviewed according to the applicable RIMS
                incentive policy.
              </span>
            </label>

            {errors.declaration && (
              <p className="postgraduate-research-error">
                {errors.declaration}
              </p>
            )}

          </div>
        </section>

        {/* SUBMISSION ACTIONS */}

        <section className="postgraduate-research-submission-card">
          <div className="postgraduate-research-submission-content">

            <div>
              <strong>Ready to submit your claim?</strong>

              <p>
                Save the claim as a draft or submit it for
                review once all required information and
                documents have been provided.
              </p>
            </div>

            <div className="postgraduate-research-actions">

              <button
                type="button"
                className="postgraduate-research-draft-button"
                onClick={handleSaveDraft}
                disabled={saving || submitting}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="submit"
                className="postgraduate-research-submit-button"
                disabled={saving || submitting}
              >
                {submitting ? "Submitting..." : "Submit Claim"}
              </button>

            </div>
          </div>
        </section>

      </form>
    </div>
  );
}

// =========================================================
// SECTION HEADER
// =========================================================

function SectionHeader({
  icon,
  title,
  description,
}) {
  return (
    <div className="postgraduate-research-section-header">
      <div className="postgraduate-research-section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

// =========================================================
// FORM FIELD
// =========================================================

function FormField({
  label,
  required = false,
  error,
  children,
  full = false,
}) {
  return (
    <div
      className={`postgraduate-research-field ${
        full
          ? "postgraduate-research-field-full"
          : ""
      }`}
    >
      <label>
        {label}

        {required && <span>*</span>}
      </label>

      {children}

      {error && (
        <p className="postgraduate-research-error">
          {error}
        </p>
      )}
    </div>
  );
}

// =========================================================
// DOCUMENT UPLOAD COMPONENT
// =========================================================

function DocumentUpload({
  label,
  description,
  required = false,
  file,
  existingDocuments = [],
  error,
  onChange,
  onView,
  onDelete,
}) {
  return (
    <div className="postgraduate-research-document">

      <div className="postgraduate-research-document-information">

        <div className="postgraduate-research-document-icon">
          <FileText size={18} />
        </div>

        <div>
          <div className="postgraduate-research-document-title">
            <strong>{label}</strong>

            {required && (
              <span className="postgraduate-research-required">
                Required
              </span>
            )}
          </div>

          <p>{description}</p>

          {existingDocuments.map((document) => (
            <div
              className="postgraduate-research-selected-file"
              key={document._id}
            >
              <span>
                {document.originalName}
              </span>

              <button
                type="button"
                className="postgraduate-research-document-action"
                onClick={() => onView(document._id)}
              >
                View
              </button>

              <button
                type="button"
                className="postgraduate-research-document-action"
                onClick={() => onDelete(document._id)}
              >
                Remove
              </button>
            </div>
          ))}

        </div>
      </div>

      <label className="postgraduate-research-upload">
        <Upload size={15} />

        <span>
          {file ? "Replace File" : "Choose File"}
        </span>

        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(event) =>
            onChange(event.target.files?.[0] || null)
          }
        />
      </label>

      {file && (
        <span className="postgraduate-research-selected-file">
          {file.name}
        </span>
      )}

      {error && (
        <p className="postgraduate-research-document-error">
          {error}
        </p>
      )}

    </div>
  );
}

export default PostgraduateResearch;