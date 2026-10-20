
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  IndianRupee,
  MapPin,
  Plus,
  Presentation,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import "./ConferenceProceedings.css";

const API_BASE_URL = "http://localhost:5000";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

const CONFERENCE_TYPES = [
  "International",
  "National",
  "Regional",
  "Institutional",
  "Other",
];

const PRESENTATION_TYPES = [
  "Oral Presentation",
  "Poster Presentation",
  "Keynote",
  "Invited Talk",
  "Plenary Talk",
  "Other",
];

const AUTHOR_ROLES = [
  "Presenter",
  "Author",
  "Co-Author",
  "Corresponding Author",
  "Invited Speaker",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPES = {
  acceptanceLetter: "Acceptance Letter",
  presentationCertificate: "Presentation Certificate",
  proceedingsPaper: "Proceedings Paper",
  conferenceCertificate: "Conference Certificate",
  isbnIssnProof: "ISBN / ISSN Proof",
  supportingEvidence: "Supporting Evidence",
};

const initialFormData = {
  conferenceTitle: "",
  paperTitle: "",
  conferenceType: "",
  otherConferenceType: "",
  organizer: "",
  conferenceLocation: "",
  conferenceStartDate: "",
  conferenceEndDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  proceedingsTitle: "",
  isbnIssn: "",
  publicationDate: "",
  presentationType: "",
  otherPresentationType: "",
  facultyName: "",
  authorRole: "Presenter",
  paperAbstract: "",
  contribution: "",
  incentiveAmount: "",
};

const initialDocuments = {
  acceptanceLetter: null,
  presentationCertificate: null,
  proceedingsPaper: null,
  conferenceCertificate: null,
  isbnIssnProof: null,
  supportingEvidence: null,
};

function ConferenceProceedings() {
  const navigate = useNavigate();
  const location = useLocation();

  const draftClaim = location.state?.draftClaim;

  const [formData, setFormData] = useState(initialFormData);
  const [coAuthors, setCoAuthors] = useState([]);
  const [documents, setDocuments] = useState(initialDocuments);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedMessage, setSavedMessage] = useState("");
  const [claimId, setClaimId] = useState(draftClaim?._id || null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  // =========================
  // AUTHENTICATION
  // =========================

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
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const handleApiError = async (response) => {
    if (response.status === 401) {
      handleUnauthorized();
      return true;
    }

    return false;
  };

  // =========================
  // LOAD FACULTY DETAILS
  // =========================

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("rimsUser");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        if (user?.fullName) {
          setFormData((previous) => ({
            ...previous,
            facultyName: previous.facultyName || user.fullName,
          }));
        }
      } catch (error) {
        console.error(
          "Unable to read stored user:",
          error.message
        );
      }
    }
  }, []);

  // =========================
  // LOAD EXISTING DRAFT DATA
  // =========================

  useEffect(() => {
    if (!draftClaim) return;

    const draftFormData = draftClaim.formData || {};

    setFormData((previous) => ({
      ...previous,
      ...draftFormData,
      incentiveAmount:
        draftClaim.incentiveAmount ??
        draftFormData.incentiveAmount ??
        "",
    }));

    setCoAuthors(
      Array.isArray(draftFormData.coAuthors)
        ? draftFormData.coAuthors.map((author, index) => ({
            id: author.id || `${Date.now()}-${index}`,
            name: author.name || "",
            role: author.role || "Co-Author",
            affiliation: author.affiliation || "",
          }))
        : []
    );

    setDeclarationAccepted(
      Boolean(draftClaim.declarationAccepted)
    );

    setClaimId(draftClaim._id || null);
  }, [draftClaim]);

  // =========================
  // LOAD EXISTING DOCUMENTS
  // =========================

  useEffect(() => {
    const loadExistingDocuments = async () => {
      if (!claimId) return;

      const token = getToken();

      if (!token) {
        handleUnauthorized();
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

        if (await handleApiError(response)) return;

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to retrieve documents."
          );
        }

        setExistingDocuments(
          data.data?.documents || []
        );
      } catch (error) {
        console.error(
          "Load conference documents error:",
          error
        );

        setSavedMessage(
          error.message ||
            "Unable to load previously uploaded documents."
        );
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadExistingDocuments();
  }, [claimId]);

  // =========================
  // FORM HANDLERS
  // =========================

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

    setSavedMessage("");
  };

  const handleFileChange = (event, documentName) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrors((previous) => ({
        ...previous,
        [documentName]: "File size must not exceed 10 MB.",
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
        [documentName]:
          "Only PDF, JPG and PNG files are allowed.",
      }));

      event.target.value = "";
      return;
    }

    setDocuments((previous) => ({
      ...previous,
      [documentName]: file,
    }));

    setErrors((previous) => ({
      ...previous,
      [documentName]: "",
    }));

    setSavedMessage("");
  };

  // =========================
  // CO-AUTHOR HANDLERS
  // =========================

  const addCoAuthor = () => {
    setCoAuthors((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${previous.length}`,
        name: "",
        role: "Co-Author",
        affiliation: "",
      },
    ]);

    setSavedMessage("");
  };

  const updateCoAuthor = (id, field, value) => {
    setCoAuthors((previous) =>
      previous.map((author) =>
        author.id === id
          ? { ...author, [field]: value }
          : author
      )
    );

    setErrors((previous) => ({
      ...previous,
      [`coAuthor-${id}`]: "",
    }));

    setSavedMessage("");
  };

  const removeCoAuthor = (id) => {
    setCoAuthors((previous) =>
      previous.filter((author) => author.id !== id)
    );

    setErrors((previous) => ({
      ...previous,
      [`coAuthor-${id}`]: "",
    }));

    setSavedMessage("");
  };

  // =========================
  // DOCUMENT LOOKUP
  // =========================

  const getUploadedDocument = (documentType) => {
    return existingDocuments.find(
      (document) =>
        document.documentType === documentType &&
        document.status !== "REJECTED"
    );
  };

  // =========================
  // FORM VALIDATION
  // =========================

  const validateForm = () => {
    const newErrors = {};

    if (!formData.conferenceTitle.trim()) {
      newErrors.conferenceTitle =
        "Conference title is required.";
    }

    if (!formData.paperTitle.trim()) {
      newErrors.paperTitle =
        "Paper title is required.";
    }

    if (!formData.conferenceType) {
      newErrors.conferenceType =
        "Please select a conference type.";
    }

    if (
      formData.conferenceType === "Other" &&
      !formData.otherConferenceType.trim()
    ) {
      newErrors.otherConferenceType =
        "Please specify the conference type.";
    }

    if (!formData.organizer.trim()) {
      newErrors.organizer =
        "Conference organizer is required.";
    }

    if (!formData.conferenceLocation.trim()) {
      newErrors.conferenceLocation =
        "Conference location is required.";
    }

    if (!formData.conferenceStartDate) {
      newErrors.conferenceStartDate =
        "Conference start date is required.";
    }

    if (!formData.conferenceEndDate) {
      newErrors.conferenceEndDate =
        "Conference end date is required.";
    }

    if (
      formData.conferenceStartDate &&
      formData.conferenceEndDate &&
      formData.conferenceEndDate < formData.conferenceStartDate
    ) {
      newErrors.conferenceEndDate =
        "End date cannot be before start date.";
    }

    if (!formData.facultyName.trim()) {
      newErrors.facultyName =
        "Faculty name is required.";
    }

    if (!formData.presentationType) {
      newErrors.presentationType =
        "Please select a presentation type.";
    }

    if (
      formData.presentationType === "Other" &&
      !formData.otherPresentationType.trim()
    ) {
      newErrors.otherPresentationType =
        "Please specify the presentation type.";
    }

    if (!formData.paperAbstract.trim()) {
      newErrors.paperAbstract =
        "Please provide the paper abstract or summary.";
    }

    if (!formData.contribution.trim()) {
      newErrors.contribution =
        "Please describe your contribution.";
    }

    if (
      formData.incentiveAmount === "" ||
      Number(formData.incentiveAmount) < 0
    ) {
      newErrors.incentiveAmount =
        "Please enter a valid incentive amount.";
    }

    if (
      !getUploadedDocument(DOCUMENT_TYPES.acceptanceLetter) &&
      !documents.acceptanceLetter
    ) {
      newErrors.acceptanceLetter =
        "Acceptance letter is required.";
    }

    if (
      !getUploadedDocument(DOCUMENT_TYPES.presentationCertificate) &&
      !documents.presentationCertificate
    ) {
      newErrors.presentationCertificate =
        "Presentation certificate is required.";
    }

    if (
      !getUploadedDocument(DOCUMENT_TYPES.proceedingsPaper) &&
      !documents.proceedingsPaper
    ) {
      newErrors.proceedingsPaper =
        "Proceedings paper is required.";
    }

    if (!declarationAccepted) {
      newErrors.declaration =
        "You must accept the declaration before submitting.";
    }

    coAuthors.forEach((author, index) => {
      if (!author.name.trim()) {
        newErrors[`coAuthor-${author.id}`] =
          `Please enter the name of co-author ${index + 1}.`;
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =========================
  // CREATE / UPDATE CLAIM
  // =========================

  const createOrUpdateClaim = async () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return null;
    }

    const payload = {
      claimType: "CONFERENCE_PROCEEDINGS",
      financialYear: formData.financialYear,
      incentiveAmount:
        Number(formData.incentiveAmount) || 0,
      declarationAccepted,
      formData: {
        conferenceTitle: formData.conferenceTitle.trim(),
        paperTitle: formData.paperTitle.trim(),
        conferenceType: formData.conferenceType,
        otherConferenceType:
          formData.otherConferenceType.trim(),
        organizer: formData.organizer.trim(),
        conferenceLocation:
          formData.conferenceLocation.trim(),
        conferenceStartDate: formData.conferenceStartDate,
        conferenceEndDate: formData.conferenceEndDate,
        proceedingsTitle:
          formData.proceedingsTitle.trim(),
        isbnIssn: formData.isbnIssn.trim(),
        publicationDate: formData.publicationDate,
        presentationType: formData.presentationType,
        otherPresentationType:
          formData.otherPresentationType.trim(),
        facultyName: formData.facultyName.trim(),
        authorRole: formData.authorRole,
        paperAbstract: formData.paperAbstract.trim(),
        contribution: formData.contribution.trim(),
        coAuthors: coAuthors.map(
          ({ name, role, affiliation }) => ({
            name: name.trim(),
            role,
            affiliation: affiliation.trim(),
          })
        ),
      },
    };

    const url = claimId
      ? `${API_BASE_URL}/api/claims/${claimId}`
      : `${API_BASE_URL}/api/claims`;

    const method = claimId ? "PATCH" : "POST";

    console.log("Saving conference claim:", {
      url,
      method,
      claimType: payload.claimType,
      financialYear: payload.financialYear,
    });

    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (await handleApiError(response)) return null;

    const data = await response.json();

    console.log("Conference claim API response:", {
      status: response.status,
      data,
    });

    if (!response.ok) {
      const error = new Error(
        data.message ||
          "Unable to save conference proceedings claim."
      );

      error.status = response.status;
      error.response = data;

      throw error;
    }

    const savedClaim =
      data.data?.claim || data.claim;

    if (savedClaim?._id) {
      setClaimId(savedClaim._id);
    }

    return savedClaim;
  };

  // =========================
  // UPLOAD SELECTED DOCUMENTS
  // =========================

  const uploadSelectedDocuments = async (currentClaimId) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return false;
    }

    const selectedDocuments = Object.entries(documents)
      .filter(([, file]) => Boolean(file));

    if (selectedDocuments.length === 0) {
      return true;
    }

    for (const [documentName, file] of selectedDocuments) {
      const formDataToUpload = new FormData();

      formDataToUpload.append("claimId", currentClaimId);
      formDataToUpload.append(
        "documentType",
        DOCUMENT_TYPES[documentName]
      );
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

      if (await handleApiError(response)) return false;

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(
          data.message ||
            `Unable to upload ${DOCUMENT_TYPES[documentName]}.`
        );

        error.status = response.status;
        error.response = data;

        throw error;
      }
    }

    const documentsResponse = await fetch(
      `${API_BASE_URL}/api/documents?claimId=${currentClaimId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (await handleApiError(documentsResponse)) return false;

    const documentsData = await documentsResponse.json();

    if (!documentsResponse.ok) {
      throw new Error(
        documentsData.message ||
          "Unable to refresh uploaded documents."
      );
    }

    setExistingDocuments(
      documentsData.data?.documents || []
    );

    setDocuments({ ...initialDocuments });

    return true;
  };

  // =========================
  // SAVE DRAFT
  // =========================

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setSavedMessage("");
      setErrors({});

      const savedClaim = await createOrUpdateClaim();

      if (!savedClaim?._id) {
        throw new Error(
          "Claim API did not return a valid claim ID."
        );
      }

      const uploaded = await uploadSelectedDocuments(
        savedClaim._id
      );

      if (!uploaded) {
        throw new Error(
          "Claim was saved, but document upload failed."
        );
      }

      setSavedMessage("Draft saved successfully.");
    } catch (error) {
      console.error("Save conference draft failed:", {
        message: error.message,
        status: error.status,
        response: error.response,
        stack: error.stack,
      });

      setSavedMessage(
        error.message || "Unable to save draft."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // SUBMIT CLAIM
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSavedMessage("");

    const isValid = validateForm();

    if (!isValid) return;

    try {
      setSubmitting(true);

      const savedClaim = await createOrUpdateClaim();

      if (!savedClaim?._id) {
        throw new Error("Claim could not be created.");
      }

      const uploaded = await uploadSelectedDocuments(
        savedClaim._id
      );

      if (!uploaded) return;

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const submitResponse = await fetch(
        `${API_BASE_URL}/api/claims/${savedClaim._id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (await handleApiError(submitResponse)) return;

      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(
          submitData.message || "Unable to submit claim."
        );
      }

      setSavedMessage(
        "Conference proceedings claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 800);
    } catch (error) {
      console.error("Submit conference claim error:", {
        message: error.message,
        status: error.status,
        response: error.response,
        stack: error.stack,
      });

      setSavedMessage(
        error.message || "Unable to submit claim."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // DELETE DOCUMENT
  // =========================

  const handleDeleteDocument = async (documentId) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setDeletingDocumentId(documentId);
      setSavedMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (await handleApiError(response)) return;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to remove document."
        );
      }

      setExistingDocuments((previous) =>
        previous.filter(
          (document) => document._id !== documentId
        )
      );

      setSavedMessage("Document removed successfully.");
    } catch (error) {
      console.error("Delete conference document error:", error);

      setSavedMessage(
        error.message || "Unable to remove document."
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  // =========================
  // DOCUMENT UPLOAD COMPONENT
  // =========================

  const DocumentUpload = ({
    label,
    description,
    documentName,
    required = false,
  }) => {
    const selectedFile = documents[documentName];

    const uploadedDocument = getUploadedDocument(
      DOCUMENT_TYPES[documentName]
    );

    return (
      <div className="conference-document">
        <div className="conference-document-information">
          <div className="conference-document-icon">
            <FileText size={18} />
          </div>

          <div>
            <div className="conference-document-title">
              <strong>{label}</strong>

              {required && (
                <span className="conference-document-required">
                  Required
                </span>
              )}
            </div>

            <p>{description}</p>

            {uploadedDocument && (
              <div className="conference-uploaded-document">
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

        <label className="conference-upload-button">
          <Upload size={15} />

          <span>
            {selectedFile ? "Replace File" : "Choose File"}
          </span>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) =>
              handleFileChange(event, documentName)
            }
          />
        </label>

        {selectedFile && (
          <span className="conference-selected-file">
            {selectedFile.name}
          </span>
        )}

        {errors[documentName] && (
          <p className="conference-error conference-document-error">
            {errors[documentName]}
          </p>
        )}
      </div>
    );
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="conference-page">
      <div className="conference-header">
        <button
          type="button"
          className="conference-back"
          onClick={() => navigate("/claims")}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <div className="conference-heading">
          <span className="conference-eyebrow">
            Research Incentive
          </span>

          <h1>Conference Proceedings</h1>

          <p>
            Submit details of conference papers,
            presentations and published proceedings.
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="conference-success-message">
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
        </div>
      )}

      <form
        className="conference-form"
        onSubmit={handleSubmit}
      >
        {/* CONFERENCE INFORMATION */}

        <section className="conference-card">
          <div className="conference-section-header">
            <div className="conference-section-icon">
              <Presentation size={18} />
            </div>

            <div>
              <h2>Conference Information</h2>
              <p>
                Provide the details of the conference
                and the research paper presented.
              </p>
            </div>
          </div>

          <div className="conference-form-grid">
            <div className="conference-field">
              <label htmlFor="conferenceTitle">
                Conference Title <span>*</span>
              </label>

              <input
                id="conferenceTitle"
                name="conferenceTitle"
                type="text"
                value={formData.conferenceTitle}
                onChange={handleChange}
                placeholder="Enter conference title"
              />

              {errors.conferenceTitle && (
                <p className="conference-error">
                  {errors.conferenceTitle}
                </p>
              )}
            </div>

            <div className="conference-field">
              <label htmlFor="conferenceType">
                Conference Type <span>*</span>
              </label>

              <select
                id="conferenceType"
                name="conferenceType"
                value={formData.conferenceType}
                onChange={handleChange}
              >
                <option value="">Select conference type</option>

                {CONFERENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {errors.conferenceType && (
                <p className="conference-error">
                  {errors.conferenceType}
                </p>
              )}
            </div>

            {formData.conferenceType === "Other" && (
              <div className="conference-field">
                <label htmlFor="otherConferenceType">
                  Specify Conference Type <span>*</span>
                </label>

                <input
                  id="otherConferenceType"
                  name="otherConferenceType"
                  type="text"
                  value={formData.otherConferenceType}
                  onChange={handleChange}
                  placeholder="Enter conference type"
                />

                {errors.otherConferenceType && (
                  <p className="conference-error">
                    {errors.otherConferenceType}
                  </p>
                )}
              </div>
            )}

            <div className="conference-field conference-field-full">
              <label htmlFor="paperTitle">
                Research Paper Title <span>*</span>
              </label>

              <input
                id="paperTitle"
                name="paperTitle"
                type="text"
                value={formData.paperTitle}
                onChange={handleChange}
                placeholder="Enter the title of your research paper"
              />

              {errors.paperTitle && (
                <p className="conference-error">
                  {errors.paperTitle}
                </p>
              )}
            </div>

            <div className="conference-field">
              <label htmlFor="organizer">
                Conference Organizer <span>*</span>
              </label>

              <input
                id="organizer"
                name="organizer"
                type="text"
                value={formData.organizer}
                onChange={handleChange}
                placeholder="University / organization / society"
              />

              {errors.organizer && (
                <p className="conference-error">
                  {errors.organizer}
                </p>
              )}
            </div>

            <div className="conference-field">
              <label htmlFor="conferenceLocation">
                Conference Location <span>*</span>
              </label>

              <div className="conference-input-icon">
                <MapPin size={16} />

                <input
                  id="conferenceLocation"
                  name="conferenceLocation"
                  type="text"
                  value={formData.conferenceLocation}
                  onChange={handleChange}
                  placeholder="City, Country"
                />
              </div>

              {errors.conferenceLocation && (
                <p className="conference-error">
                  {errors.conferenceLocation}
                </p>
              )}
            </div>

            <div className="conference-field">
              <label htmlFor="conferenceStartDate">
                Start Date <span>*</span>
              </label>

              <input
                id="conferenceStartDate"
                name="conferenceStartDate"
                type="date"
                value={formData.conferenceStartDate}
                onChange={handleChange}
              />

              {errors.conferenceStartDate && (
                <p className="conference-error">
                  {errors.conferenceStartDate}
                </p>
              )}
            </div>

            <div className="conference-field">
              <label htmlFor="conferenceEndDate">
                End Date <span>*</span>
              </label>

              <input
                id="conferenceEndDate"
                name="conferenceEndDate"
                type="date"
                value={formData.conferenceEndDate}
                onChange={handleChange}
              />

              {errors.conferenceEndDate && (
                <p className="conference-error">
                  {errors.conferenceEndDate}
                </p>
              )}
            </div>

            <div className="conference-field">
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
            </div>
          </div>
        </section>

        {/* PROCEEDINGS INFORMATION */}

        <section className="conference-card">
          <div className="conference-section-header">
            <div className="conference-section-icon">
              <FileText size={18} />
            </div>

            <div>
              <h2>Proceedings Information</h2>
              <p>
                Add publication and proceedings details
                where applicable.
              </p>
            </div>
          </div>

          <div className="conference-form-grid">
            <div className="conference-field">
              <label htmlFor="proceedingsTitle">
                Proceedings Title
              </label>

              <input
                id="proceedingsTitle"
                name="proceedingsTitle"
                type="text"
                value={formData.proceedingsTitle}
                onChange={handleChange}
                placeholder="Enter proceedings title"
              />
            </div>

            <div className="conference-field">
              <label htmlFor="isbnIssn">ISBN / ISSN</label>

              <input
                id="isbnIssn"
                name="isbnIssn"
                type="text"
                value={formData.isbnIssn}
                onChange={handleChange}
                placeholder="Enter ISBN or ISSN"
              />
            </div>

            <div className="conference-field">
              <label htmlFor="publicationDate">
                Publication Date
              </label>

              <input
                id="publicationDate"
                name="publicationDate"
                type="date"
                value={formData.publicationDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* PRESENTATION AND AUTHOR INFORMATION */}

        <section className="conference-card">
          <div className="conference-section-header">
            <div className="conference-section-icon">
              <Users size={18} />
            </div>

            <div>
              <h2>Presentation & Author Information</h2>
              <p>
                Provide your presentation role and
                details of other contributors.
              </p>
            </div>
          </div>

          <div className="conference-form-grid">
            <div className="conference-field">
              <label htmlFor="presentationType">
                Presentation Type <span>*</span>
              </label>

              <select
                id="presentationType"
                name="presentationType"
                value={formData.presentationType}
                onChange={handleChange}
              >
                <option value="">Select presentation type</option>

                {PRESENTATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {errors.presentationType && (
                <p className="conference-error">
                  {errors.presentationType}
                </p>
              )}
            </div>

            {formData.presentationType === "Other" && (
              <div className="conference-field">
                <label htmlFor="otherPresentationType">
                  Specify Presentation Type <span>*</span>
                </label>

                <input
                  id="otherPresentationType"
                  name="otherPresentationType"
                  type="text"
                  value={formData.otherPresentationType}
                  onChange={handleChange}
                  placeholder="Enter presentation type"
                />

                {errors.otherPresentationType && (
                  <p className="conference-error">
                    {errors.otherPresentationType}
                  </p>
                )}
              </div>
            )}

            <div className="conference-field">
              <label htmlFor="facultyName">
                Faculty / Author Name <span>*</span>
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
                <p className="conference-error">
                  {errors.facultyName}
                </p>
              )}
            </div>

            <div className="conference-field">
              <label htmlFor="authorRole">
                Author Role <span>*</span>
              </label>

              <select
                id="authorRole"
                name="authorRole"
                value={formData.authorRole}
                onChange={handleChange}
              >
                {AUTHOR_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="conference-field conference-field-full">
              <label htmlFor="paperAbstract">
                Paper Abstract / Summary <span>*</span>
              </label>

              <textarea
                id="paperAbstract"
                name="paperAbstract"
                rows="5"
                value={formData.paperAbstract}
                onChange={handleChange}
                placeholder="Provide a brief summary of the research paper"
              />

              {errors.paperAbstract && (
                <p className="conference-error">
                  {errors.paperAbstract}
                </p>
              )}
            </div>

            <div className="conference-field conference-field-full">
              <label htmlFor="contribution">
                Faculty Contribution <span>*</span>
              </label>

              <textarea
                id="contribution"
                name="contribution"
                rows="4"
                value={formData.contribution}
                onChange={handleChange}
                placeholder="Describe your contribution to the paper, presentation or conference"
              />

              {errors.contribution && (
                <p className="conference-error">
                  {errors.contribution}
                </p>
              )}
            </div>
          </div>

          {/* CO-AUTHORS */}

          <div className="conference-subsection">
            <div className="conference-subsection-header">
              <div>
                <h3>Co-Authors / Contributors</h3>
                <p>
                  Add other authors or contributors
                  involved in the research paper.
                </p>
              </div>

              <button
                type="button"
                className="conference-secondary-button"
                onClick={addCoAuthor}
              >
                <Plus size={15} />
                Add Author
              </button>
            </div>

            {coAuthors.length > 0 && (
              <div className="conference-author-list">
                {coAuthors.map((author, index) => (
                  <div
                    className="conference-author-row"
                    key={author.id}
                  >
                    <div className="conference-author-number">
                      {index + 1}
                    </div>

                    <div className="conference-author-fields">
                      <div className="conference-field">
                        <label>
                          Author Name <span>*</span>
                        </label>

                        <input
                          type="text"
                          value={author.name}
                          onChange={(event) =>
                            updateCoAuthor(
                              author.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Author name"
                        />
                      </div>

                      <div className="conference-field">
                        <label>Author Role</label>

                        <select
                          value={author.role}
                          onChange={(event) =>
                            updateCoAuthor(
                              author.id,
                              "role",
                              event.target.value
                            )
                          }
                        >
                          {AUTHOR_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="conference-field">
                        <label>Affiliation</label>

                        <input
                          type="text"
                          value={author.affiliation}
                          onChange={(event) =>
                            updateCoAuthor(
                              author.id,
                              "affiliation",
                              event.target.value
                            )
                          }
                          placeholder="Institution / department"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="conference-delete-button"
                      onClick={() => removeCoAuthor(author.id)}
                      aria-label="Remove author"
                    >
                      <Trash2 size={16} />
                    </button>

                    {errors[`coAuthor-${author.id}`] && (
                      <p className="conference-error conference-author-error">
                        {errors[`coAuthor-${author.id}`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* INCENTIVE INFORMATION */}

        <section className="conference-card">
          <div className="conference-section-header">
            <div className="conference-section-icon">
              <IndianRupee size={18} />
            </div>

            <div>
              <h2>Incentive Information</h2>
              <p>
                Enter the incentive amount associated
                with this conference claim.
              </p>
            </div>
          </div>

          <div className="conference-form-grid">
            <div className="conference-field">
              <label htmlFor="incentiveAmount">
                Claimed Incentive Amount <span>*</span>
              </label>

              <div className="conference-currency-input">
                <span>₹</span>

                <input
                  id="incentiveAmount"
                  name="incentiveAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.incentiveAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              {errors.incentiveAmount && (
                <p className="conference-error">
                  {errors.incentiveAmount}
                </p>
              )}

              <small>
                The final eligible amount will be
                verified during claim review.
              </small>
            </div>
          </div>
        </section>

        {/* SUPPORTING DOCUMENTS */}

        <section className="conference-card">
          <div className="conference-section-header">
            <div className="conference-section-icon">
              <Upload size={18} />
            </div>

            <div>
              <h2>Supporting Documents</h2>
              <p>
                Upload documents supporting the
                conference claim.
              </p>
            </div>
          </div>

          <div className="conference-document-list">
            <DocumentUpload
              label="Acceptance Letter"
              description="Official communication confirming acceptance of the research paper."
              documentName="acceptanceLetter"
              required
            />

            <DocumentUpload
              label="Presentation Certificate"
              description="Certificate confirming presentation of the research paper."
              documentName="presentationCertificate"
              required
            />

            <DocumentUpload
              label="Proceedings Paper"
              description="Published or accepted paper included in the proceedings."
              documentName="proceedingsPaper"
              required
            />

            <DocumentUpload
              label="Conference Certificate"
              description="Conference participation or attendance certificate."
              documentName="conferenceCertificate"
            />

            <DocumentUpload
              label="ISBN / ISSN Proof"
              description="Evidence showing the ISBN or ISSN of the proceedings."
              documentName="isbnIssnProof"
            />

            <DocumentUpload
              label="Supporting Evidence"
              description="Any additional evidence supporting the claim."
              documentName="supportingEvidence"
            />
          </div>

          {loadingDocuments && (
            <div className="conference-document-note">
              <FileText size={17} />
              <p>Loading previously uploaded documents...</p>
            </div>
          )}

          <div className="conference-document-note">
            <FileText size={17} />

            <p>
              Accepted formats: PDF, JPG, JPEG, and PNG.
              Maximum file size 10 MB per document.
            </p>
          </div>
        </section>

        {/* DECLARATION */}

        <section className="conference-card conference-declaration-card">
          <div className="conference-checkbox-wrapper">
            <input
              id="declarationAccepted"
              type="checkbox"
              checked={declarationAccepted}
              onChange={(event) => {
                setDeclarationAccepted(event.target.checked);

                setErrors((previous) => ({
                  ...previous,
                  declaration: "",
                }));
              }}
            />

            <label htmlFor="declarationAccepted">
              I declare that the information provided
              in this claim is true and accurate to the
              best of my knowledge. I understand that
              the submitted documents may be verified
              during the review process.
            </label>
          </div>

          {errors.declaration && (
            <p className="conference-error">
              {errors.declaration}
            </p>
          )}
        </section>

        {/* ACTIONS */}

        <div className="conference-actions">
          <button
            type="button"
            className="conference-draft-button"
            onClick={handleSaveDraft}
            disabled={saving || submitting}
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="submit"
            className="conference-submit-button"
            disabled={saving || submitting}
          >
            <CheckCircle2 size={16} />

            {submitting ? "Submitting..." : "Submit Claim"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ConferenceProceedings;