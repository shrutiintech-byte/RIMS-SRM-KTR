
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  FileText,
  IndianRupee,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "./JournalPublication.css";

const API_BASE_URL = "http://localhost:5000";
const CURRENT_FINANCIAL_YEAR = "2026-27";
const FINANCIAL_YEARS = ["2026-27", "2025-26", "2024-25"];
const PUBLICATION_TYPES = ["International Journal", "National Journal"];
const INDEXING_OPTIONS = ["Scopus", "Web of Science", "UGC CARE", "Other"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPES = {
  acceptanceLetter: "acceptanceLetter",
  publishedArticle: "publishedArticle",
  indexingProof: "indexingProof",
};

const DOCUMENT_LABELS = {
  acceptanceLetter: "Acceptance Letter",
  publishedArticle: "Published Article",
  indexingProof: "Indexing Proof",
};

const initialFormData = {
  articleTitle: "",
  journalName: "",
  publicationType: "",
  indexing: "",
  otherIndexing: "",
  issn: "",
  volume: "",
  issue: "",
  pageNumbers: "",
  publicationDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  authorName: "",
  authorRole: "",
  correspondingAuthor: "",
  incentiveAmount: "",
};

const initialDocuments = {
  acceptanceLetter: null,
  publishedArticle: null,
  indexingProof: null,
};

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

  return date.toISOString().split("T")[0];
};

const getClaimFormData = (claim) => claim?.formData || {};

