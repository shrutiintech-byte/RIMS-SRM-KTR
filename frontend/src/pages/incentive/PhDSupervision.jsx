
import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  IndianRupee,
  Plus,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import "./PhDSupervision.css";

const API_BASE_URL = "http://localhost:5000";

const CLAIM_TYPE = "PHD_SUPERVISION";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

const SUPERVISION_ROLES = [
  "Research Supervisor",
  "Co-Supervisor",
  "Joint Supervisor",
];

const SCHOLAR_STATUSES = [
  "Registered",
  "Coursework Completed",
  "Thesis Submitted",
  "Viva Completed",
  "Degree Awarded",
];

const PROGRAM_TYPES = [
  "Ph.D.",
  "Integrated Ph.D.",
  "Other",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPES = {
  registrationProof: "Registration Proof",
  supervisorApproval: "Supervisor Approval",
  progressReport: "Research Progress Report",
  thesisSubmissionProof: "Thesis Submission Proof",
  degreeCertificate: "Degree Certificate",
  supportingEvidence: "Additional Supporting Evidence",
};

const initialFormData = {
  scholarName: "",
  scholarRegisterNumber: "",
  programType: "",
  otherProgram: "",
  department: "",
  researchTitle: "",
  supervisionRole: "",
  registrationDate: "",
  thesisSubmissionDate: "",
  vivaDate: "",
  degreeAwardDate: "",
  scholarStatus: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  facultyName: "",
  researchArea: "",
  supervisionDetails: "",
  outcome: "",
  incentiveAmount: "",
};

const initialDocuments = {
  registrationProof: null,
  supervisorApproval: null,
  progressReport: null,
  thesisSubmissionProof: null,
  degreeCertificate: null,
  supportingEvidence: null,
};

function PhDSupervision() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState(initialFormData);
  const [coSupervisors, setCoSupervisors] = useState([]);
  const [documents, setDocuments] = useState(initialDocuments);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [claimId, setClaimId] = useState("");
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const draftClaim = location.state?.draftClaim || null;

  /*
    AUTHENTICATION
  */

  const getToken = () =>
    localStorage.getItem("rimsToken") ||
    localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("rimsUser");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  /*
    API HELPER
  */

  const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      throw new Error("Your session has expired. Please login again.");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Your session has expired. Please login again.");
    }

    let result = null;

    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      const error = new Error(
        result?.message || `Request failed with status ${response.status}.`
      );

      error.status = response.status;
      error.response = result;

      throw error;
    }

    return result;
  };

  /*
    LOAD FACULTY NAME
  */

  const getStoredUser = () => {
    try {
      const storedUser =
        localStorage.getItem("rimsUser") ||
        localStorage.getItem("user");

      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  };

  /*
    HYDRATE DRAFT
  */

  useEffect(() => {
    if (!draftClaim) {
      const user = getStoredUser();

      if (user?.fullName) {
        setFormData((previous) => ({
          ...previous,
          facultyName: previous.facultyName || user.fullName,
        }));
      }

      return;
    }

    const draftFormData = draftClaim.formData || {};

    setFormData({
      ...initialFormData,
      ...draftFormData,
    });

    setCoSupervisors(
      Array.isArray(draftFormData.coSupervisors)
        ? draftFormData.coSupervisors.map((supervisor, index) => ({
            ...supervisor,
            id: supervisor.id || Date.now() + index,
          }))
        : []
    );

    setDeclarationAccepted(Boolean(draftClaim.declarationAccepted));

    if (draftClaim._id) {
      setClaimId(draftClaim._id);
      setIsEditingDraft(true);
    }
  }, [draftClaim]);

  /*
    LOAD EXISTING DOCUMENTS
  */

  useEffect(() => {
    if (!claimId) return;

    const loadExistingDocuments = async () => {
      try {
        const result = await apiRequest(
          `/api/documents?claimId=${encodeURIComponent(claimId)}`
        );

        setExistingDocuments(result?.data?.documents || []);
      } catch (error) {
        console.error(
          "Unable to load PhD supervision documents:",
          error
        );
      }
    };

    loadExistingDocuments();
  }, [claimId]);

  /*
    FORM CHANGE
  */

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

  /*
    CO-SUPERVISORS
  */

  const addCoSupervisor = () => {
    setCoSupervisors((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${previous.length}`,
        name: "",
        role: "",
        department: "",
        institution: "",
      },
    ]);

    setSuccessMessage("");
  };

  const updateCoSupervisor = (id, field, value) => {
    setCoSupervisors((previous) =>
      previous.map((supervisor) =>
        supervisor.id === id
          ? { ...supervisor, [field]: value }
          : supervisor
      )
    );

    setErrors((previous) => ({
      ...previous,
      coSupervisor: "",
    }));

    setSuccessMessage("");
  };

  const removeCoSupervisor = (id) => {
    setCoSupervisors((previous) =>
      previous.filter((supervisor) => supervisor.id !== id)
    );

    setErrors((previous) => ({
      ...previous,
      coSupervisor: "",
    }));
  };

  /*
    DOCUMENT SELECTION
  */

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

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
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

    const input = document.getElementById(`phd-${documentKey}`);

    if (input) {
      input.value = "";
    }
  };

  /*
    EXISTING DOCUMENT CHECK
  */

  const getUploadedDocument = (documentType) => {
    return existingDocuments.find(
      (document) =>
        document.documentType === documentType &&
        document.status !== "REJECTED"
    );
  };

  /*
    VALIDATION
  */

  const validateForm = () => {
    const newErrors = {};

    if (!formData.scholarName.trim()) {
      newErrors.scholarName = "Scholar name is required.";
    }

    if (!formData.scholarRegisterNumber.trim()) {
      newErrors.scholarRegisterNumber =
        "Scholar registration number is required.";
    }

    if (!formData.programType) {
      newErrors.programType = "Please select the program type.";
    }

    if (
      formData.programType === "Other" &&
      !formData.otherProgram.trim()
    ) {
      newErrors.otherProgram = "Please specify the program.";
    }

    if (!formData.department.trim()) {
      newErrors.department = "Department is required.";
    }

    if (!formData.researchTitle.trim()) {
      newErrors.researchTitle = "Research title is required.";
    }

    if (!formData.supervisionRole) {
      newErrors.supervisionRole =
        "Please select your supervision role.";
    }

    if (!formData.registrationDate) {
      newErrors.registrationDate = "Registration date is required.";
    }

    if (!formData.scholarStatus) {
      newErrors.scholarStatus = "Please select the scholar status.";
    }

    if (!formData.financialYear) {
      newErrors.financialYear = "Financial year is required.";
    }

    if (!formData.facultyName.trim()) {
      newErrors.facultyName = "Faculty name is required.";
    }

    if (!formData.researchArea.trim()) {
      newErrors.researchArea = "Research area is required.";
    }

    if (!formData.supervisionDetails.trim()) {
      newErrors.supervisionDetails =
        "Please provide supervision details.";
    }

    if (!declarationAccepted) {
      newErrors.declaration =
        "Please accept the declaration before submitting.";
    }

    if (
      !documents.registrationProof &&
      !getUploadedDocument(DOCUMENT_TYPES.registrationProof)
    ) {
      newErrors.registrationProof = "Registration proof is required.";
    }

    if (
      !documents.supervisorApproval &&
      !getUploadedDocument(DOCUMENT_TYPES.supervisorApproval)
    ) {
      newErrors.supervisorApproval = "Supervisor approval is required.";
    }

    if (
      !documents.progressReport &&
      !getUploadedDocument(DOCUMENT_TYPES.progressReport)
    ) {
      newErrors.progressReport = "Progress report is required.";
    }

    coSupervisors.forEach((supervisor, index) => {
      if (!supervisor.name.trim()) {
        newErrors[`coSupervisor-${index}`] =
          `Supervisor ${index + 1} name is required.`;
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /*
    CLAIM PAYLOAD
  */

  const buildClaimPayload = () => ({
    claimType: CLAIM_TYPE,
    financialYear: formData.financialYear || CURRENT_FINANCIAL_YEAR,
    incentiveAmount: Number(formData.incentiveAmount || 0),
    declarationAccepted,
    formData: {
      ...formData,
      coSupervisors,
    },
  });

  /*
    SAVE CLAIM
  */

  const saveClaim = async () => {
    const payload = buildClaimPayload();

    let result;

    if (claimId) {
      result = await apiRequest(`/api/claims/${claimId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      result = await apiRequest("/api/claims", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    const savedClaim = result?.data?.claim;

    const savedClaimId =
      savedClaim?._id ||
      result?.data?._id ||
      claimId;

    if (!savedClaimId) {
      throw new Error(
        "The server did not return a claim ID. Please check the API response."
      );
    }

    setClaimId(savedClaimId);
    setIsEditingDraft(true);

    return savedClaimId;
  };

  /*
    UPLOAD SELECTED DOCUMENTS
  */

  const uploadSelectedDocuments = async (currentClaimId) => {
    const filesToUpload = Object.entries(documents).filter(
      ([, file]) => Boolean(file)
    );

    if (filesToUpload.length === 0) {
      return true;
    }

    if (!currentClaimId) {
      throw new Error(
        "Claim must be saved before uploading documents."
      );
    }

    setIsUploading(true);

    try {
      for (const [documentKey, file] of filesToUpload) {
        const formDataToUpload = new FormData();

        formDataToUpload.append("claimId", currentClaimId);
        formDataToUpload.append(
          "documentType",
          DOCUMENT_TYPES[documentKey]
        );
        formDataToUpload.append("document", file);

        await apiRequest("/api/documents", {
          method: "POST",
          body: formDataToUpload,
        });

        setDocuments((previous) => ({
          ...previous,
          [documentKey]: null,
        }));

        const input = document.getElementById(
          `phd-${documentKey}`
        );

        if (input) {
          input.value = "";
        }
      }

      const result = await apiRequest(
        `/api/documents?claimId=${encodeURIComponent(currentClaimId)}`
      );

      setExistingDocuments(result?.data?.documents || []);

      return true;
    } finally {
      setIsUploading(false);
    }
  };

  /*
    SAVE AS DRAFT
  */

  const handleSaveDraft = async () => {
    setSuccessMessage("");
    setErrors({});
    setIsSaving(true);

    try {
      const savedClaimId = await saveClaim();

      await uploadSelectedDocuments(savedClaimId);

      setSuccessMessage(
        "PhD supervision claim saved as draft."
      );
    } catch (error) {
      console.error(
        "Unable to save PhD supervision draft:",
        error
      );

      setSuccessMessage(
        error.message ||
          "Unable to save the draft. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
    SUBMIT CLAIM
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage("");

    const isValid = validateForm();

    if (!isValid) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const savedClaimId = await saveClaim();

      await uploadSelectedDocuments(savedClaimId);

      const documentResult = await apiRequest(
        `/api/documents?claimId=${encodeURIComponent(savedClaimId)}`
      );

      const latestDocuments =
        documentResult?.data?.documents || [];

      setExistingDocuments(latestDocuments);

      const hasDocument = (documentType) =>
        latestDocuments.some(
          (document) =>
            document.documentType === documentType &&
            document.status !== "REJECTED"
        );

      if (
        !hasDocument(DOCUMENT_TYPES.registrationProof) ||
        !hasDocument(DOCUMENT_TYPES.supervisorApproval) ||
        !hasDocument(DOCUMENT_TYPES.progressReport)
      ) {
        throw new Error(
          "All required supporting documents must be uploaded before submitting."
        );
      }

      await apiRequest(`/api/claims/${savedClaimId}/submit`, {
        method: "POST",
      });

      setSuccessMessage(
        "PhD supervision claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 700);
    } catch (error) {
      console.error(
        "PhD supervision submission error:",
        error
      );

      setSuccessMessage(
        error.message ||
          "Unable to submit the claim. Please try again."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
    FILE SIZE
  */

  const formatFileSize = (bytes) => {
    if (!bytes) return "";

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  /*
    DOCUMENT UPLOAD UI
  */

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
      <div className="phd-document" key={documentKey}>
        <div className="phd-document-information">
          <div className="phd-document-icon">
            <FileText size={18} />
          </div>

          <div>
            <div className="phd-document-title">
              <strong>{label}</strong>

              {required && (
                <span className="phd-document-required">
                  Required
                </span>
              )}
            </div>

            <p>{description}</p>

            {uploadedDocument && (
              <div
                style={{
                  marginTop: "5px",
                  fontSize: "8px",
                  color: "#47755e",
                }}
              >
                Uploaded:{" "}
                {uploadedDocument.originalName || "Document"}
              </div>
            )}
          </div>
        </div>

        {!file ? (
          <label className="phd-upload">
            <Upload size={15} />
            <span>
              {uploadedDocument ? "Replace File" : "Choose File"}
            </span>

            <input
              id={`phd-${documentKey}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) =>
                handleDocumentChange(event, documentKey)
              }
              disabled={isSaving || isSubmitting || isUploading}
            />
          </label>
        ) : (
          <button
            type="button"
            className="phd-upload"
            onClick={() => removeDocument(documentKey)}
            disabled={isSaving || isSubmitting || isUploading}
          >
            <Upload size={15} />
            <span>Remove Selected File</span>
          </button>
        )}

        {file && (
          <span className="phd-selected-file">
            {file.name}{" "}
            <small>({formatFileSize(file.size)})</small>
          </span>
        )}

        {errors[documentKey] && (
          <p className="phd-error">{errors[documentKey]}</p>
        )}
      </div>
    );
  };

  /*
    UI
  */

  return (
    <main className="phd-page">
      {/* Header */}

      <section className="phd-header">
        <button
          type="button"
          className="phd-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <div className="phd-heading">
          <span className="phd-eyebrow">
            Research Incentive
          </span>

          <h1>PhD Supervision</h1>

          <p>
            Submit an incentive claim for PhD research supervision.
          </p>
        </div>
      </section>

      {/* Success Message */}

      {successMessage && (
        <div className="phd-success-message">
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <form className="phd-form" onSubmit={handleSubmit}>
        {/* Scholar Information */}

        <section className="phd-card">
          <div className="phd-section-header">
            <div className="phd-section-icon">
              <Users size={20} />
            </div>

            <div>
              <h2>Scholar Information</h2>
              <p>
                Enter the details of the PhD scholar associated with
                the supervision claim.
              </p>
            </div>
          </div>

          <div className="phd-form-grid">
            <div className="phd-field">
              <label htmlFor="scholarName">
                Scholar Name <span>*</span>
              </label>

              <input
                id="scholarName"
                name="scholarName"
                type="text"
                value={formData.scholarName}
                onChange={handleChange}
                placeholder="Enter scholar's full name"
              />

              {errors.scholarName && (
                <p className="phd-error">{errors.scholarName}</p>
              )}
            </div>

            <div className="phd-field">
              <label htmlFor="scholarRegisterNumber">
                Registration Number <span>*</span>
              </label>

              <input
                id="scholarRegisterNumber"
                name="scholarRegisterNumber"
                type="text"
                value={formData.scholarRegisterNumber}
                onChange={handleChange}
                placeholder="Enter registration number"
              />

              {errors.scholarRegisterNumber && (
                <p className="phd-error">
                  {errors.scholarRegisterNumber}
                </p>
              )}
            </div>

            <div className="phd-field">
              <label htmlFor="programType">
                Program Type <span>*</span>
              </label>

              <select
                id="programType"
                name="programType"
                value={formData.programType}
                onChange={handleChange}
              >
                <option value="">Select program type</option>

                {PROGRAM_TYPES.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>

              {errors.programType && (
                <p className="phd-error">{errors.programType}</p>
              )}
            </div>

            {formData.programType === "Other" && (
              <div className="phd-field">
                <label htmlFor="otherProgram">
                  Specify Program <span>*</span>
                </label>

                <input
                  id="otherProgram"
                  name="otherProgram"
                  type="text"
                  value={formData.otherProgram}
                  onChange={handleChange}
                  placeholder="Enter program name"
                />

                {errors.otherProgram && (
                  <p className="phd-error">{errors.otherProgram}</p>
                )}
              </div>
            )}

            <div className="phd-field">
              <label htmlFor="department">
                Department <span>*</span>
              </label>

              <input
                id="department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter department"
              />

              {errors.department && (
                <p className="phd-error">{errors.department}</p>
              )}
            </div>

            <div className="phd-field phd-field-full">
              <label htmlFor="researchTitle">
                Research / Thesis Title <span>*</span>
              </label>

              <input
                id="researchTitle"
                name="researchTitle"
                type="text"
                value={formData.researchTitle}
                onChange={handleChange}
                placeholder="Enter research or thesis title"
              />

              {errors.researchTitle && (
                <p className="phd-error">{errors.researchTitle}</p>
              )}
            </div>
          </div>
        </section>

        {/* Supervision Details */}

        <section className="phd-card">
          <div className="phd-section-header">
            <div className="phd-section-icon">
              <UserCheck size={20} />
            </div>

            <div>
              <h2>Supervision Details</h2>
              <p>
                Provide information about your role and supervision
                activities.
              </p>
            </div>
          </div>

          <div className="phd-form-grid">
            <div className="phd-field">
              <label htmlFor="supervisionRole">
                Supervision Role <span>*</span>
              </label>

              <select
                id="supervisionRole"
                name="supervisionRole"
                value={formData.supervisionRole}
                onChange={handleChange}
              >
                <option value="">Select supervision role</option>

                {SUPERVISION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {errors.supervisionRole && (
                <p className="phd-error">
                  {errors.supervisionRole}
                </p>
              )}
            </div>

            <div className="phd-field">
              <label htmlFor="scholarStatus">
                Scholar Status <span>*</span>
              </label>

              <select
                id="scholarStatus"
                name="scholarStatus"
                value={formData.scholarStatus}
                onChange={handleChange}
              >
                <option value="">Select scholar status</option>

                {SCHOLAR_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {errors.scholarStatus && (
                <p className="phd-error">{errors.scholarStatus}</p>
              )}
            </div>

            <div className="phd-field">
              <label htmlFor="registrationDate">
                Registration Date <span>*</span>
              </label>

              <input
                id="registrationDate"
                name="registrationDate"
                type="date"
                value={formData.registrationDate}
                onChange={handleChange}
              />

              {errors.registrationDate && (
                <p className="phd-error">
                  {errors.registrationDate}
                </p>
              )}
            </div>

            <div className="phd-field">
              <label htmlFor="thesisSubmissionDate">
                Thesis Submission Date
              </label>

              <input
                id="thesisSubmissionDate"
                name="thesisSubmissionDate"
                type="date"
                value={formData.thesisSubmissionDate}
                onChange={handleChange}
              />
            </div>

            <div className="phd-field">
              <label htmlFor="vivaDate">Viva Date</label>

              <input
                id="vivaDate"
                name="vivaDate"
                type="date"
                value={formData.vivaDate}
                onChange={handleChange}
              />
            </div>

            <div className="phd-field">
              <label htmlFor="degreeAwardDate">
                Degree Award Date
              </label>

              <input
                id="degreeAwardDate"
                name="degreeAwardDate"
                type="date"
                value={formData.degreeAwardDate}
                onChange={handleChange}
              />
            </div>

            <div className="phd-field">
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
                <p className="phd-error">{errors.financialYear}</p>
              )}
            </div>
          </div>

          {/* Co Supervisors */}

          <div className="phd-subsection">
            <div className="phd-subsection-header">
              <div>
                <h3>Co-Supervisors / Joint Supervisors</h3>
                <p>
                  Add other faculty members involved in the supervision.
                </p>
              </div>

              <button
                type="button"
                className="phd-secondary-button"
                onClick={addCoSupervisor}
                disabled={isSaving || isSubmitting || isUploading}
              >
                <Plus size={17} />
                Add Supervisor
              </button>
            </div>

            {coSupervisors.length === 0 ? (
              <div className="phd-empty-supervisors">
                <Users size={22} />
                <p>No additional supervisors added.</p>
              </div>
            ) : (
              <div className="phd-supervisor-list">
                {coSupervisors.map((supervisor, index) => (
                  <div
                    className="phd-supervisor-row"
                    key={supervisor.id}
                  >
                    <div className="phd-supervisor-number">
                      {index + 1}
                    </div>

                    <div className="phd-supervisor-fields">
                      <div className="phd-field">
                        <label>Name</label>

                        <input
                          type="text"
                          value={supervisor.name}
                          onChange={(event) =>
                            updateCoSupervisor(
                              supervisor.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Supervisor name"
                        />
                      </div>

                      <div className="phd-field">
                        <label>Role</label>

                        <select
                          value={supervisor.role}
                          onChange={(event) =>
                            updateCoSupervisor(
                              supervisor.id,
                              "role",
                              event.target.value
                            )
                          }
                        >
                          <option value="">Select role</option>

                          {SUPERVISION_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="phd-field">
                        <label>Department</label>

                        <input
                          type="text"
                          value={supervisor.department}
                          onChange={(event) =>
                            updateCoSupervisor(
                              supervisor.id,
                              "department",
                              event.target.value
                            )
                          }
                          placeholder="Department"
                        />
                      </div>

                      <div className="phd-field">
                        <label>Institution</label>

                        <input
                          type="text"
                          value={supervisor.institution}
                          onChange={(event) =>
                            updateCoSupervisor(
                              supervisor.id,
                              "institution",
                              event.target.value
                            )
                          }
                          placeholder="Institution"
                        />
                      </div>

                      {errors[`coSupervisor-${index}`] && (
                        <p className="phd-error">
                          {errors[`coSupervisor-${index}`]}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="phd-delete-button"
                      onClick={() =>
                        removeCoSupervisor(supervisor.id)
                      }
                      disabled={isSaving || isSubmitting || isUploading}
                      title="Remove supervisor"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Faculty Information */}

        <section className="phd-card">
          <div className="phd-section-header">
            <div className="phd-section-icon">
              <UserCheck size={20} />
            </div>

            <div>
              <h2>Faculty Information</h2>
              <p>
                Enter the faculty member's research and supervision
                information.
              </p>
            </div>
          </div>

          <div className="phd-form-grid">
            <div className="phd-field">
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
                <p className="phd-error">{errors.facultyName}</p>
              )}
            </div>

            <div className="phd-field">
              <label htmlFor="researchArea">
                Research Area <span>*</span>
              </label>

              <input
                id="researchArea"
                name="researchArea"
                type="text"
                value={formData.researchArea}
                onChange={handleChange}
                placeholder="e.g. Artificial Intelligence"
              />

              {errors.researchArea && (
                <p className="phd-error">{errors.researchArea}</p>
              )}
            </div>

            <div className="phd-field phd-field-full">
              <label htmlFor="supervisionDetails">
                Supervision Details <span>*</span>
              </label>

              <textarea
                id="supervisionDetails"
                name="supervisionDetails"
                value={formData.supervisionDetails}
                onChange={handleChange}
                placeholder="Describe the supervision activities, guidance provided, research monitoring, reviews, meetings, etc."
                rows="5"
              />

              {errors.supervisionDetails && (
                <p className="phd-error">
                  {errors.supervisionDetails}
                </p>
              )}
            </div>

            <div className="phd-field phd-field-full">
              <label htmlFor="outcome">Research Outcome</label>

              <textarea
                id="outcome"
                name="outcome"
                value={formData.outcome}
                onChange={handleChange}
                placeholder="Mention publications, thesis submission, patents, awards, degree completion, or other outcomes."
                rows="4"
              />
            </div>

            <div className="phd-field">
              <label htmlFor="incentiveAmount">
                Claimed Incentive Amount
              </label>

              <div className="phd-currency-input">
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

              <small className="phd-helper-text">
                Enter the amount applicable under the institutional
                incentive policy.
              </small>
            </div>
          </div>
        </section>

        {/* Supporting Documents */}

        <section className="phd-card">
          <div className="phd-section-header">
            <div className="phd-section-icon">
              <FileText size={20} />
            </div>

            <div>
              <h2>Supporting Documents</h2>
              <p>
                Upload documents supporting the PhD supervision claim.
              </p>
            </div>
          </div>

          <div className="phd-document-list">
            {renderDocumentUpload(
              "registrationProof",
              "Registration Proof",
              "Official PhD registration or admission proof.",
              true
            )}

            {renderDocumentUpload(
              "supervisorApproval",
              "Supervisor Approval",
              "Official approval or appointment document.",
              true
            )}

            {renderDocumentUpload(
              "progressReport",
              "Research Progress Report",
              "Latest research progress or supervision report.",
              true
            )}

            {renderDocumentUpload(
              "thesisSubmissionProof",
              "Thesis Submission Proof",
              "Proof of thesis submission, if applicable."
            )}

            {renderDocumentUpload(
              "degreeCertificate",
              "Degree Certificate",
              "PhD degree certificate, if the degree has been awarded."
            )}

            {renderDocumentUpload(
              "supportingEvidence",
              "Additional Supporting Evidence",
              "Any additional document supporting the claim."
            )}
          </div>

          <div className="phd-document-note">
            <FileText size={17} />

            <p>
              Accepted formats: PDF, JPG, JPEG, and PNG. Maximum file
              size 10 MB per document.
            </p>
          </div>
        </section>

        {/* Declaration */}

        <section className="phd-card phd-declaration-card">
          <div className="phd-section-header">
            <div className="phd-section-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <h2>Declaration</h2>
              <p>
                Confirm the accuracy of the submitted information.
              </p>
            </div>
          </div>

          <label className="phd-checkbox-wrapper">
            <input
              type="checkbox"
              name="declaration"
              checked={declarationAccepted}
              onChange={(event) => {
                setDeclarationAccepted(event.target.checked);

                setErrors((previous) => ({
                  ...previous,
                  declaration: "",
                }));

                setSuccessMessage("");
              }}
            />

            <span>
              I hereby declare that the information provided in this
              claim is true and accurate to the best of my knowledge.
              I understand that the submitted claim and supporting
              documents may be verified before approval.
            </span>
          </label>

          {errors.declaration && (
            <p className="phd-error">{errors.declaration}</p>
          )}
        </section>

        {/* Actions */}

        <div className="phd-actions">
          <button
            type="button"
            className="phd-draft-button"
            onClick={handleSaveDraft}
            disabled={isSaving || isSubmitting || isUploading}
          >
            {isSaving ? "Saving..." : "Save as Draft"}
          </button>

          <button
            type="submit"
            className="phd-submit-button"
            disabled={isSaving || isSubmitting || isUploading}
          >
            {isSubmitting
              ? "Submitting..."
              : isUploading
              ? "Uploading..."
              : "Submit Claim"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default PhDSupervision;