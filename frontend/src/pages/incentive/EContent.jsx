
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "./EContent.css";

const API_BASE_URL = "http://localhost:5000";
const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = ["2026-27", "2025-26", "2024-25"];

const CONTENT_TYPES = [
  "Video Lecture",
  "Online Course",
  "E-Learning Module",
  "Digital Course Material",
  "MOOC Content",
  "Interactive Learning Content",
  "Other",
];

const CONTENT_LEVELS = [
  "Institutional",
  "University",
  "National",
  "International",
];

const FACULTY_ROLES = [
  "Content Creator",
  "Subject Expert",
  "Course Coordinator",
  "Co-Creator",
  "Presenter",
];

const GOVERNMENT_INITIATIVES = [
  "e-PG Pathshala",
  "CEC",
  "SWAYAM",
  "NPTEL",
  "NMEICT",
  "Other Government Initiative",
];

const E_CONTENT_INCENTIVE_AMOUNT = 50000;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const DOCUMENT_TYPES = {
  approvalLetter: "Approval Letter",
  contentProof: "Content Proof",
  publicationProof: "Publication Proof",
  courseCertificate: "Course Certificate",
  supportingEvidence: "Supporting Evidence",
};

const initialFormData = {
  contentTitle: "",
  contentType: "",
  otherContentType: "",
  courseName: "",
  courseCode: "",
  platform: "",
  contentLevel: "",
  publicationDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  facultyName: "",
  facultyRole: "",
  numberOfModules: "",
  durationHours: "",
  contentDescription: "",
  learningOutcome: "",

  // E-Content policy eligibility details
  isPhDHolder: "",
  teachingExperienceYears: "",
  creditCount: "",
  courseCompleted: "",
  governmentInitiative: "",
  otherGovernmentInitiativeName: "",
  infrastructureAvailable: "",
  fourQuadrantCompliant: "",
};

const initialDocuments = {
  approvalLetter: null,
  contentProof: null,
  publicationProof: null,
  courseCertificate: null,
  supportingEvidence: null,
};

/**
 * Frontend estimate only.
 *
 * The backend must independently validate these conditions
 * and calculate the authoritative incentive amount.
 */
const calculateEContentEstimate = (data) => {
  const initiative = data.governmentInitiative;

  const validInitiative = GOVERNMENT_INITIATIVES.includes(
    initiative
  );

  const otherInitiativeNameValid =
    initiative !== "Other Government Initiative" ||
    Boolean(data.otherGovernmentInitiativeName?.trim());

  const experience = Number(data.teachingExperienceYears);
  const credits = Number(data.creditCount);

  const validExperience =
    data.teachingExperienceYears !== "" &&
    Number.isFinite(experience) &&
    experience >= 5;

  const validCredits =
    data.creditCount !== "" &&
    Number.isFinite(credits) &&
    credits >= 1;

  const eligible =
    data.isPhDHolder === "Yes" &&
    validExperience &&
    validCredits &&
    data.courseCompleted === "Yes" &&
    validInitiative &&
    otherInitiativeNameValid &&
    data.infrastructureAvailable === "Yes" &&
    data.fourQuadrantCompliant === "Yes";

  return eligible ? E_CONTENT_INCENTIVE_AMOUNT : 0;
};

function EContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState(initialFormData);
  const [coCreators, setCoCreators] = useState([]);
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

  // AUTH
  const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("rimsToken");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("user");
    localStorage.removeItem("rimsUser");
    navigate("/");
  };

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  // LOAD LOGGED-IN FACULTY
  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("rimsUser");

    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser);

      setFormData((previous) => ({
        ...previous,
        facultyName: previous.facultyName || user.fullName || "",
      }));
    } catch (error) {
      console.error("Unable to read stored user:", error);
    }
  }, []);

  // LOAD DRAFT
  useEffect(() => {
    const draftClaim = location.state?.draftClaim;

    if (!draftClaim) return;

    if (
      draftClaim.claimType &&
      draftClaim.claimType !== "E_CONTENT"
    ) {
      return;
    }

    const draftFormData = draftClaim.formData || {};

    setFormData((previous) => ({
      ...previous,
      ...draftFormData,
    }));

    setCurrentClaimId(
      draftClaim._id || draftClaim.id || ""
    );

    setDeclaration(Boolean(draftClaim.declarationAccepted));

    const savedCoCreators = Array.isArray(
      draftFormData.coCreators
    )
      ? draftFormData.coCreators
      : Array.isArray(draftClaim.coCreators)
        ? draftClaim.coCreators
        : [];

    setCoCreators(
      savedCoCreators.map((creator, index) => ({
        ...creator,
        id:
          creator.id ??
          creator._id ??
          `existing-${Date.now()}-${index}`,
      }))
    );

    window.history.replaceState({}, document.title);
  }, [location.state]);

  // LOAD EXISTING DOCUMENTS
  const loadExistingDocuments = async (claimId) => {
    if (!claimId) return;

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setLoadingDocuments(true);

    try {
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
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load documents."
        );
      }

      setExistingDocuments(result.data?.documents || []);
    } catch (error) {
      console.error(
        "Unable to load E-Content documents:",
        error
      );

      setSuccessMessage(
        error.message ||
          "Unable to load previously uploaded documents."
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

  // FORM CHANGES
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

  // CO-CREATORS
  const addCoCreator = () => {
    setCoCreators((previous) => [
      ...previous,
      {
        id: `new-${Date.now()}-${previous.length}`,
        name: "",
        role: "",
        department: "",
        institution: "",
      },
    ]);

    setSuccessMessage("");
  };

  const updateCoCreator = (id, field, value) => {
    setCoCreators((previous) =>
      previous.map((creator) =>
        creator.id === id
          ? { ...creator, [field]: value }
          : creator
      )
    );

    setSuccessMessage("");
  };

  const removeCoCreator = (id) => {
    setCoCreators((previous) =>
      previous.filter((creator) => creator.id !== id)
    );

    setErrors((previous) => {
      const updatedErrors = { ...previous };
      delete updatedErrors[`coCreatorName-${id}`];
      return updatedErrors;
    });

    setSuccessMessage("");
  };

  // DOCUMENT SELECTION
  const handleDocumentChange = (event, documentKey) => {
    const file = event.target.files?.[0];

    if (!file) return;

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
        [documentKey]:
          "Only PDF, JPG, JPEG, and PNG files are allowed.",
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

    const input = window.document.getElementById(
      `econtent-${documentKey}`
    );

    if (input) input.value = "";

    setErrors((previous) => ({
      ...previous,
      [documentKey]: "",
    }));

    setSuccessMessage("");
  };

  // EXISTING DOCUMENT HELPERS
  const getUploadedDocument = (documentType) =>
    existingDocuments.find(
      (document) =>
        document.documentType === documentType &&
        document.status !== "REJECTED"
    );

  const hasDocument = (documentKey) =>
    Boolean(
      documents[documentKey] ||
        getUploadedDocument(DOCUMENT_TYPES[documentKey])
    );

  // DELETE EXISTING DOCUMENT
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
        "Delete E-Content document error:",
        error
      );

      setSuccessMessage(
        error.message || "Unable to remove the document."
      );
    } finally {
      setDeletingDocumentId("");
    }
  };

  // VALIDATION
  const validateForm = () => {
    const newErrors = {};

    if (!formData.contentTitle.trim()) {
      newErrors.contentTitle = "Content title is required.";
    }

    if (!formData.contentType) {
      newErrors.contentType = "Please select the content type.";
    }

    if (
      formData.contentType === "Other" &&
      !formData.otherContentType.trim()
    ) {
      newErrors.otherContentType =
        "Please specify the content type.";
    }

    if (!formData.courseName.trim()) {
      newErrors.courseName = "Course name is required.";
    }

    if (!formData.contentLevel) {
      newErrors.contentLevel = "Please select the content level.";
    }

    if (!formData.publicationDate) {
      newErrors.publicationDate =
        "Publication date is required.";
    }

    if (!formData.financialYear) {
      newErrors.financialYear = "Financial year is required.";
    }

    if (!formData.facultyName.trim()) {
      newErrors.facultyName = "Faculty name is required.";
    }

    if (!formData.facultyRole) {
      newErrors.facultyRole = "Please select your faculty role.";
    }

    if (!formData.contentDescription.trim()) {
      newErrors.contentDescription =
        "Content description is required.";
    }

    // E-Content policy eligibility
    if (formData.isPhDHolder !== "Yes") {
      newErrors.isPhDHolder =
        "A PhD qualification is required under the policy.";
    }

    const experience = Number(formData.teachingExperienceYears);

    if (
      formData.teachingExperienceYears === "" ||
      !Number.isFinite(experience) ||
      experience < 5
    ) {
      newErrors.teachingExperienceYears =
        "At least five years of teaching experience in the concerned discipline is required.";
    }

    const credits = Number(formData.creditCount);

    if (
      formData.creditCount === "" ||
      !Number.isFinite(credits) ||
      credits < 1
    ) {
      newErrors.creditCount =
        "The course must carry at least one credit.";
    }

    if (formData.courseCompleted !== "Yes") {
      newErrors.courseCompleted =
        "The course must be complete.";
    }

    if (
      !GOVERNMENT_INITIATIVES.includes(
        formData.governmentInitiative
      )
    ) {
      newErrors.governmentInitiative =
        "Select the applicable government initiative.";
    }

    if (
      formData.governmentInitiative ===
        "Other Government Initiative" &&
      !formData.otherGovernmentInitiativeName.trim()
    ) {
      newErrors.otherGovernmentInitiativeName =
        "Enter the name of the government initiative.";
    }

    if (formData.infrastructureAvailable !== "Yes") {
      newErrors.infrastructureAvailable =
        "Necessary institutional infrastructure must be available.";
    }

    if (formData.fourQuadrantCompliant !== "Yes") {
      newErrors.fourQuadrantCompliant =
        "The course must follow the SWAYAM four-quadrant approach.";
    }

    if (!hasDocument("approvalLetter")) {
      newErrors.approvalLetter = "Approval letter is required.";
    }

    if (!hasDocument("contentProof")) {
      newErrors.contentProof = "Content proof is required.";
    }

    coCreators.forEach((creator, index) => {
      if (!creator.name?.trim()) {
        newErrors[`coCreatorName-${creator.id}`] =
          `Contributor ${index + 1} name is required.`;
      }
    });

    if (!declaration) {
      newErrors.declaration = "Please accept the declaration.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // CREATE OR UPDATE CLAIM
  const createOrUpdateClaim = async () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      throw new Error("Authentication required.");
    }

    const claimFormData = {
      ...formData,
      coCreators,
    };

    const payload = {
      claimType: "E_CONTENT",
      financialYear: formData.financialYear,
      formData: claimFormData,

      // Preview only. The backend must recalculate this amount.
      incentiveAmount: calculateEContentEstimate(formData),

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
      throw new Error("The server did not return a claim ID.");
    }

    setCurrentClaimId(claimId);

    return claimId;
  };

  // UPLOAD SELECTED DOCUMENTS
  const uploadSelectedDocuments = async (claimId) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      throw new Error("Authentication required.");
    }

    const selectedDocuments = Object.entries(documents).filter(
      ([, file]) => Boolean(file)
    );

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
          result.message || `Unable to upload ${file.name}.`
        );
      }

      setDocuments((previous) => ({
        ...previous,
        [documentKey]: null,
      }));

      const input = window.document.getElementById(
        `econtent-${documentKey}`
      );

      if (input) input.value = "";
    }

    await loadExistingDocuments(claimId);
  };

  // SAVE DRAFT
  const handleSaveDraft = async () => {
    setSuccessMessage("");
    setErrors({});
    setIsSavingDraft(true);

    try {
      const claimId = await createOrUpdateClaim();

      await uploadSelectedDocuments(claimId);

      setSuccessMessage(
        "E-Content claim saved as draft successfully."
      );
    } catch (error) {
      console.error(
        "Unable to save E-Content draft:",
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

  // SUBMIT CLAIM
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
        return;
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
        "E-Content claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 700);
    } catch (error) {
      console.error("E-Content submission error:", error);

      setSuccessMessage(
        error.message ||
          "Unable to submit the claim. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // DOCUMENT UPLOAD COMPONENT
  const renderDocumentUpload = (
    documentKey,
    label,
    description,
    required = false
  ) => {
    const selectedFile = documents[documentKey];

    const uploadedDocument = getUploadedDocument(
      DOCUMENT_TYPES[documentKey]
    );

    return (
      <div className="econtent-document-item">
        <div className="econtent-document-information">
          <div className="econtent-document-icon">
            <FileText size={18} />
          </div>

          <div>
            <div className="econtent-document-title">
              <strong>{label}</strong>

              {required && (
                <span className="econtent-document-required">
                  Required
                </span>
              )}
            </div>

            <p>{description}</p>

            {uploadedDocument && (
              <div className="econtent-uploaded-document">
                <span>
                  Uploaded:{" "}
                  {uploadedDocument.originalName || "Document"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteDocument(uploadedDocument._id)
                  }
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

        <label
          className="econtent-upload-button"
          htmlFor={`econtent-${documentKey}`}
        >
          <Upload size={15} />

          <span>
            {selectedFile ? "Replace File" : "Choose File"}
          </span>

          <input
            id={`econtent-${documentKey}`}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) =>
              handleDocumentChange(event, documentKey)
            }
          />
        </label>

        {selectedFile && (
          <div className="econtent-selected-file">
            {selectedFile.name}

            <button
              type="button"
              onClick={() => removeDocument(documentKey)}
            >
              Remove
            </button>
          </div>
        )}

        {errors[documentKey] && (
          <p className="econtent-error">
            {errors[documentKey]}
          </p>
        )}
      </div>
    );
  };

  const estimatedAmount = calculateEContentEstimate(formData);

  return (
    <main className="econtent-page">
      <section className="econtent-header">
        <button
          type="button"
          className="econtent-back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <div className="econtent-heading">
          <span className="econtent-eyebrow">
            Research Incentive
          </span>

          <h1>E-Content</h1>

          <p>
            Submit an incentive claim for digital and online
            learning content.
          </p>
        </div>
      </section>

      {successMessage && (
        <div className="econtent-success-message">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      <form className="econtent-form" onSubmit={handleSubmit}>
        {/* CONTENT INFORMATION */}
        <section className="econtent-card">
          <div className="econtent-section-header">
            <div className="econtent-section-icon">
              <Video size={20} />
            </div>

            <div>
              <h2>Content Information</h2>
              <p>
                Provide details about the digital learning content.
              </p>
            </div>
          </div>

          <div className="econtent-form-grid">
            <div className="econtent-field econtent-field-full">
              <label htmlFor="contentTitle">
                Content Title <span>*</span>
              </label>

              <input
                id="contentTitle"
                name="contentTitle"
                type="text"
                value={formData.contentTitle}
                onChange={handleChange}
                placeholder="Enter the title of the e-content"
              />

              {errors.contentTitle && (
                <p className="econtent-error">
                  {errors.contentTitle}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="contentType">
                Content Type <span>*</span>
              </label>

              <select
                id="contentType"
                name="contentType"
                value={formData.contentType}
                onChange={handleChange}
              >
                <option value="">Select content type</option>

                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {errors.contentType && (
                <p className="econtent-error">
                  {errors.contentType}
                </p>
              )}
            </div>

            {formData.contentType === "Other" && (
              <div className="econtent-field">
                <label htmlFor="otherContentType">
                  Specify Content Type <span>*</span>
                </label>

                <input
                  id="otherContentType"
                  name="otherContentType"
                  type="text"
                  value={formData.otherContentType}
                  onChange={handleChange}
                  placeholder="Enter content type"
                />

                {errors.otherContentType && (
                  <p className="econtent-error">
                    {errors.otherContentType}
                  </p>
                )}
              </div>
            )}

            <div className="econtent-field">
              <label htmlFor="courseName">
                Course Name <span>*</span>
              </label>

              <input
                id="courseName"
                name="courseName"
                type="text"
                value={formData.courseName}
                onChange={handleChange}
                placeholder="Enter course name"
              />

              {errors.courseName && (
                <p className="econtent-error">
                  {errors.courseName}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="courseCode">Course Code</label>

              <input
                id="courseCode"
                name="courseCode"
                type="text"
                value={formData.courseCode}
                onChange={handleChange}
                placeholder="Enter course code"
              />
            </div>

            <div className="econtent-field">
              <label htmlFor="platform">
                Platform / Repository
              </label>

              <input
                id="platform"
                name="platform"
                type="text"
                value={formData.platform}
                onChange={handleChange}
                placeholder="Enter platform or repository"
              />
            </div>

            <div className="econtent-field">
              <label htmlFor="contentLevel">
                Content Level <span>*</span>
              </label>

              <select
                id="contentLevel"
                name="contentLevel"
                value={formData.contentLevel}
                onChange={handleChange}
              >
                <option value="">Select content level</option>

                {CONTENT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>

              {errors.contentLevel && (
                <p className="econtent-error">
                  {errors.contentLevel}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="publicationDate">
                Publication / Release Date <span>*</span>
              </label>

              <input
                id="publicationDate"
                name="publicationDate"
                type="date"
                value={formData.publicationDate}
                onChange={handleChange}
              />

              {errors.publicationDate && (
                <p className="econtent-error">
                  {errors.publicationDate}
                </p>
              )}
            </div>

            <div className="econtent-field">
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
                <p className="econtent-error">
                  {errors.financialYear}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* FACULTY CONTRIBUTION AND POLICY ELIGIBILITY */}
        <section className="econtent-card">
          <div className="econtent-section-header">
            <div className="econtent-section-icon">
              <Users size={20} />
            </div>

            <div>
              <h2>Faculty Contribution</h2>
              <p>
                Enter faculty contribution details and the
                information required to assess policy eligibility.
              </p>
            </div>
          </div>

          <div className="econtent-form-grid">
            <div className="econtent-field">
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
                <p className="econtent-error">
                  {errors.facultyName}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="facultyRole">
                Faculty Role <span>*</span>
              </label>

              <select
                id="facultyRole"
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

              {errors.facultyRole && (
                <p className="econtent-error">
                  {errors.facultyRole}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="isPhDHolder">
                PhD Qualification <span>*</span>
              </label>

              <select
                id="isPhDHolder"
                name="isPhDHolder"
                value={formData.isPhDHolder}
                onChange={handleChange}
              >
                <option value="">Select an answer</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>

              {errors.isPhDHolder && (
                <p className="econtent-error">
                  {errors.isPhDHolder}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="teachingExperienceYears">
                Teaching Experience in the Concerned Discipline
                (Years) <span>*</span>
              </label>

              <input
                id="teachingExperienceYears"
                name="teachingExperienceYears"
                type="number"
                min="0"
                step="1"
                value={formData.teachingExperienceYears}
                onChange={handleChange}
                placeholder="Enter completed years"
              />

              {errors.teachingExperienceYears && (
                <p className="econtent-error">
                  {errors.teachingExperienceYears}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="creditCount">
                Course Credits <span>*</span>
              </label>

              <input
                id="creditCount"
                name="creditCount"
                type="number"
                min="0"
                step="1"
                value={formData.creditCount}
                onChange={handleChange}
                placeholder="Enter course credits"
              />

              {errors.creditCount && (
                <p className="econtent-error">
                  {errors.creditCount}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="courseCompleted">
                Is the Course Complete? <span>*</span>
              </label>

              <select
                id="courseCompleted"
                name="courseCompleted"
                value={formData.courseCompleted}
                onChange={handleChange}
              >
                <option value="">Select an answer</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>

              {errors.courseCompleted && (
                <p className="econtent-error">
                  {errors.courseCompleted}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="governmentInitiative">
                Government Initiative <span>*</span>
              </label>

              <select
                id="governmentInitiative"
                name="governmentInitiative"
                value={formData.governmentInitiative}
                onChange={handleChange}
              >
                <option value="">Select initiative</option>

                {GOVERNMENT_INITIATIVES.map((initiative) => (
                  <option key={initiative} value={initiative}>
                    {initiative}
                  </option>
                ))}
              </select>

              {errors.governmentInitiative && (
                <p className="econtent-error">
                  {errors.governmentInitiative}
                </p>
              )}
            </div>

            {formData.governmentInitiative ===
              "Other Government Initiative" && (
              <div className="econtent-field">
                <label htmlFor="otherGovernmentInitiativeName">
                  Name of Government Initiative <span>*</span>
                </label>

                <input
                  id="otherGovernmentInitiativeName"
                  name="otherGovernmentInitiativeName"
                  type="text"
                  value={formData.otherGovernmentInitiativeName}
                  onChange={handleChange}
                  placeholder="Enter official initiative name"
                />

                {errors.otherGovernmentInitiativeName && (
                  <p className="econtent-error">
                    {errors.otherGovernmentInitiativeName}
                  </p>
                )}
              </div>
            )}

            <div className="econtent-field">
              <label htmlFor="infrastructureAvailable">
                Necessary Institutional Infrastructure Available?
                <span> *</span>
              </label>

              <select
                id="infrastructureAvailable"
                name="infrastructureAvailable"
                value={formData.infrastructureAvailable}
                onChange={handleChange}
              >
                <option value="">Select an answer</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>

              {errors.infrastructureAvailable && (
                <p className="econtent-error">
                  {errors.infrastructureAvailable}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="fourQuadrantCompliant">
                SWAYAM Four-Quadrant Approach Followed?
                <span> *</span>
              </label>

              <select
                id="fourQuadrantCompliant"
                name="fourQuadrantCompliant"
                value={formData.fourQuadrantCompliant}
                onChange={handleChange}
              >
                <option value="">Select an answer</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>

              {errors.fourQuadrantCompliant && (
                <p className="econtent-error">
                  {errors.fourQuadrantCompliant}
                </p>
              )}
            </div>

            <div className="econtent-field">
              <label htmlFor="numberOfModules">
                Number of Modules
              </label>

              <input
                id="numberOfModules"
                name="numberOfModules"
                type="number"
                min="0"
                value={formData.numberOfModules}
                onChange={handleChange}
                placeholder="Enter number of modules"
              />
            </div>

            <div className="econtent-field">
              <label htmlFor="durationHours">
                Content Duration
              </label>

              <div className="econtent-input-with-suffix">
                <input
                  id="durationHours"
                  name="durationHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.durationHours}
                  onChange={handleChange}
                  placeholder="Enter duration"
                />

                <span>hours</span>
              </div>
            </div>

            <div className="econtent-field econtent-field-full">
              <label htmlFor="contentDescription">
                Content Description <span>*</span>
              </label>

              <textarea
                id="contentDescription"
                name="contentDescription"
                value={formData.contentDescription}
                onChange={handleChange}
                placeholder="Describe the content created, topics covered, development process, and faculty contribution."
                rows="5"
              />

              {errors.contentDescription && (
                <p className="econtent-error">
                  {errors.contentDescription}
                </p>
              )}
            </div>

            <div className="econtent-field econtent-field-full">
              <label htmlFor="learningOutcome">
                Learning Outcomes
              </label>

              <textarea
                id="learningOutcome"
                name="learningOutcome"
                value={formData.learningOutcome}
                onChange={handleChange}
                placeholder="Mention the expected learning outcomes or educational impact."
                rows="4"
              />
            </div>

            <div className="econtent-field">
              <label htmlFor="incentiveEstimate">
                Estimated Incentive Amount
              </label>

              <div className="econtent-currency-input">
                <span>₹</span>

                <input
                  id="incentiveEstimate"
                  type="text"
                  value={estimatedAmount.toLocaleString("en-IN")}
                  readOnly
                  aria-readonly="true"
                />
              </div>

              <small>
                The policy amount is ₹50,000 per eligible
                completed course. This is a frontend estimate;
                final eligibility and calculation must be verified
                by the server and authorized reviewer.
              </small>
            </div>
          </div>

          {/* CO-CREATORS */}
          <div className="econtent-subsection">
            <div className="econtent-subsection-header">
              <div>
                <h3>Co-Creators / Contributors</h3>
                <p>
                  Add other faculty members who contributed to
                  the content.
                </p>
              </div>

              <button
                type="button"
                className="econtent-secondary-button"
                onClick={addCoCreator}
              >
                <Plus size={17} />
                Add Contributor
              </button>
            </div>

            {coCreators.length === 0 ? (
              <div className="econtent-empty">
                <Users size={22} />
                <p>No additional contributors added.</p>
              </div>
            ) : (
              <div className="econtent-creator-list">
                {coCreators.map((creator, index) => (
                  <div
                    className="econtent-creator-row"
                    key={creator.id}
                  >
                    <div className="econtent-creator-number">
                      {index + 1}
                    </div>

                    <div className="econtent-creator-fields">
                      <div className="econtent-field">
                        <label>Name</label>

                        <input
                          type="text"
                          value={creator.name || ""}
                          onChange={(event) =>
                            updateCoCreator(
                              creator.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Contributor name"
                        />

                        {errors[
                          `coCreatorName-${creator.id}`
                        ] && (
                          <p className="econtent-error">
                            {errors[
                              `coCreatorName-${creator.id}`
                            ]}
                          </p>
                        )}
                      </div>

                      <div className="econtent-field">
                        <label>Role</label>

                        <select
                          value={creator.role || ""}
                          onChange={(event) =>
                            updateCoCreator(
                              creator.id,
                              "role",
                              event.target.value
                            )
                          }
                        >
                          <option value="">Select role</option>

                          {FACULTY_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="econtent-field">
                        <label>Department</label>

                        <input
                          type="text"
                          value={creator.department || ""}
                          onChange={(event) =>
                            updateCoCreator(
                              creator.id,
                              "department",
                              event.target.value
                            )
                          }
                          placeholder="Department"
                        />
                      </div>

                      <div className="econtent-field">
                        <label>Institution</label>

                        <input
                          type="text"
                          value={creator.institution || ""}
                          onChange={(event) =>
                            updateCoCreator(
                              creator.id,
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
                      className="econtent-delete-button"
                      onClick={() => removeCoCreator(creator.id)}
                      title="Remove contributor"
                      aria-label="Remove contributor"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SUPPORTING DOCUMENTS */}
        <section className="econtent-card">
          <div className="econtent-section-header">
            <div className="econtent-section-icon">
              <FileText size={20} />
            </div>

            <div>
              <h2>Supporting Documents</h2>
              <p>
                Upload documents supporting the E-Content claim.
              </p>
            </div>
          </div>

          <div className="econtent-document-list">
            {renderDocumentUpload(
              "approvalLetter",
              "Approval Letter",
              "Official approval for creation or publication of the content.",
              true
            )}

            {renderDocumentUpload(
              "contentProof",
              "Content Proof",
              "Proof of the created digital or online content.",
              true
            )}

            {renderDocumentUpload(
              "publicationProof",
              "Publication Proof",
              "Evidence showing publication or availability of the content."
            )}

            {renderDocumentUpload(
              "courseCertificate",
              "Course Certificate",
              "Certificate or official recognition related to the course."
            )}

            {renderDocumentUpload(
              "supportingEvidence",
              "Additional Supporting Evidence",
              "Any additional evidence supporting the claim."
            )}
          </div>

          {loadingDocuments && (
            <div className="econtent-document-note">
              <FileText size={17} />
              <p>Loading previously uploaded documents...</p>
            </div>
          )}

          <div className="econtent-document-note">
            <FileText size={17} />
            <p>
              Accepted formats: PDF, JPG, JPEG, and PNG.
              Maximum file size 10 MB per document.
            </p>
          </div>
        </section>

        {/* DECLARATION */}
        <section className="econtent-card econtent-declaration-card">
          <div className="econtent-section-header">
            <div className="econtent-section-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h2>Declaration</h2>
              <p>
                Confirm the accuracy of the submitted information.
              </p>
            </div>
          </div>

          <div className="econtent-declaration-content">
            <div className="econtent-checkbox-wrapper">
              <input
                id="econtent-declaration"
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

              <div className="econtent-checkbox-content">
                <label
                  htmlFor="econtent-declaration"
                  className="econtent-checkbox-title"
                >
                  I confirm that the information provided
                  in this claim is true and accurate.
                  <span className="econtent-declaration-required">
                    *
                  </span>
                </label>

                <label
                  htmlFor="econtent-declaration"
                  className="econtent-checkbox-description"
                >
                  I hereby declare that the information and
                  documents submitted with this claim are true,
                  complete, and accurate to the best of my
                  knowledge and belief. I understand that the
                  claim and its supporting documents may be
                  reviewed and verified before the incentive
                  is approved.
                </label>
              </div>
            </div>

            {errors.declaration && (
              <p className="econtent-declaration-error">
                {errors.declaration}
              </p>
            )}
          </div>
        </section>

        {/* ACTIONS */}
        <div className="econtent-actions">
          <button
            type="button"
            className="econtent-draft-button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
          >
            {isSavingDraft ? "Saving..." : "Save as Draft"}
          </button>

          <button
            type="submit"
            className="econtent-submit-button"
            disabled={isSubmitting || isSavingDraft}
          >
            {isSubmitting ? "Submitting..." : "Submit Claim"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default EContent;