function JournalPublication() {
  const navigate = useNavigate();
  const location = useLocation();

  const draftClaim = location.state?.draftClaim || null;

  const isEditingDraft = Boolean(
    location.state?.isEditingDraft && draftClaim?._id
  );

  const [claimId, setClaimId] = useState(draftClaim?._id || null);

  const [formData, setFormData] = useState(() => {
    const draftFormData = getClaimFormData(draftClaim);

    return {
      ...initialFormData,
      ...draftFormData,
      financialYear:
        draftClaim?.financialYear ||
        draftFormData.financialYear ||
        CURRENT_FINANCIAL_YEAR,
      incentiveAmount:
        draftClaim?.incentiveAmount ??
        draftFormData.incentiveAmount ??
        "",
      publicationDate: normalizeDateForInput(
        draftFormData.publicationDate
      ),
    };
  });

  const [coAuthors, setCoAuthors] = useState(() => {
    const existingCoAuthors =
      getClaimFormData(draftClaim).coAuthors;

    return Array.isArray(existingCoAuthors)
      ? existingCoAuthors
      : [];
  });

  const [documents, setDocuments] = useState(initialDocuments);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [declarationAccepted, setDeclarationAccepted] = useState(
    Boolean(draftClaim?.declarationAccepted)
  );
  const [errors, setErrors] = useState({});
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  // LOAD DRAFT
  useEffect(() => {
    if (!draftClaim) return;

    const draftFormData = getClaimFormData(draftClaim);

    setClaimId(draftClaim._id || null);

    setFormData({
      ...initialFormData,
      ...draftFormData,
      financialYear:
        draftClaim.financialYear ||
        draftFormData.financialYear ||
        CURRENT_FINANCIAL_YEAR,
      incentiveAmount:
        draftClaim.incentiveAmount ??
        draftFormData.incentiveAmount ??
        "",
      publicationDate: normalizeDateForInput(
        draftFormData.publicationDate
      ),
    });

    setCoAuthors(
      Array.isArray(draftFormData.coAuthors)
        ? draftFormData.coAuthors
        : []
    );

    setDeclarationAccepted(
      Boolean(draftClaim.declarationAccepted)
    );
  }, [draftClaim]);

  // LOAD EXISTING DOCUMENTS
  useEffect(() => {
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
          `${API_BASE_URL}/api/documents?claimId=${claimId}`,
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

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "Unable to load publication documents."
          );
        }

        setUploadedDocuments(
          Array.isArray(result?.data?.documents)
            ? result.data.documents
            : []
        );
      } catch (error) {
        console.error(
          "Load journal publication documents error:",
          error
        );
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [claimId, navigate]);

  // HANDLE FORM CHANGE
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

  // CO-AUTHORS
  const handleAddCoAuthor = () => {
    setCoAuthors((previous) => [
      ...previous,
      {
        name: "",
        affiliation: "",
        role: "Co-Author",
      },
    ]);

    setSavedMessage("");
  };

  const handleCoAuthorChange = (index, field, value) => {
    setCoAuthors((previous) =>
      previous.map((author, authorIndex) =>
        authorIndex === index
          ? { ...author, [field]: value }
          : author
      )
    );

    setSavedMessage("");
  };

  const handleRemoveCoAuthor = (index) => {
    setCoAuthors((previous) =>
      previous.filter((_, authorIndex) => authorIndex !== index)
    );

    setSavedMessage("");
  };

  // FILE VALIDATION
  const validateFile = (file) => {
    if (!file) return "Please select a file";

    if (file.size > MAX_FILE_SIZE) {
      return "File size must not exceed 10 MB";
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Only PDF, JPG and PNG files are allowed";
    }

    return "";
  };

  const handleDocumentChange = (documentName, file) => {
    if (!file) return;

    const fileError = validateFile(file);

    if (fileError) {
      setErrors((previous) => ({
        ...previous,
        [documentName]: fileError,
      }));
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

  // EXISTING DOCUMENT HELPERS
  const getUploadedDocument = (documentType) =>
    uploadedDocuments.find(
      (document) => document.documentType === documentType
    );

  const hasDocument = (documentType) =>
    Boolean(
      documents[documentType] ||
      getUploadedDocument(documentType)
    );

  // FORM VALIDATION
  const validateForm = () => {
    const newErrors = {};

    if (!formData.articleTitle.trim()) {
      newErrors.articleTitle = "Article title is required";
    }

    if (!formData.journalName.trim()) {
      newErrors.journalName = "Journal name is required";
    }

    if (!formData.publicationType) {
      newErrors.publicationType =
        "Please select publication type";
    }

    if (!formData.indexing) {
      newErrors.indexing = "Please select indexing";
    }

    if (
      formData.indexing === "Other" &&
      !formData.otherIndexing.trim()
    ) {
      newErrors.otherIndexing =
        "Please specify the indexing database";
    }

    if (!formData.issn.trim()) {
      newErrors.issn = "ISSN is required";
    }

    if (!formData.publicationDate) {
      newErrors.publicationDate =
        "Publication date is required";
    }

    if (!formData.authorName.trim()) {
      newErrors.authorName =
        "Primary author name is required";
    }

    if (!formData.authorRole) {
      newErrors.authorRole =
        "Please select your author role";
    }

    if (!formData.incentiveAmount) {
      newErrors.incentiveAmount =
        "Please enter the claimed incentive amount";
    } else if (Number(formData.incentiveAmount) <= 0) {
      newErrors.incentiveAmount =
        "Incentive amount must be greater than zero";
    }

    if (coAuthors.some((author) => !author.name?.trim())) {
      newErrors.coAuthors =
        "Please complete the name of every co-author";
    }

    const documentRequirements = [
      {
        type: DOCUMENT_TYPES.acceptanceLetter,
        label: DOCUMENT_LABELS.acceptanceLetter,
      },
      {
        type: DOCUMENT_TYPES.publishedArticle,
        label: DOCUMENT_LABELS.publishedArticle,
      },
      {
        type: DOCUMENT_TYPES.indexingProof,
        label: DOCUMENT_LABELS.indexingProof,
      },
    ];

    documentRequirements.forEach(({ type, label }) => {
      if (!hasDocument(type)) {
        newErrors[type] = `${label} is required`;
      }
    });

    Object.entries(documents).forEach(([documentName, file]) => {
      if (!file) return;

      const fileError = validateFile(file);

      if (fileError) {
        newErrors[documentName] = fileError;
      }
    });

    if (!declarationAccepted) {
      newErrors.declaration =
        "You must accept the declaration";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // BUILD CLAIM PAYLOAD
  const buildClaimPayload = () => ({
    claimType: "JOURNAL_PUBLICATION",
    financialYear: formData.financialYear,
    incentiveAmount: Number(formData.incentiveAmount || 0),
    declarationAccepted,
    formData: {
      ...formData,
      coAuthors,
    },
  });

  // SAVE CLAIM
  const saveClaim = async () => {
    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
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
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired.");
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to save the journal publication claim."
      );
    }

    const savedClaim = result?.data?.claim;

    const savedClaimId =
      savedClaim?._id ||
      result?.data?._id ||
      claimId;

    if (!savedClaimId) {
      throw new Error(
        "The claim was saved but no claim ID was returned."
      );
    }

    setClaimId(savedClaimId);

    return savedClaim;
  };

  // UPLOAD DOCUMENT
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
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired.");
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message ||
          `Unable to upload ${DOCUMENT_LABELS[documentType]}.`
      );
    }

    return result?.data?.document;
  };

  // UPLOAD SELECTED DOCUMENTS
  const uploadSelectedDocuments = async (currentClaimId) => {
    const selectedDocuments = [
      {
        type: DOCUMENT_TYPES.acceptanceLetter,
        file: documents.acceptanceLetter,
      },
      {
        type: DOCUMENT_TYPES.publishedArticle,
        file: documents.publishedArticle,
      },
      {
        type: DOCUMENT_TYPES.indexingProof,
        file: documents.indexingProof,
      },
    ];

    const newlyUploaded = [];

    for (const item of selectedDocuments) {
      if (!item.file) continue;

      const document = await uploadDocument(
        currentClaimId,
        item.type,
        item.file
      );

      if (document) newlyUploaded.push(document);
    }

    if (newlyUploaded.length > 0) {
      setUploadedDocuments((previous) => [
        ...previous,
        ...newlyUploaded,
      ]);

      setDocuments({ ...initialDocuments });
    }

    return newlyUploaded;
  };

  // SAVE DRAFT
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setErrors({});
      setSavedMessage("");

      const savedClaim = await saveClaim();
      const savedClaimId = savedClaim?._id || claimId;

      if (!savedClaimId) {
        throw new Error(
          "Unable to determine the saved claim ID."
        );
      }

      await uploadSelectedDocuments(savedClaimId);

      setSavedMessage("Draft saved successfully.");
    } catch (error) {
      console.error(
        "Save journal publication draft error:",
        error
      );

      setErrors({
        submit: error.message || "Unable to save the draft.",
      });
    } finally {
      setSaving(false);
    }
  };

  // SUBMIT CLAIM
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavedMessage("");

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const savedClaim = await saveClaim();
      const savedClaimId = savedClaim?._id || claimId;

      if (!savedClaimId) {
        throw new Error("Unable to determine the claim ID.");
      }

      await uploadSelectedDocuments(savedClaimId);

      const token = getToken();

      if (!token) {
        clearSessionAndRedirect(navigate);
        return;
      }

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
        clearSessionAndRedirect(navigate);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to submit the journal publication claim."
        );
      }

      setSavedMessage(
        "Journal publication claim submitted successfully."
      );

      setTimeout(() => navigate("/claims"), 900);
    } catch (error) {
      console.error(
        "Submit journal publication claim error:",
        error
      );

      setErrors({
        submit: error.message || "Unable to submit the claim.",
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE DOCUMENT
  const handleDeleteDocument = async (documentId) => {
    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      return;
    }

    try {
      setDeletingDocumentId(documentId);

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
        clearSessionAndRedirect(navigate);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Unable to delete the document."
        );
      }

      setUploadedDocuments((previous) =>
        previous.filter((document) => document._id !== documentId)
      );

      setSavedMessage("Document removed successfully.");
    } catch (error) {
      console.error(
        "Delete journal publication document error:",
        error
      );

      setErrors({
        submit: error.message || "Unable to remove the document.",
      });
    } finally {
      setDeletingDocumentId(null);
    }
  };

  // DOCUMENT UPLOAD COMPONENT
  function DocumentUpload({
    label,
    name,
    description,
    required = true,
  }) {
    const selectedFile = documents[name];
    const existingDocument = getUploadedDocument(name);

    return (
      <div className="journal-document-item">
        <div className="journal-document-information">
          <div className="journal-document-icon">
            <FileText size={18} />
          </div>

          <div>
            <div className="journal-document-title">
              <strong>{label}</strong>

              {required && (
                <span className="journal-document-required">
                  Required
                </span>
              )}
            </div>

            <p>{description}</p>

            {existingDocument && (
              <div className="journal-uploaded-document">
                <span>
                  Uploaded:{" "}
                  {existingDocument.originalName || "Document"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteDocument(existingDocument._id)
                  }
                  disabled={
                    deletingDocumentId === existingDocument._id
                  }
                >
                  <Trash2 size={14} />
                  {deletingDocumentId === existingDocument._id
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            )}
          </div>
        </div>

        <label className="journal-upload-button">
          <Upload size={15} />
          <span>{selectedFile ? "Replace File" : "Choose File"}</span>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) =>
              handleDocumentChange(
                name,
                event.target.files?.[0] || null
              )
            }
          />
        </label>

        {selectedFile && (
          <span className="journal-selected-file">
            {selectedFile.name}
          </span>
        )}

        {errors[name] && (
          <span className="journal-field-error">
            {errors[name]}
          </span>
        )}
      </div>
    );
  }

  // SECTION HEADER
  const SectionHeader = ({ icon, title, description }) => (
    <div className="journal-form-section-header">
      <div className="journal-section-icon">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );

  return (
    <div className="journal-publication-page">

      {/* PAGE HEADER — corrected vertical alignment */}
      <div className="journal-project-header">
        <div className="journal-page-heading">

          <div className="journal-back-row">
            <button
              type="button"
              className="journal-publication-back"
              onClick={() => navigate("/claims")}
            >
              <ArrowLeft size={16} />
              <span>Back to Claims</span>
            </button>
          </div>

          <div className="journal-category-label">
            INCENTIVE CATEGORY
          </div>

          <h1>
            {isEditingDraft
              ? "Continue Journal Publication Claim"
              : "New Journal Publication Claim"}
          </h1>

          <p>
            Submit an incentive claim for a journal publication based on
            the applicable institutional incentive policy.
          </p>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {savedMessage && (
        <div className="journal-success-message">
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {errors.submit && (
        <div className="journal-success-message">
          <FileText size={18} />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* PUBLICATION INFORMATION */}
        <section className="journal-form-card">
          <SectionHeader
            icon={<BookOpen size={18} />}
            title="Publication Information"
            description="Enter the details of the published research article."
          />

          <div className="journal-form-body">
            <div className="journal-form-grid">

              <div className="journal-form-group journal-full-width">
                <label>
                  Article Title
                  <span className="journal-required">*</span>
                </label>
                <input
                  type="text"
                  name="articleTitle"
                  value={formData.articleTitle}
                  onChange={handleChange}
                  placeholder="Enter the complete article title"
                />
                {errors.articleTitle && (
                  <span className="journal-field-error">
                    {errors.articleTitle}
                  </span>
                )}
              </div>

              <div className="journal-form-group">
                <label>
                  Journal Name
                  <span className="journal-required">*</span>
                </label>
                <input
                  type="text"
                  name="journalName"
                  value={formData.journalName}
                  onChange={handleChange}
                  placeholder="Enter journal name"
                />
                {errors.journalName && (
                  <span className="journal-field-error">
                    {errors.journalName}
                  </span>
                )}
              </div>

              <div className="journal-form-group">
                <label>
                  Publication Type
                  <span className="journal-required">*</span>
                </label>
                <select
                  name="publicationType"
                  value={formData.publicationType}
                  onChange={handleChange}
                >
                  <option value="">Select publication type</option>
                  {PUBLICATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.publicationType && (
                  <span className="journal-field-error">
                    {errors.publicationType}
                  </span>
                )}
              </div>

              <div className="journal-form-group">
                <label>
                  Indexing
                  <span className="journal-required">*</span>
                </label>
                <select
                  name="indexing"
                  value={formData.indexing}
                  onChange={handleChange}
                >
                  <option value="">Select indexing</option>
                  {INDEXING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.indexing && (
                  <span className="journal-field-error">
                    {errors.indexing}
                  </span>
                )}
              </div>

              {formData.indexing === "Other" && (
                <div className="journal-form-group">
                  <label>
                    Specify Indexing
                    <span className="journal-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="otherIndexing"
                    value={formData.otherIndexing}
                    onChange={handleChange}
                    placeholder="Enter indexing database"
                  />
                  {errors.otherIndexing && (
                    <span className="journal-field-error">
                      {errors.otherIndexing}
                    </span>
                  )}
                </div>
              )}

              <div className="journal-form-group">
                <label>
                  ISSN
                  <span className="journal-required">*</span>
                </label>
                <input
                  type="text"
                  name="issn"
                  value={formData.issn}
                  onChange={handleChange}
                  placeholder="e.g. 1234-5678"
                />
                {errors.issn && (
                  <span className="journal-field-error">
                    {errors.issn}
                  </span>
                )}
              </div>

              <div className="journal-form-group">
                <label>Volume</label>
                <input
                  type="text"
                  name="volume"
                  value={formData.volume}
                  onChange={handleChange}
                  placeholder="Enter volume"
                />
              </div>

              <div className="journal-form-group">
                <label>Issue</label>
                <input
                  type="text"
                  name="issue"
                  value={formData.issue}
                  onChange={handleChange}
                  placeholder="Enter issue"
                />
              </div>

              <div className="journal-form-group">
                <label>Page Numbers</label>
                <input
                  type="text"
                  name="pageNumbers"
                  value={formData.pageNumbers}
                  onChange={handleChange}
                  placeholder="e.g. 120-135"
                />
              </div>

              <div className="journal-form-group">
                <label>
                  Publication Date
                  <span className="journal-required">*</span>
                </label>
                <input
                  type="date"
                  name="publicationDate"
                  value={formData.publicationDate}
                  onChange={handleChange}
                />
                {errors.publicationDate && (
                  <span className="journal-field-error">
                    {errors.publicationDate}
                  </span>
                )}
              </div>

              <div className="journal-form-group">
                <label>
                  Financial Year
                  <span className="journal-required">*</span>
                </label>
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
              </div>
            </div>
          </div>
        </section>

        {/* AUTHOR INFORMATION */}
        <section className="journal-form-card">
          <SectionHeader
            icon={<BookOpen size={18} />}
            title="Author Information"
            description="Identify the primary author and other authors associated with the publication."
          />

          <div className="journal-form-body">
            <div className="journal-form-grid">

              <div className="journal-form-group">
                <label>
                  Primary Author Name
                  <span className="journal-required">*</span>
                </label>
                <input
                  type="text"
                  name="authorName"
                  value={formData.authorName}
                  onChange={handleChange}
                  placeholder="Enter your name"
                />
                {errors.authorName && (
                  <span className="journal-field-error">
                    {errors.authorName}
                  </span>
                )}
              </div>

              <div className="journal-form-group">
                <label>
                  Your Author Role
                  <span className="journal-required">*</span>
                </label>
                <select
                  name="authorRole"
                  value={formData.authorRole}
                  onChange={handleChange}
                >
                  <option value="">Select your role</option>
                  <option value="First Author">First Author</option>
                  <option value="Co-Author">Co-Author</option>
                  <option value="Corresponding Author">
                    Corresponding Author
                  </option>
                </select>
                {errors.authorRole && (
                  <span className="journal-field-error">
                    {errors.authorRole}
                  </span>
                )}
              </div>

              <div className="journal-form-group journal-full-width">
                <label>Corresponding Author</label>
                <input
                  type="text"
                  name="correspondingAuthor"
                  value={formData.correspondingAuthor}
                  onChange={handleChange}
                  placeholder="Enter corresponding author name"
                />
              </div>
            </div>

            <div className="journal-coauthor-section">
              <div className="journal-coauthor-header">
                <div>
                  <h3>Co-Authors</h3>
                  <p>
                    Add other authors associated with this publication.
                  </p>
                </div>

                <button
                  type="button"
                  className="journal-secondary-button"
                  onClick={handleAddCoAuthor}
                >
                  <Plus size={15} />
                  <span>Add Co-Author</span>
                </button>
              </div>

              {coAuthors.length > 0 ? (
                <div className="journal-coauthor-list">
                  {coAuthors.map((author, index) => (
                    <div
                      className="journal-coauthor-item"
                      key={author.id || `${index}-${author.name}`}
                    >
                      <div className="journal-coauthor-number">
                        {index + 1}
                      </div>

                      <div className="journal-coauthor-fields">
                        <div className="journal-form-group">
                          <label>Name</label>
                          <input
                            type="text"
                            value={author.name || ""}
                            onChange={(event) =>
                              handleCoAuthorChange(
                                index,
                                "name",
                                event.target.value
                              )
                            }
                            placeholder="Enter co-author name"
                          />
                        </div>

                        <div className="journal-form-group">
                          <label>Affiliation</label>
                          <input
                            type="text"
                            value={author.affiliation || ""}
                            onChange={(event) =>
                              handleCoAuthorChange(
                                index,
                                "affiliation",
                                event.target.value
                              )
                            }
                            placeholder="Enter affiliation"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="journal-delete-button"
                        onClick={() => handleRemoveCoAuthor(index)}
                        aria-label="Remove co-author"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="journal-empty-coauthors">
                  <BookOpen size={17} />
                  <span>No co-authors added.</span>
                </div>
              )}

              {errors.coAuthors && (
                <span className="journal-field-error">
                  {errors.coAuthors}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* INCENTIVE INFORMATION */}
        <section className="journal-form-card">
          <SectionHeader
            icon={<IndianRupee size={18} />}
            title="Incentive Information"
            description="Enter the incentive amount being claimed for this publication."
          />

          <div className="journal-form-body">
            <div className="journal-form-grid">
              <div className="journal-form-group">
                <label>
                  Claimed Incentive Amount
                  <span className="journal-required">*</span>
                </label>

                <div className="journal-currency-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    name="incentiveAmount"
                    value={formData.incentiveAmount}
                    onChange={handleChange}
                    placeholder="Enter amount"
                  />
                </div>

                <p className="journal-field-hint">
                  Enter the incentive amount applicable to your claim,
                  if known.
                </p>

                {errors.incentiveAmount && (
                  <span className="journal-field-error">
                    {errors.incentiveAmount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SUPPORTING DOCUMENTS */}
        <section className="journal-form-card">
          <SectionHeader
            icon={<FileCheck2 size={18} />}
            title="Supporting Documents"
            description="Attach the documents required to support the Journal Publication incentive claim."
          />

          <div className="journal-form-body">
            <div className="journal-document-list">
              <DocumentUpload
                label="Acceptance Letter"
                name={DOCUMENT_TYPES.acceptanceLetter}
                description="Official journal acceptance letter confirming acceptance of the research article."
              />

              <DocumentUpload
                label="Published Article"
                name={DOCUMENT_TYPES.publishedArticle}
                description="Final published version of the research article."
              />

              <DocumentUpload
                label="Indexing Proof"
                name={DOCUMENT_TYPES.indexingProof}
                description="Evidence confirming the journal indexing selected for this publication."
              />
            </div>

            {loadingDocuments && (
              <div className="journal-document-note">
                <FileText size={17} />
                <p>Loading previously uploaded documents...</p>
              </div>
            )}

            <div className="journal-document-note">
              <FileText size={17} />
              <p>
                Accepted formats: PDF, JPG, JPEG, and PNG. Maximum
                file size 10 MB per document.
              </p>
            </div>
          </div>
        </section>

        {/* DECLARATION */}
        <section className="journal-form-card">
          <SectionHeader
            icon={<FileCheck2 size={18} />}
            title="Declaration"
            description="I certify that the information and documents submitted with this claim are true and complete to the best of my knowledge."
          />

          <div className="journal-form-body">
            <label className="journal-declaration-row">
              <input
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

              <span>
                I accept the declaration and confirm the authenticity
                of the information provided.
              </span>
            </label>

            {errors.declaration && (
              <span className="journal-field-error">
                {errors.declaration}
              </span>
            )}
          </div>
        </section>

        {/* SUBMISSION */}
        <section className="journal-submission-card">
          <div>
            <div className="journal-submission-label">
              CLAIM SUBMISSION
            </div>

            <h2>Ready to submit?</h2>

            <p>
              Save your work as a draft or submit the completed claim
              for institutional verification.
            </p>
          </div>

          <div className="journal-submission-category">
            <span>CATEGORY</span>
            <strong>Journal Publication</strong>
          </div>

          <div className="journal-form-actions">
            <button
              type="button"
              className="journal-save-button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
            >
              <FileText size={15} />
              <span>
                {saving ? "Saving..." : "Save as Draft"}
              </span>
            </button>

            <button
              type="submit"
              className="journal-submit-button"
              disabled={saving || submitting}
            >
              <CheckCircle2 size={15} />
              <span>
                {submitting ? "Submitting..." : "Submit Claim"}
              </span>
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

export default JournalPublication;
