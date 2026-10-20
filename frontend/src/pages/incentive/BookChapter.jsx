import {
  useEffect,
  useState,
} from "react";

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

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./BookChapter.css";

const API_BASE_URL = "http://localhost:5000";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

const PUBLICATION_TYPES = [
  "Book",
  "Book Chapter",
  "Edited Book",
];

const AUTHOR_ROLES = [
  "Author",
  "Co-Author",
  "Editor",
  "Book Chapter Author",
  "Book Chapter Co-Author",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const DOCUMENT_TYPES = {
  bookCopy: "Book / Chapter Copy",
  publicationProof: "Publication Proof",
  isbnProof: "ISBN Proof",
  publisherLetter: "Publisher Letter",
  supportingEvidence: "Supporting Evidence",
};

const initialFormData = {
  publicationType: "",
  title: "",
  chapterTitle: "",
  isbn: "",
  publisher: "",
  publicationDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  authorName: "",
  authorRole: "Author",
  publisherLocation: "",
  edition: "",
  pageNumbers: "",
  description: "",
  contribution: "",
  incentiveAmount: "",
};

const initialDocuments = {
  bookCopy: null,
  publicationProof: null,
  isbnProof: null,
  publisherLetter: null,
  supportingEvidence: null,
};

const normalizeCoAuthors = (authors = []) => {
  return authors.map((author, index) => ({
    id:
      author.id ||
      `book-author-${Date.now()}-${index}`,
    name: author.name || "",
    role: author.role || "Co-Author",
    affiliation: author.affiliation || "",
  }));
};

function BookChapter() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] =
    useState(initialFormData);

  const [coAuthors, setCoAuthors] =
    useState([]);

  const [documents, setDocuments] =
    useState(initialDocuments);

  const [existingDocuments, setExistingDocuments] =
    useState([]);

  const [declarationAccepted, setDeclarationAccepted] =
    useState(false);

  const [errors, setErrors] =
    useState({});

  const [savedMessage, setSavedMessage] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isSavingDraft, setIsSavingDraft] =
    useState(false);

  const [loadingDocuments, setLoadingDocuments] =
    useState(false);

  const [deletingDocumentId, setDeletingDocumentId] =
    useState("");

  const [currentClaimId, setCurrentClaimId] =
    useState("");

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
        authorName:
          previous.authorName ||
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
    const draftClaim =
      location.state?.draftClaim;

    if (!draftClaim) {
      return;
    }

    if (
      draftClaim.claimType &&
      draftClaim.claimType !==
        "BOOK_CHAPTER"
    ) {
      return;
    }

    const draftFormData =
      draftClaim.formData || {};

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

    setDeclarationAccepted(
      Boolean(
        draftClaim.declarationAccepted
      )
    );

    const savedCoAuthors =
      Array.isArray(
        draftFormData.coAuthors
      )
        ? draftFormData.coAuthors
        : Array.isArray(
            draftClaim.coAuthors
          )
        ? draftClaim.coAuthors
        : [];

    setCoAuthors(
      normalizeCoAuthors(
        savedCoAuthors
      )
    );

    window.history.replaceState(
      {},
      document.title
    );
  }, [location.state]);

  /* =====================================================
     LOAD EXISTING DOCUMENTS
     ===================================================== */

  const loadExistingDocuments = async (
    claimId
  ) => {
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
      const response =
        await fetch(
          `${API_BASE_URL}/api/documents?claimId=${claimId}`,
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

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to load documents."
        );
      }

      setExistingDocuments(
        result.data?.documents || []
      );
    } catch (error) {
      console.error(
        "Unable to load Book Chapter documents:",
        error
      );

      setSavedMessage(
        "Unable to load previously uploaded documents."
      );
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    if (currentClaimId) {
      loadExistingDocuments(
        currentClaimId
      );
    }
  }, [currentClaimId]);

  /* =====================================================
     FORM CHANGE
     ===================================================== */

  const handleChange = (event) => {
    const { name, value } =
      event.target;

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

  /* =====================================================
     CO AUTHORS
     ===================================================== */

  const addCoAuthor = () => {
    setCoAuthors((previous) => [
      ...previous,
      {
        id: `book-author-${Date.now()}-${previous.length}`,
        name: "",
        role: "Co-Author",
        affiliation: "",
      },
    ]);

    setSavedMessage("");
  };

  const updateCoAuthor = (
    id,
    field,
    value
  ) => {
    setCoAuthors((previous) =>
      previous.map((author) =>
        author.id === id
          ? {
              ...author,
              [field]: value,
            }
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
      previous.filter(
        (author) =>
          author.id !== id
      )
    );

    setErrors((previous) => {
      const updatedErrors = {
        ...previous,
      };

      delete updatedErrors[
        `coAuthor-${id}`
      ];

      return updatedErrors;
    });

    setSavedMessage("");
  };

  /* =====================================================
     DOCUMENT UPLOAD
     ===================================================== */

  const handleFileChange = (
    event,
    documentName
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((previous) => ({
        ...previous,
        [documentName]:
          "File size must not exceed 10 MB.",
      }));

      event.target.value = "";
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        file.type
      )
    ) {
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

  const removeDocument = (
    documentName
  ) => {
    setDocuments((previous) => ({
      ...previous,
      [documentName]: null,
    }));

    const input =
      document.getElementById(
        `book-chapter-${documentName}`
      );

    if (input) {
      input.value = "";
    }

    setErrors((previous) => ({
      ...previous,
      [documentName]: "",
    }));

    setSavedMessage("");
  };

  /* =====================================================
     EXISTING DOCUMENT HELPERS
     ===================================================== */

  const getUploadedDocument = (
    documentType
  ) => {
    return existingDocuments.find(
      (document) =>
        document.documentType ===
          documentType &&
        document.status !== "REJECTED"
    );
  };

  const hasDocument = (
    documentName
  ) => {
    return Boolean(
      documents[documentName] ||
        getUploadedDocument(
          DOCUMENT_TYPES[documentName]
        )
    );
  };

  /* =====================================================
     DELETE EXISTING DOCUMENT
     ===================================================== */

  const handleDeleteDocument =
    async (documentId) => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setDeletingDocumentId(
        documentId
      );

      setSavedMessage("");

      try {
        const response =
          await fetch(
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

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to remove document."
          );
        }

        setExistingDocuments(
          (previous) =>
            previous.filter(
              (document) =>
                document._id !==
                documentId
            )
        );

        setSavedMessage(
          "Document removed successfully."
        );
      } catch (error) {
        console.error(
          "Delete Book Chapter document error:",
          error
        );

        setSavedMessage(
          error.message ||
            "Unable to remove the document."
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

    if (!formData.publicationType) {
      newErrors.publicationType =
        "Please select a publication type.";
    }

    if (!formData.title.trim()) {
      newErrors.title =
        "Book title is required.";
    }

    if (
      formData.publicationType ===
        "Book Chapter" &&
      !formData.chapterTitle.trim()
    ) {
      newErrors.chapterTitle =
        "Chapter title is required.";
    }

    if (!formData.isbn.trim()) {
      newErrors.isbn =
        "ISBN / e-ISBN is required.";
    }

    if (!formData.publisher.trim()) {
      newErrors.publisher =
        "Publisher name is required.";
    }

    if (!formData.publicationDate) {
      newErrors.publicationDate =
        "Publication date is required.";
    }

    if (!formData.financialYear) {
      newErrors.financialYear =
        "Financial year is required.";
    }

    if (!formData.authorName.trim()) {
      newErrors.authorName =
        "Author name is required.";
    }

    if (!formData.authorRole) {
      newErrors.authorRole =
        "Author role is required.";
    }

    if (!formData.publisherLocation.trim()) {
      newErrors.publisherLocation =
        "Publisher location is required.";
    }

    if (!formData.description.trim()) {
      newErrors.description =
        "Please provide publication details.";
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
      !hasDocument("bookCopy")
    ) {
      newErrors.bookCopy =
        "Book or chapter copy is required.";
    }

    if (
      !hasDocument(
        "publicationProof"
      )
    ) {
      newErrors.publicationProof =
        "Publication proof is required.";
    }

    if (
      !hasDocument("isbnProof")
    ) {
      newErrors.isbnProof =
        "ISBN proof is required.";
    }

    coAuthors.forEach(
      (author, index) => {
        if (!author.name.trim()) {
          newErrors[
            `coAuthor-${author.id}`
          ] =
            `Please enter the name of co-author ${
              index + 1
            }.`;
        }
      }
    );

    if (!declarationAccepted) {
      newErrors.declaration =
        "You must accept the declaration before submitting.";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length ===
      0
    );
  };

  /* =====================================================
     CREATE / UPDATE CLAIM
     ===================================================== */

  const createOrUpdateClaim =
    async () => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();

        throw new Error(
          "Authentication required."
        );
      }

      const claimFormData = {
        ...formData,
        coAuthors,
      };

      const payload = {
        claimType:
          "BOOK_CHAPTER",
        financialYear:
          formData.financialYear,
        formData: claimFormData,
        incentiveAmount:
          Number(
            formData.incentiveAmount
          ) || 0,
        declarationAccepted,
      };

      const isEditing =
        Boolean(currentClaimId);

      const url = isEditing
        ? `${API_BASE_URL}/api/claims/${currentClaimId}`
        : `${API_BASE_URL}/api/claims`;

      const response =
        await fetch(url, {
          method: isEditing
            ? "PATCH"
            : "POST",
          headers: getHeaders(),
          body: JSON.stringify(
            payload
          ),
        });

      if (response.status === 401) {
        handleUnauthorized();

        throw new Error(
          "Your session has expired."
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to save the claim."
        );
      }

      const savedClaim =
        result.data?.claim ||
        result.data;

      const claimId =
        savedClaim?._id ||
        savedClaim?.id ||
        currentClaimId;

      if (!claimId) {
        throw new Error(
          "Claim was saved but no claim ID was returned."
        );
      }

      setCurrentClaimId(
        claimId
      );

      return claimId;
    };

  /* =====================================================
     UPLOAD SELECTED DOCUMENTS
     ===================================================== */

  const uploadSelectedDocuments =
    async (claimId) => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();

        throw new Error(
          "Authentication required."
        );
      }

      const selectedDocuments =
        Object.entries(documents).filter(
          ([, file]) =>
            Boolean(file)
        );

      if (
        selectedDocuments.length ===
        0
      ) {
        return;
      }

      for (
        const [
          documentKey,
          file,
        ] of selectedDocuments
      ) {
        const uploadData =
          new FormData();

        uploadData.append(
          "claimId",
          claimId
        );

        uploadData.append(
          "documentType",
          DOCUMENT_TYPES[
            documentKey
          ]
        );

        uploadData.append(
          "document",
          file
        );

        const response =
          await fetch(
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

          throw new Error(
            "Your session has expired."
          );
        }

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              `Unable to upload ${file.name}.`
          );
        }

        setDocuments(
          (previous) => ({
            ...previous,
            [documentKey]: null,
          })
        );

        const input =
          document.getElementById(
            `book-chapter-${documentKey}`
          );

        if (input) {
          input.value = "";
        }
      }

      await loadExistingDocuments(
        claimId
      );
    };

  /* =====================================================
     SAVE DRAFT
     ===================================================== */

  const handleSaveDraft =
    async () => {
      setSavedMessage("");
      setErrors({});
      setIsSavingDraft(true);

      try {
        const claimId =
          await createOrUpdateClaim();

        await uploadSelectedDocuments(
          claimId
        );

        setSavedMessage(
          "Book / Book Chapter claim saved as draft successfully."
        );
      } catch (error) {
        console.error(
          "Unable to save Book Chapter draft:",
          error
        );

        setSavedMessage(
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

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setSavedMessage("");

    if (!validateForm()) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const claimId =
        await createOrUpdateClaim();

      await uploadSelectedDocuments(
        claimId
      );

      const token = getToken();

      if (!token) {
        handleUnauthorized();

        return;
      }

      const submitResponse =
        await fetch(
          `${API_BASE_URL}/api/claims/${claimId}/submit`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (
        submitResponse.status ===
        401
      ) {
        handleUnauthorized();
        return;
      }

      const submitResult =
        await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(
          submitResult.message ||
            "Unable to submit the claim."
        );
      }

      setSavedMessage(
        "Book / Book Chapter claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 700);
    } catch (error) {
      console.error(
        "Book Chapter submission error:",
        error
      );

      setSavedMessage(
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

  const formatFileSize = (
    bytes
  ) => {
    if (!bytes) {
      return "";
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  };

  /* =====================================================
     DOCUMENT COMPONENT
     ===================================================== */

  const DocumentUpload = ({
    label,
    description,
    documentName,
    required = false,
  }) => {
    const selectedFile =
      documents[documentName];

    const uploadedDocument =
      getUploadedDocument(
        DOCUMENT_TYPES[
          documentName
        ]
      );

    return (
      <div className="book-chapter-document-item">
        <div className="book-chapter-document-information">
          <div className="book-chapter-document-icon">
            <FileText size={18} />
          </div>

          <div>
            <div className="book-chapter-document-title">
              <strong>{label}</strong>

              {required && (
                <span className="book-chapter-document-required">
                  Required
                </span>
              )}
            </div>

            <p>{description}</p>

            {uploadedDocument && (
              <div className="book-chapter-uploaded-document">
                <div className="book-chapter-file-info">
                  <CheckCircle2 size={18} />

                  <div>
                    <strong>
                      {uploadedDocument.originalName ||
                        "Document"}
                    </strong>

                    <span>
                      Uploaded document
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="book-chapter-file-remove"
                  onClick={() =>
                    handleDeleteDocument(
                      uploadedDocument._id
                    )
                  }
                  disabled={
                    deletingDocumentId ===
                    uploadedDocument._id
                  }
                >
                  {deletingDocumentId ===
                  uploadedDocument._id
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            )}
          </div>
        </div>

        {!selectedFile ? (
          <label
            className="book-chapter-upload-button"
            htmlFor={`book-chapter-${documentName}`}
          >
            <Upload size={15} />

            <span>
              Choose File
            </span>

            <input
              id={`book-chapter-${documentName}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) =>
                handleFileChange(
                  event,
                  documentName
                )
              }
            />
          </label>
        ) : (
          <div className="book-chapter-uploaded-file">
            <div className="book-chapter-file-info">
              <CheckCircle2 size={18} />

              <div>
                <strong>
                  {selectedFile.name}
                </strong>

                <span>
                  {formatFileSize(
                    selectedFile.size
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="book-chapter-file-remove"
              onClick={() =>
                removeDocument(
                  documentName
                )
              }
            >
              Remove
            </button>
          </div>
        )}

        {errors[documentName] && (
          <p className="book-chapter-error">
            {errors[documentName]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="book-chapter-page">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="book-chapter-header">
        <button
          type="button"
          className="book-chapter-back"
          onClick={() =>
            navigate("/claims")
          }
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <div className="book-chapter-heading">
          <span className="book-chapter-eyebrow">
            Research Incentive
          </span>

          <h1>
            Book / Book Chapter
          </h1>

          <p>
            Submit details of books, book
            chapters and related academic
            publications.
          </p>
        </div>
      </div>

      {/* =====================================================
          SUCCESS MESSAGE
          ===================================================== */}

      {savedMessage && (
        <div className="book-chapter-success-message">
          <CheckCircle2 size={18} />

          <span>
            {savedMessage}
          </span>
        </div>
      )}

      <form
        className="book-chapter-form"
        onSubmit={handleSubmit}
      >
        {/* ===================================================
            PUBLICATION INFORMATION
            =================================================== */}

        <section className="book-chapter-card">
          <div className="book-chapter-section-header">
            <div className="book-chapter-section-icon">
              <BookOpen size={18} />
            </div>

            <div>
              <h2>
                Publication Information
              </h2>

              <p>
                Provide the basic details of
                the book or book chapter.
              </p>
            </div>
          </div>

          <div className="book-chapter-form-grid">
            <div className="book-chapter-field">
              <label htmlFor="publicationType">
                Publication Type{" "}
                <span>*</span>
              </label>

              <select
                id="publicationType"
                name="publicationType"
                value={
                  formData.publicationType
                }
                onChange={handleChange}
              >
                <option value="">
                  Select publication type
                </option>

                {PUBLICATION_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>

              {errors.publicationType && (
                <p className="book-chapter-error">
                  {
                    errors.publicationType
                  }
                </p>
              )}
            </div>

            <div className="book-chapter-field">
              <label htmlFor="financialYear">
                Financial Year{" "}
                <span>*</span>
              </label>

              <select
                id="financialYear"
                name="financialYear"
                value={
                  formData.financialYear
                }
                onChange={handleChange}
              >
                {FINANCIAL_YEARS.map(
                  (year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  )
                )}
              </select>

              {errors.financialYear && (
                <p className="book-chapter-error">
                  {
                    errors.financialYear
                  }
                </p>
              )}
            </div>

            <div className="book-chapter-field book-chapter-field-full">
              <label htmlFor="title">
                Book Title <span>*</span>
              </label>

              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter the book title"
              />

              {errors.title && (
                <p className="book-chapter-error">
                  {errors.title}
                </p>
              )}
            </div>

            {formData.publicationType ===
              "Book Chapter" && (
              <div className="book-chapter-field book-chapter-field-full">
                <label htmlFor="chapterTitle">
                  Chapter Title{" "}
                  <span>*</span>
                </label>

                <input
                  id="chapterTitle"
                  name="chapterTitle"
                  type="text"
                  value={
                    formData.chapterTitle
                  }
                  onChange={handleChange}
                  placeholder="Enter the chapter title"
                />

                {errors.chapterTitle && (
                  <p className="book-chapter-error">
                    {
                      errors.chapterTitle
                    }
                  </p>
                )}
              </div>
            )}

            <div className="book-chapter-field">
              <label htmlFor="isbn">
                ISBN / e-ISBN{" "}
                <span>*</span>
              </label>

              <input
                id="isbn"
                name="isbn"
                type="text"
                value={formData.isbn}
                onChange={handleChange}
                placeholder="Enter ISBN or e-ISBN"
              />

              {errors.isbn && (
                <p className="book-chapter-error">
                  {errors.isbn}
                </p>
              )}
            </div>

            <div className="book-chapter-field">
              <label htmlFor="publisher">
                Publisher <span>*</span>
              </label>

              <input
                id="publisher"
                name="publisher"
                type="text"
                value={
                  formData.publisher
                }
                onChange={handleChange}
                placeholder="Enter publisher name"
              />

              {errors.publisher && (
                <p className="book-chapter-error">
                  {errors.publisher}
                </p>
              )}
            </div>

            <div className="book-chapter-field">
              <label htmlFor="publicationDate">
                Publication Date{" "}
                <span>*</span>
              </label>

              <input
                id="publicationDate"
                name="publicationDate"
                type="date"
                value={
                  formData.publicationDate
                }
                onChange={handleChange}
              />

              {errors.publicationDate && (
                <p className="book-chapter-error">
                  {
                    errors.publicationDate
                  }
                </p>
              )}
            </div>

            <div className="book-chapter-field">
              <label htmlFor="publisherLocation">
                Publisher Location{" "}
                <span>*</span>
              </label>

              <input
                id="publisherLocation"
                name="publisherLocation"
                type="text"
                value={
                  formData.publisherLocation
                }
                onChange={handleChange}
                placeholder="City, Country"
              />

              {errors.publisherLocation && (
                <p className="book-chapter-error">
                  {
                    errors.publisherLocation
                  }
                </p>
              )}
            </div>

            <div className="book-chapter-field">
              <label htmlFor="edition">
                Edition
              </label>

              <input
                id="edition"
                name="edition"
                type="text"
                value={formData.edition}
                onChange={handleChange}
                placeholder="Example: First Edition"
              />
            </div>

            <div className="book-chapter-field">
              <label htmlFor="pageNumbers">
                Page Numbers
              </label>

              <input
                id="pageNumbers"
                name="pageNumbers"
                type="text"
                value={
                  formData.pageNumbers
                }
                onChange={handleChange}
                placeholder="Example: 120-145"
              />
            </div>

            <div className="book-chapter-field book-chapter-field-full">
              <label htmlFor="description">
                Publication Details{" "}
                <span>*</span>
              </label>

              <textarea
                id="description"
                name="description"
                rows="4"
                value={
                  formData.description
                }
                onChange={handleChange}
                placeholder="Provide a brief description of the publication, subject area and academic relevance"
              />

              {errors.description && (
                <p className="book-chapter-error">
                  {errors.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            AUTHOR INFORMATION
            =================================================== */}

        <section className="book-chapter-card">
          <div className="book-chapter-section-header">
            <div className="book-chapter-section-icon">
              <Users size={18} />
            </div>

            <div>
              <h2>
                Author Information
              </h2>

              <p>
                Provide your role and details
                of other contributors.
              </p>
            </div>
          </div>

          <div className="book-chapter-form-grid">
            <div className="book-chapter-field">
              <label htmlFor="authorName">
                Faculty / Author Name{" "}
                <span>*</span>
              </label>

              <input
                id="authorName"
                name="authorName"
                type="text"
                value={
                  formData.authorName
                }
                onChange={handleChange}
                placeholder="Enter author name"
              />

              {errors.authorName && (
                <p className="book-chapter-error">
                  {errors.authorName}
                </p>
              )}
            </div>

            <div className="book-chapter-field">
              <label htmlFor="authorRole">
                Author Role <span>*</span>
              </label>

              <select
                id="authorRole"
                name="authorRole"
                value={
                  formData.authorRole
                }
                onChange={handleChange}
              >
                {AUTHOR_ROLES.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  )
                )}
              </select>

              {errors.authorRole && (
                <p className="book-chapter-error">
                  {errors.authorRole}
                </p>
              )}
            </div>

            <div className="book-chapter-field book-chapter-field-full">
              <label htmlFor="contribution">
                Author Contribution{" "}
                <span>*</span>
              </label>

              <textarea
                id="contribution"
                name="contribution"
                rows="4"
                value={
                  formData.contribution
                }
                onChange={handleChange}
                placeholder="Describe your contribution to the book or chapter"
              />

              {errors.contribution && (
                <p className="book-chapter-error">
                  {errors.contribution}
                </p>
              )}
            </div>
          </div>

          {/* Co Authors */}

          <div className="book-chapter-subsection">
            <div className="book-chapter-subsection-header">
              <div>
                <h3>
                  Co-Authors / Contributors
                </h3>

                <p>
                  Add other authors or
                  contributors involved in
                  the publication.
                </p>
              </div>

              <button
                type="button"
                className="book-chapter-secondary-button"
                onClick={addCoAuthor}
                disabled={
                  isSubmitting ||
                  isSavingDraft
                }
              >
                <Plus size={16} />
                Add Author
              </button>
            </div>

            {coAuthors.length > 0 && (
              <div className="book-chapter-author-list">
                {coAuthors.map(
                  (
                    author,
                    index
                  ) => (
                    <div
                      className="book-chapter-author-row"
                      key={author.id}
                    >
                      <div className="book-chapter-author-number">
                        {index + 1}
                      </div>

                      <div className="book-chapter-author-fields">
                        <div className="book-chapter-field">
                          <label>
                            Author Name{" "}
                            <span>*</span>
                          </label>

                          <input
                            type="text"
                            value={
                              author.name
                            }
                            onChange={(
                              event
                            ) =>
                              updateCoAuthor(
                                author.id,
                                "name",
                                event.target
                                  .value
                              )
                            }
                            placeholder="Author name"
                          />

                          {errors[
                            `coAuthor-${author.id}`
                          ] && (
                            <p className="book-chapter-error">
                              {
                                errors[
                                  `coAuthor-${author.id}`
                                ]
                              }
                            </p>
                          )}
                        </div>

                        <div className="book-chapter-field">
                          <label>
                            Author Role
                          </label>

                          <select
                            value={
                              author.role
                            }
                            onChange={(
                              event
                            ) =>
                              updateCoAuthor(
                                author.id,
                                "role",
                                event.target
                                  .value
                              )
                            }
                          >
                            {AUTHOR_ROLES.map(
                              (role) => (
                                <option
                                  key={role}
                                  value={role}
                                >
                                  {role}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div className="book-chapter-field">
                          <label>
                            Affiliation
                          </label>

                          <input
                            type="text"
                            value={
                              author.affiliation
                            }
                            onChange={(
                              event
                            ) =>
                              updateCoAuthor(
                                author.id,
                                "affiliation",
                                event.target
                                  .value
                              )
                            }
                            placeholder="Institution / department"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="book-chapter-delete-button"
                        onClick={() =>
                          removeCoAuthor(
                            author.id
                          )
                        }
                        disabled={
                          isSubmitting ||
                          isSavingDraft
                        }
                        aria-label="Remove author"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================
            INCENTIVE INFORMATION
            =================================================== */}

        <section className="book-chapter-card">
          <div className="book-chapter-section-header">
            <div className="book-chapter-section-icon">
              <IndianRupee size={18} />
            </div>

            <div>
              <h2>
                Incentive Information
              </h2>

              <p>
                Enter the incentive amount
                associated with this
                publication claim.
              </p>
            </div>
          </div>

          <div className="book-chapter-form-grid">
            <div className="book-chapter-field">
              <label htmlFor="incentiveAmount">
                Claimed Incentive Amount{" "}
                <span>*</span>
              </label>

              <div className="book-chapter-currency-input">
                <span>₹</span>

                <input
                  id="incentiveAmount"
                  name="incentiveAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formData.incentiveAmount
                  }
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              {errors.incentiveAmount && (
                <p className="book-chapter-error">
                  {
                    errors.incentiveAmount
                  }
                </p>
              )}

              <small>
                The final eligible amount will
                be verified during claim
                review.
              </small>
            </div>
          </div>
        </section>

        {/* ===================================================
            SUPPORTING DOCUMENTS
            =================================================== */}

        <section className="book-chapter-card">
          <div className="book-chapter-section-header">
            <div className="book-chapter-section-icon">
              <Upload size={18} />
            </div>

            <div>
              <h2>
                Supporting Documents
              </h2>

              <p>
                Upload documents supporting
                the book or book chapter
                claim.
              </p>
            </div>
          </div>

          <div className="book-chapter-document-list">
            <DocumentUpload
              label="Book / Chapter Copy"
              description="Copy of the published book or relevant chapter."
              documentName="bookCopy"
              required
            />

            <DocumentUpload
              label="Publication Proof"
              description="Evidence confirming publication of the book or chapter."
              documentName="publicationProof"
              required
            />

            <DocumentUpload
              label="ISBN Proof"
              description="Document showing the ISBN or e-ISBN details."
              documentName="isbnProof"
              required
            />

            <DocumentUpload
              label="Publisher Letter"
              description="Publisher-issued confirmation or communication."
              documentName="publisherLetter"
            />

            <DocumentUpload
              label="Supporting Evidence"
              description="Any additional evidence supporting the publication claim."
              documentName="supportingEvidence"
            />
          </div>

          {loadingDocuments && (
            <div className="book-chapter-document-note">
              <FileText size={17} />

              <p>
                Loading previously uploaded
                documents...
              </p>
            </div>
          )}

          <div className="book-chapter-document-note">
            <FileText size={17} />

            <p>
              Accepted formats: PDF, JPG,
              JPEG, and PNG. Maximum file
              size 10 MB per document.
            </p>
          </div>
        </section>

        {/* ===================================================
            DECLARATION
            =================================================== */}

        <section className="book-chapter-card book-chapter-declaration-card">
          <div className="book-chapter-checkbox-wrapper">
            <input
              id="declarationAccepted"
              type="checkbox"
              checked={
                declarationAccepted
              }
              onChange={(event) => {
                setDeclarationAccepted(
                  event.target.checked
                );

                setErrors(
                  (previous) => ({
                    ...previous,
                    declaration: "",
                  })
                );

                setSavedMessage("");
              }}
            />

            <label htmlFor="declarationAccepted">
              I declare that the information
              provided in this claim is true
              and accurate to the best of my
              knowledge. I understand that
              the submitted documents may be
              verified during the review
              process.
            </label>
          </div>

          {errors.declaration && (
            <p className="book-chapter-error">
              {errors.declaration}
            </p>
          )}
        </section>

        {/* ===================================================
            ACTIONS
            =================================================== */}

        <div className="book-chapter-actions">
          <button
            type="button"
            className="book-chapter-draft-button"
            onClick={handleSaveDraft}
            disabled={
              isSavingDraft ||
              isSubmitting
            }
          >
            {isSavingDraft
              ? "Saving..."
              : "Save Draft"}
          </button>

          <button
            type="submit"
            className="book-chapter-submit-button"
            disabled={
              isSubmitting ||
              isSavingDraft
            }
          >
            <CheckCircle2 size={17} />

            {isSubmitting
              ? "Submitting..."
              : "Submit Claim"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default BookChapter;