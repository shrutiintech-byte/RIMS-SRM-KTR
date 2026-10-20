
import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Award,
  CheckCircle2,
  FileText,
  IndianRupee,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./ProfessionalDevelopment.css";

const API_BASE_URL = "http://localhost:5000";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

const DEVELOPMENT_TYPES = [
  "Faculty Development Programme",
  "Workshop",
  "Training Programme",
  "Certification",
  "Refresher Course",
  "Orientation Programme",
  "Short Term Course",
  "Professional Training",
  "Other",
];

const LEVELS = [
  "Institutional",
  "Departmental",
  "University",
  "Regional",
  "National",
  "International",
];

const PARTICIPATION_ROLES = [
  "Participant",
  "Trainer",
  "Resource Person",
  "Coordinator",
  "Speaker",
  "Organiser",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const DOCUMENT_TYPES = {
  approvalLetter: "Approval Letter",
  participationCertificate: "Participation Certificate",
  programmeBrochure: "Programme Brochure",
  completionProof: "Completion Proof",
  supportingEvidence: "Additional Supporting Evidence",
};

const initialFormData = {
  developmentTitle: "",
  developmentType: "",
  otherDevelopmentType: "",
  organizingInstitution: "",
  level: "",
  venue: "",
  startDate: "",
  endDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  facultyName: "",
  participationRole: "",
  certificateNumber: "",
  durationDays: "",
  durationHours: "",
  description: "",
  learningOutcome: "",
  incentiveAmount: "",
};

const initialDocuments = {
  approvalLetter: null,
  participationCertificate: null,
  programmeBrochure: null,
  completionProof: null,
  supportingEvidence: null,
};

/* =====================================================
   NORMALIZE CO-PARTICIPANTS
   ===================================================== */

const normalizeCoParticipants = (participants) => {
  if (!Array.isArray(participants)) {
    return [];
  }

  return participants.map((participant, index) => ({
    ...participant,
    id: String(
      participant.id ??
        participant._id ??
        `professional-participant-${Date.now()}-${index}`
    ),
    name: participant.name || "",
    role: participant.role || "",
    department: participant.department || "",
    institution: participant.institution || "",
  }));
};

function ProfessionalDevelopment() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState(initialFormData);
  const [coParticipants, setCoParticipants] = useState([]);
  const [documents, setDocuments] = useState(initialDocuments);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [declaration, setDeclaration] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [currentClaimId, setCurrentClaimId] = useState("");

  /* =====================================================
     AUTH
     ===================================================== */

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("rimsToken")
    );
  };

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("user");
    localStorage.removeItem("rimsUser");

    navigate("/");
  };

  const getHeaders = () => {
    const token = getToken();

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  /* =====================================================
     LOAD USER
     ===================================================== */

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("rimsUser");

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      setFormData((previous) => ({
        ...previous,
        facultyName:
          previous.facultyName ||
          user.fullName ||
          "",
      }));
    } catch (error) {
      console.error(
        "Unable to read stored user:",
        error
      );
    }
  }, []);

  /* =====================================================
     LOAD DRAFT
     ===================================================== */

  useEffect(() => {
    const draftClaim = location.state?.draftClaim;

    if (!draftClaim) {
      return;
    }

    if (
      draftClaim.claimType &&
      draftClaim.claimType !== "PROFESSIONAL_DEVELOPMENT"
    ) {
      return;
    }

    const draftFormData = draftClaim.formData || {};

    setFormData((previous) => ({
      ...previous,
      ...draftFormData,
      incentiveAmount:
        draftClaim.incentiveAmount ??
        draftFormData.incentiveAmount ??
        "",
    }));

    setCurrentClaimId(
      draftClaim._id ||
      draftClaim.id ||
      ""
    );

    setDeclaration(
      Boolean(draftClaim.declarationAccepted)
    );

    const savedParticipants = Array.isArray(
      draftFormData.coParticipants
    )
      ? draftFormData.coParticipants
      : Array.isArray(draftClaim.coParticipants)
        ? draftClaim.coParticipants
        : [];

    setCoParticipants(
      normalizeCoParticipants(savedParticipants)
    );

    window.history.replaceState({}, document.title);
  }, [location.state]);

  /* =====================================================
     LOAD EXISTING DOCUMENTS
     ===================================================== */

  const loadExistingDocuments = async (claimId) => {
    if (!claimId) {
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setLoadingDocuments(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents?claimId=${encodeURIComponent(claimId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load documents."
        );
      }

      setExistingDocuments(
        result.data?.documents || []
      );
    } catch (error) {
      console.error(
        "Unable to load Professional Development documents:",
        error
      );
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    if (currentClaimId) {
      loadExistingDocuments(currentClaimId);
    }
  }, [currentClaimId]);

  /* =====================================================
     FORM CHANGE
     ===================================================== */

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

    setSuccessMessage("");
  };

  /* =====================================================
     CO-PARTICIPANTS
     ===================================================== */

  const addCoParticipant = () => {
    setCoParticipants((previous) => [
      ...previous,
      {
        id: `professional-participant-${Date.now()}-${previous.length}`,
        name: "",
        role: "",
        department: "",
        institution: "",
      },
    ]);

    setSuccessMessage("");
  };

  const updateCoParticipant = (id, field, value) => {
    setCoParticipants((previous) =>
      previous.map((participant) =>
        participant.id === id
          ? {
              ...participant,
              [field]: value,
            }
          : participant
      )
    );

    setErrors((previous) => ({
      ...previous,
      [`coParticipantName-${id}`]:
        field === "name"
          ? ""
          : previous[`coParticipantName-${id}`] || "",
    }));

    setSuccessMessage("");
  };

  const removeCoParticipant = (id) => {
    setCoParticipants((previous) =>
      previous.filter(
        (participant) => participant.id !== id
      )
    );

    setErrors((previous) => {
      const updatedErrors = { ...previous };

      delete updatedErrors[`coParticipantName-${id}`];

      return updatedErrors;
    });

    setSuccessMessage("");
  };

  /* =====================================================
     DOCUMENT UPLOAD
     ===================================================== */

  const handleDocumentChange = (event, documentKey) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((previous) => ({
        ...previous,
        [documentKey]: "File size must not exceed 10 MB.",
      }));

      event.target.value = "";
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrors((previous) => ({
        ...previous,
        [documentKey]: "Only PDF, JPG, and PNG files are allowed.",
      }));

      event.target.value = "";
      return;
    }

    setDocuments((previous) => ({
      ...previous,
      [documentKey]: file,
    }));

    setErrors((previous) => ({
      ...previous,
      [documentKey]: "",
    }));

    setSuccessMessage("");
  };

  const removeDocument = (documentKey) => {
    setDocuments((previous) => ({
      ...previous,
      [documentKey]: null,
    }));

    const input = document.getElementById(
      `professional-${documentKey}`
    );

    if (input) {
      input.value = "";
    }

    setErrors((previous) => ({
      ...previous,
      [documentKey]: "",
    }));

    setSuccessMessage("");
  };

  /* =====================================================
     EXISTING DOCUMENT HELPERS
     ===================================================== */

  const getUploadedDocument = (documentType) => {
    return existingDocuments.find(
      (document) =>
        document.documentType === documentType &&
        document.status !== "REJECTED"
    );
  };

  const hasDocument = (documentKey) => {
    return Boolean(
      documents[documentKey] ||
      getUploadedDocument(DOCUMENT_TYPES[documentKey])
    );
  };

  /* =====================================================
     DELETE EXISTING DOCUMENT
     ===================================================== */

  const handleDeleteDocument = async (documentId) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setDeletingDocumentId(documentId);
    setSuccessMessage("");

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
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to remove document."
        );
      }

      setExistingDocuments((previous) =>
        previous.filter(
          (document) => document._id !== documentId
        )
      );

      setSuccessMessage("Document removed successfully.");
    } catch (error) {
      console.error(
        "Delete Professional Development document error:",
        error
      );

      setSuccessMessage(
        error.message || "Unable to remove the document."
      );
    } finally {
      setDeletingDocumentId("");
    }
  };

  /* =====================================================
     VALIDATION
     ===================================================== */

  const validateForm = () => {
    const newErrors = {};

    if (!formData.developmentTitle.trim()) {
      newErrors.developmentTitle =
        "Programme title is required.";
    }

    if (!formData.developmentType) {
      newErrors.developmentType =
        "Please select the development type.";
    }

    if (
      formData.developmentType === "Other" &&
      !formData.otherDevelopmentType.trim()
    ) {
      newErrors.otherDevelopmentType =
        "Please specify the development type.";
    }

    if (!formData.organizingInstitution.trim()) {
      newErrors.organizingInstitution =
        "Organising institution is required.";
    }

    if (!formData.level) {
      newErrors.level =
        "Please select the programme level.";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required.";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required.";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.endDate < formData.startDate
    ) {
      newErrors.endDate =
        "End date cannot be before start date.";
    }

    if (!formData.financialYear) {
      newErrors.financialYear =
        "Financial year is required.";
    }

    if (!formData.facultyName.trim()) {
      newErrors.facultyName =
        "Faculty name is required.";
    }

    if (!formData.participationRole) {
      newErrors.participationRole =
        "Please select your participation role.";
    }

    if (!formData.description.trim()) {
      newErrors.description =
        "Programme description is required.";
    }

    if (!hasDocument("participationCertificate")) {
      newErrors.participationCertificate =
        "Participation certificate is required.";
    }

    if (!hasDocument("programmeBrochure")) {
      newErrors.programmeBrochure =
        "Programme brochure is required.";
    }

    coParticipants.forEach((participant, index) => {
      if (!participant.name.trim()) {
        newErrors[`coParticipantName-${participant.id}`] =
          `Participant ${index + 1} name is required.`;
      }
    });

    if (!declaration) {
      newErrors.declaration =
        "Please accept the declaration.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* =====================================================
     CREATE / UPDATE CLAIM
     ===================================================== */

  const createOrUpdateClaim = async () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      throw new Error("Authentication required.");
    }

    const claimFormData = {
      ...formData,
      coParticipants,
    };

    const payload = {
      claimType: "PROFESSIONAL_DEVELOPMENT",
      financialYear: formData.financialYear,
      formData: claimFormData,
      incentiveAmount:
        Number(formData.incentiveAmount) || 0,
      declarationAccepted: declaration,
    };

    const isEditing = Boolean(currentClaimId);

    const url = isEditing
      ? `${API_BASE_URL}/api/claims/${currentClaimId}`
      : `${API_BASE_URL}/api/claims`;

    const response = await fetch(url, {
      method: isEditing ? "PATCH" : "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Your session has expired.");
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to save the claim."
      );
    }

    const savedClaim =
      result.data?.claim || result.data;

    const claimId =
      savedClaim?._id ||
      savedClaim?.id ||
      currentClaimId;

    if (!claimId) {
      throw new Error(
        "Claim was saved but no claim ID was returned."
      );
    }

    setCurrentClaimId(String(claimId));

    return String(claimId);
  };

  /* =====================================================
     UPLOAD SELECTED DOCUMENTS
     ===================================================== */

  const uploadSelectedDocuments = async (claimId) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      throw new Error("Authentication required.");
    }

    if (!claimId) {
      throw new Error(
        "A valid claim ID is required before uploading documents."
      );
    }

    const selectedDocuments = Object.entries(documents)
      .filter(([, file]) => Boolean(file));

    if (selectedDocuments.length === 0) {
      return;
    }

    for (const [documentKey, file] of selectedDocuments) {
      const uploadData = new FormData();

      uploadData.append("claimId", claimId);
      uploadData.append(
        "documentType",
        DOCUMENT_TYPES[documentKey]
      );
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
        handleUnauthorized();
        throw new Error("Your session has expired.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
          `Unable to upload ${file.name}.`
        );
      }

      setDocuments((previous) => ({
        ...previous,
        [documentKey]: null,
      }));

      const input = document.getElementById(
        `professional-${documentKey}`
      );

      if (input) {
        input.value = "";
      }
    }

    await loadExistingDocuments(claimId);
  };

  /* =====================================================
     SAVE DRAFT
     ===================================================== */

  const handleSaveDraft = async () => {
    setSuccessMessage("");
    setErrors({});
    setIsSavingDraft(true);

    try {
      const claimId = await createOrUpdateClaim();

      await uploadSelectedDocuments(claimId);

      setSuccessMessage(
        "Professional Development claim saved as draft successfully."
      );
    } catch (error) {
      console.error(
        "Unable to save Professional Development draft:",
        error
      );

      setSuccessMessage(
        error.message ||
        "Unable to save the draft. Please try again."
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  /* =====================================================
     SUBMIT
     ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage("");

    if (!validateForm()) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const claimId = await createOrUpdateClaim();

      await uploadSelectedDocuments(claimId);

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        throw new Error("Authentication required.");
      }

      const submitResponse = await fetch(
        `${API_BASE_URL}/api/claims/${claimId}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (submitResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      const submitResult = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(
          submitResult.message ||
          "Unable to submit the claim."
        );
      }

      setSuccessMessage(
        "Professional Development claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 700);
    } catch (error) {
      console.error(
        "Professional Development submission error:",
        error
      );

      setSuccessMessage(
        error.message ||
        "Unable to submit the claim. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =====================================================
     FILE SIZE
     ===================================================== */

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "";
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  /* =====================================================
     DOCUMENT COMPONENT
     ===================================================== */

  const renderDocumentUpload = (
    documentKey,
    label,
    description,
    required = false
  ) => {
    const file = documents[documentKey];

    const uploadedDocument = getUploadedDocument(
      DOCUMENT_TYPES[documentKey]
    );

    return (
      <div className="professional-document" key={documentKey}>
        <div className="professional-document-header">
          <div>
            <h4>{label}</h4>

            {required && (
              <span className="professional-required">
                Required
              </span>
            )}
          </div>

          <FileText size={18} />
        </div>

        <p className="professional-document-description">
          {description}
        </p>

        {uploadedDocument && (
          <div className="professional-uploaded-document">
            <div className="professional-file-info">
              <CheckCircle2 size={18} />

              <div>
                <strong>
                  {uploadedDocument.originalName || "Document"}
                </strong>

                <span>Uploaded document</span>
              </div>
            </div>

            <button
              type="button"
              className="professional-file-remove"
              onClick={() =>
                handleDeleteDocument(uploadedDocument._id)
              }
              disabled={
                deletingDocumentId === uploadedDocument._id
              }
            >
              {deletingDocumentId === uploadedDocument._id
                ? "Removing..."
                : "Remove"}
            </button>
          </div>
        )}

        {!file ? (
          <label
            className="professional-upload"
            htmlFor={`professional-${documentKey}`}
          >
            <Upload size={18} />

            <span>Click to upload</span>

            <small>
              PDF, JPG or PNG · Max 10 MB
            </small>

            <input
              id={`professional-${documentKey}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) =>
                handleDocumentChange(event, documentKey)
              }
            />
          </label>
        ) : (
          <div className="professional-uploaded-file">
            <div className="professional-file-info">
              <CheckCircle2 size={18} />

              <div>
                <strong>{file.name}</strong>

                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>

            <button
              type="button"
              className="professional-file-remove"
              onClick={() => removeDocument(documentKey)}
            >
              Remove
            </button>
          </div>
        )}

        {errors[documentKey] && (
          <p className="professional-error">
            {errors[documentKey]}
          </p>
        )}
      </div>
    );
  };

  return (
    <main className="professional-page">
      {/* Back Button */}
      <button
        type="button"
        className="professional-back-button"
        onClick={() => navigate(-1)}
        aria-label="Go back to the previous page"
      >
        <ArrowLeft size={17} strokeWidth={2} />
        <span>Back</span>
      </button>

      {/* Header */}
      <section className="professional-header">
        <div className="professional-title-row">
          <div className="professional-title-icon">
            <Award size={25} />
          </div>

          <div>
            <h1>Professional Development</h1>

            <p>
              Submit an incentive claim for professional
              development and faculty training activities.
            </p>
          </div>
        </div>

        <div className="professional-header-badge">
          <span>Financial Year</span>
          <strong>{CURRENT_FINANCIAL_YEAR}</strong>
        </div>
      </section>

      {/* Success */}
      {successMessage && (
        <div className="professional-success-message" role="status">
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <form
        className="professional-form"
        onSubmit={handleSubmit}
      >
        {/* Programme Information */}
        <section className="professional-card">
          <div className="professional-section-header">
            <div className="professional-section-icon">
              <Award size={20} />
            </div>

            <div>
              <h2>Programme Information</h2>
              <p>
                Provide details about the professional
                development activity.
              </p>
            </div>
          </div>

          <div className="professional-form-grid">
            <div className="professional-field professional-field-full">
              <label htmlFor="developmentTitle">
                Programme / Activity Title <span>*</span>
              </label>

              <input
                id="developmentTitle"
                name="developmentTitle"
                type="text"
                value={formData.developmentTitle}
                onChange={handleChange}
                placeholder="Enter programme or activity title"
              />

              {errors.developmentTitle && (
                <p className="professional-error">
                  {errors.developmentTitle}
                </p>
              )}
            </div>

            <div className="professional-field">
              <label htmlFor="developmentType">
                Development Type <span>*</span>
              </label>

              <select
                id="developmentType"
                name="developmentType"
                value={formData.developmentType}
                onChange={handleChange}
              >
                <option value="">Select development type</option>

                {DEVELOPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {errors.developmentType && (
                <p className="professional-error">
                  {errors.developmentType}
                </p>
              )}
            </div>

            {formData.developmentType === "Other" && (
              <div className="professional-field">
                <label htmlFor="otherDevelopmentType">
                  Specify Development Type <span>*</span>
                </label>

                <input
                  id="otherDevelopmentType"
                  name="otherDevelopmentType"
                  type="text"
                  value={formData.otherDevelopmentType}
                  onChange={handleChange}
                  placeholder="Enter development type"
                />

                {errors.otherDevelopmentType && (
                  <p className="professional-error">
                    {errors.otherDevelopmentType}
                  </p>
                )}
              </div>
            )}

            <div className="professional-field">
              <label htmlFor="organizingInstitution">
                Organising Institution <span>*</span>
              </label>

              <input
                id="organizingInstitution"
                name="organizingInstitution"
                type="text"
                value={formData.organizingInstitution}
                onChange={handleChange}
                placeholder="Enter organising institution"
              />

              {errors.organizingInstitution && (
                <p className="professional-error">
                  {errors.organizingInstitution}
                </p>
              )}
            </div>

            <div className="professional-field">
              <label htmlFor="level">
                Programme Level <span>*</span>
              </label>

              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleChange}
              >
                <option value="">Select programme level</option>

                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>

              {errors.level && (
                <p className="professional-error">
                  {errors.level}
                </p>
              )}
            </div>

            <div className="professional-field">
              <label htmlFor="venue">Venue / Location</label>

              <input
                id="venue"
                name="venue"
                type="text"
                value={formData.venue}
                onChange={handleChange}
                placeholder="Enter venue or location"
              />
            </div>

            <div className="professional-field">
              <label htmlFor="startDate">
                Start Date <span>*</span>
              </label>

              <input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
              />

              {errors.startDate && (
                <p className="professional-error">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div className="professional-field">
              <label htmlFor="endDate">
                End Date <span>*</span>
              </label>

              <input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
              />

              {errors.endDate && (
                <p className="professional-error">
                  {errors.endDate}
                </p>
              )}
            </div>

            <div className="professional-field">
              <label htmlFor="financialYear">
                Financial Year <span>*</span>
              </label>

              <select
                id="financialYear"
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

              {errors.financialYear && (
                <p className="professional-error">
                  {errors.financialYear}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Faculty Participation */}
        <section className="professional-card">
          <div className="professional-section-header">
            <div className="professional-section-icon">
              <Users size={20} />
            </div>

            <div>
              <h2>Faculty Participation</h2>
              <p>
                Enter your participation and contribution details.
              </p>
            </div>
          </div>

          <div className="professional-form-grid">
            <div className="professional-field">
              <label htmlFor="facultyName">
                Faculty Name <span>*</span>
              </label>

              <input
                id="facultyName"
                name="facultyName"
                type="text"
                value={formData.facultyName}
                onChange={handleChange}
                placeholder="Enter faculty name"
              />

              {errors.facultyName && (
                <p className="professional-error">
                  {errors.facultyName}
                </p>
              )}
            </div>

            <div className="professional-field">
              <label htmlFor="participationRole">
                Participation Role <span>*</span>
              </label>

              <select
                id="participationRole"
                name="participationRole"
                value={formData.participationRole}
                onChange={handleChange}
              >
                <option value="">Select participation role</option>

                {PARTICIPATION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {errors.participationRole && (
                <p className="professional-error">
                  {errors.participationRole}
                </p>
              )}
            </div>

            <div className="professional-field">
              <label htmlFor="certificateNumber">
                Certificate / Registration Number
              </label>

              <input
                id="certificateNumber"
                name="certificateNumber"
                type="text"
                value={formData.certificateNumber}
                onChange={handleChange}
                placeholder="Enter certificate number"
              />
            </div>

            <div className="professional-field">
              <label htmlFor="durationDays">Duration</label>

              <div className="professional-duration">
                <input
                  id="durationDays"
                  name="durationDays"
                  type="number"
                  min="0"
                  value={formData.durationDays}
                  onChange={handleChange}
                  placeholder="Days"
                />

                <span>days</span>

                <input
                  id="durationHours"
                  name="durationHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.durationHours}
                  onChange={handleChange}
                  placeholder="Hours"
                />

                <span>hours</span>
              </div>
            </div>

            <div className="professional-field professional-field-full">
              <label htmlFor="description">
                Programme Description <span>*</span>
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the programme, topics covered, activities completed, and your contribution."
                rows="5"
              />

              {errors.description && (
                <p className="professional-error">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="professional-field professional-field-full">
              <label htmlFor="learningOutcome">
                Learning Outcomes
              </label>

              <textarea
                id="learningOutcome"
                name="learningOutcome"
                value={formData.learningOutcome}
                onChange={handleChange}
                placeholder="Describe the skills, knowledge, or professional outcomes gained."
                rows="4"
              />
            </div>

            <div className="professional-field">
              <label htmlFor="incentiveAmount">
                Claimed Incentive Amount
              </label>

              <div className="professional-currency-input">
                <IndianRupee size={17} />

                <input
                  id="incentiveAmount"
                  name="incentiveAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.incentiveAmount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                />
              </div>

              <small className="professional-helper-text">
                Enter the amount applicable under the
                institutional incentive policy.
              </small>
            </div>
          </div>

          {/* Co-Participants */}
          <div className="professional-subsection">
            <div className="professional-subsection-header">
              <div>
                <h3>Co-Participants / Contributors</h3>

                <p>
                  Add other faculty members associated
                  with the activity.
                </p>
              </div>

              <button
                type="button"
                className="professional-secondary-button"
                onClick={addCoParticipant}
                disabled={isSubmitting || isSavingDraft}
              >
                <Plus size={17} />
                Add Participant
              </button>
            </div>

            {coParticipants.length === 0 ? (
              <div className="professional-empty">
                <Users size={22} />

                <p>No additional participants added.</p>
              </div>
            ) : (
              <div className="professional-participant-list">
                {coParticipants.map((participant, index) => (
                  <div
                    className="professional-participant-row"
                    key={participant.id}
                  >
                    <div className="professional-participant-number">
                      {index + 1}
                    </div>

                    <div className="professional-participant-fields">
                      <div className="professional-field">
                        <label htmlFor={`participant-name-${participant.id}`}>
                          Name
                        </label>

                        <input
                          id={`participant-name-${participant.id}`}
                          type="text"
                          value={participant.name}
                          onChange={(event) =>
                            updateCoParticipant(
                              participant.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Participant name"
                        />

                        {errors[
                          `coParticipantName-${participant.id}`
                        ] && (
                          <p className="professional-error">
                            {
                              errors[
                                `coParticipantName-${participant.id}`
                              ]
                            }
                          </p>
                        )}
                      </div>

                      <div className="professional-field">
                        <label htmlFor={`participant-role-${participant.id}`}>
                          Role
                        </label>

                        <select
                          id={`participant-role-${participant.id}`}
                          value={participant.role}
                          onChange={(event) =>
                            updateCoParticipant(
                              participant.id,
                              "role",
                              event.target.value
                            )
                          }
                        >
                          <option value="">Select role</option>

                          {PARTICIPATION_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="professional-field">
                        <label htmlFor={`participant-department-${participant.id}`}>
                          Department
                        </label>

                        <input
                          id={`participant-department-${participant.id}`}
                          type="text"
                          value={participant.department}
                          onChange={(event) =>
                            updateCoParticipant(
                              participant.id,
                              "department",
                              event.target.value
                            )
                          }
                          placeholder="Department"
                        />
                      </div>

                      <div className="professional-field">
                        <label htmlFor={`participant-institution-${participant.id}`}>
                          Institution
                        </label>

                        <input
                          id={`participant-institution-${participant.id}`}
                          type="text"
                          value={participant.institution}
                          onChange={(event) =>
                            updateCoParticipant(
                              participant.id,
                              "institution",
                              event.target.value
                            )
                          }
                          placeholder="Institution"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="professional-delete-button"
                      onClick={() =>
                        removeCoParticipant(participant.id)
                      }
                      disabled={isSubmitting || isSavingDraft}
                      title="Remove participant"
                      aria-label={`Remove participant ${index + 1}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Supporting Documents */}
        <section className="professional-card">
          <div className="professional-section-header">
            <div className="professional-section-icon">
              <FileText size={20} />
            </div>

            <div>
              <h2>Supporting Documents</h2>

              <p>
                Upload documents supporting the
                professional development claim.
              </p>
            </div>
          </div>

          <div className="professional-documents-grid">
            {renderDocumentUpload(
              "approvalLetter",
              "Approval Letter",
              "Official permission or nomination for the programme."
            )}

            {renderDocumentUpload(
              "participationCertificate",
              "Participation Certificate",
              "Certificate confirming participation or completion.",
              true
            )}

            {renderDocumentUpload(
              "programmeBrochure",
              "Programme Brochure",
              "Official brochure containing programme details.",
              true
            )}

            {renderDocumentUpload(
              "completionProof",
              "Completion Proof",
              "Additional evidence confirming completion of the activity."
            )}

            {renderDocumentUpload(
              "supportingEvidence",
              "Additional Supporting Evidence",
              "Any additional document supporting the claim."
            )}
          </div>

          {loadingDocuments && (
            <div className="professional-document-note">
              <FileText size={17} />

              <p>
                Loading previously uploaded documents...
              </p>
            </div>
          )}
        </section>

        {/* Declaration */}
        <section className="professional-card professional-declaration-card">
          <div className="professional-section-header">
            <div className="professional-section-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h2>Declaration</h2>

              <p>
                Confirm the accuracy of the submitted information.
              </p>
            </div>
          </div>

          <label className="professional-checkbox-wrapper">
            <input
              type="checkbox"
              checked={declaration}
              onChange={(event) => {
                setDeclaration(event.target.checked);

                setErrors((previous) => ({
                  ...previous,
                  declaration: "",
                }));

                setSuccessMessage("");
              }}
            />

            <span>
              I hereby declare that the information provided
              in this claim is true and accurate to the best
              of my knowledge. I understand that the submitted
              claim and supporting documents may be verified
              before approval.
            </span>
          </label>

          {errors.declaration && (
            <p className="professional-error">
              {errors.declaration}
            </p>
          )}
        </section>

        {/* Actions */}
        <div className="professional-actions">
          <button
            type="button"
            className="professional-draft-button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
          >
            {isSavingDraft ? "Saving..." : "Save as Draft"}
          </button>

          <button
            type="submit"
            className="professional-submit-button"
            disabled={isSubmitting || isSavingDraft}
          >
            {isSubmitting ? "Submitting..." : "Submit Claim"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default ProfessionalDevelopment;
