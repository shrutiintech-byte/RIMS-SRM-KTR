import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import "./Patent.css";

const API_BASE_URL = "http://localhost:5000";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  {
    value: "2026-27",
    label: "2026–27",
  },
  {
    value: "2025-26",
    label: "2025–26",
  },
  {
    value: "2024-25",
    label: "2024–25",
  },
];

const PATENT_TYPES = [
  {
    value: "Indian Patent",
    label: "Indian Patent",
  },
  {
    value: "International Patent",
    label: "International Patent",
  },
];

const PATENT_STATUSES = [
  {
    value: "Filed",
    label: "Filed",
  },
  {
    value: "Published",
    label: "Published",
  },
  {
    value: "Granted",
    label: "Granted",
  },
];

const PATENT_ROLES = [
  {
    value: "Inventor",
    label: "Inventor",
  },
  {
    value: "Co-Inventor",
    label: "Co-Inventor",
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DOCUMENT_TYPES = {
  patentFilingProof: "patentFilingProof",
  publicationProof: "publicationProof",
  patentCertificate: "patentCertificate",
};

const DOCUMENT_LABELS = {
  patentFilingProof: "Patent Filing Proof",
  publicationProof: "Publication Proof",
  patentCertificate: "Patent Certificate",
};

const createEmptyForm = () => ({
  patentTitle: "",
  applicationNumber: "",
  patentType: "",
  patentStatus: "",
  filingDate: "",
  grantDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  inventorName: "",
  patentRole: "",
  patentOffice: "",
  incentiveAmount: "",
});

const normalizeDateForInput = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
};

const getToken = () => {
  return localStorage.getItem("rimsToken");
};

const clearSessionAndRedirect = (navigate) => {
  localStorage.removeItem("rimsToken");
  localStorage.removeItem("rimsUser");
  navigate("/");
};

const Patent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const draftClaim = location.state?.draftClaim || null;

  const isEditingDraft = Boolean(
    location.state?.isEditingDraft &&
      draftClaim?._id
  );

  const [claimId, setClaimId] = useState(
    draftClaim?._id || null
  );

  const [formData, setFormData] = useState(() => ({
    ...createEmptyForm(),
    ...(draftClaim?.formData || {}),
    incentiveAmount:
      draftClaim?.incentiveAmount ??
      draftClaim?.formData?.incentiveAmount ??
      "",
    filingDate: normalizeDateForInput(
      draftClaim?.formData?.filingDate
    ),
    grantDate: normalizeDateForInput(
      draftClaim?.formData?.grantDate
    ),
  }));

  const [coInventors, setCoInventors] = useState(
    Array.isArray(
      draftClaim?.formData?.coInventors
    )
      ? draftClaim.formData.coInventors
      : []
  );

  const [documents, setDocuments] = useState({
    patentFilingProof: null,
    publicationProof: null,
    patentCertificate: null,
  });

  const [uploadedDocuments, setUploadedDocuments] =
    useState([]);

  const [declaration, setDeclaration] =
    useState(
      Boolean(
        draftClaim?.declarationAccepted
      )
    );

  const [errors, setErrors] = useState({});

  const [savedMessage, setSavedMessage] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] =
    useState(false);

  const [loadingDocuments, setLoadingDocuments] =
    useState(false);

  const [deletingDocumentId, setDeletingDocumentId] =
    useState(null);

  // =====================================================
  // REHYDRATE DRAFT
  // =====================================================

  useEffect(() => {
    if (!draftClaim) {
      return;
    }

    setClaimId(draftClaim._id || null);

    setFormData({
      ...createEmptyForm(),
      ...(draftClaim.formData || {}),
      incentiveAmount:
        draftClaim.incentiveAmount ??
        draftClaim.formData?.incentiveAmount ??
        "",
      filingDate: normalizeDateForInput(
        draftClaim.formData?.filingDate
      ),
      grantDate: normalizeDateForInput(
        draftClaim.formData?.grantDate
      ),
    });

    setCoInventors(
      Array.isArray(
        draftClaim.formData?.coInventors
      )
        ? draftClaim.formData.coInventors
        : []
    );

    setDeclaration(
      Boolean(draftClaim.declarationAccepted)
    );
  }, [draftClaim]);

  // =====================================================
  // LOAD UPLOADED DOCUMENTS
  // =====================================================

  const loadUploadedDocuments = async (
    currentClaimId
  ) => {
    if (!currentClaimId) {
      setUploadedDocuments([]);
      return;
    }

    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      return;
    }

    setLoadingDocuments(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents?claimId=${encodeURIComponent(
          currentClaimId
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

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to retrieve uploaded documents."
        );
      }

      const documentsFromServer =
        result?.data?.documents || [];

      setUploadedDocuments(
        Array.isArray(documentsFromServer)
          ? documentsFromServer
          : []
      );
    } catch (error) {
      console.error(
        "Load uploaded documents error:",
        error
      );

      setSavedMessage(
        error.message ||
          "Unable to load uploaded documents."
      );
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    if (claimId) {
      loadUploadedDocuments(claimId);
    }
  }, [claimId]);

  // =====================================================
  // FIELD HANDLERS
  // =====================================================

  const handleFieldChange = (
    field,
    value
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));

    setSavedMessage("");
  };

  // =====================================================
  // CO-INVENTOR HANDLERS
  // =====================================================

  const addCoInventor = () => {
    setCoInventors((previous) => [
      ...previous,
      {
        name: "",
        role: "Co-Inventor",
      },
    ]);
  };

  const updateCoInventor = (
    index,
    field,
    value
  ) => {
    setCoInventors((previous) =>
      previous.map((inventor, inventorIndex) =>
        inventorIndex === index
          ? {
              ...inventor,
              [field]: value,
            }
          : inventor
      )
    );

    setErrors((previous) => ({
      ...previous,
      coInventors: "",
    }));
  };

  const removeCoInventor = (index) => {
    setCoInventors((previous) =>
      previous.filter(
        (_, inventorIndex) =>
          inventorIndex !== index
      )
    );
  };

  // =====================================================
  // DOCUMENT VALIDATION
  // =====================================================

  const validateDocument = (file) => {
    if (!file) {
      return "Please select a document.";
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Only PDF, JPG, JPEG, and PNG files are allowed.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "File size must not exceed 10 MB.";
    }

    return "";
  };

  const handleDocumentChange = (
    documentType,
    file
  ) => {
    if (!file) {
      setDocuments((previous) => ({
        ...previous,
        [documentType]: null,
      }));

      return;
    }

    const documentError =
      validateDocument(file);

    if (documentError) {
      setErrors((previous) => ({
        ...previous,
        [documentType]: documentError,
      }));

      return;
    }

    setDocuments((previous) => ({
      ...previous,
      [documentType]: file,
    }));

    setErrors((previous) => ({
      ...previous,
      [documentType]: "",
    }));

    setSavedMessage("");
  };

  // =====================================================
  // DOCUMENT HELPERS
  // =====================================================

  const getUploadedDocument = (
    documentType
  ) => {
    return uploadedDocuments.find(
      (document) =>
        document.documentType ===
        documentType
    );
  };

  const hasDocument = (documentType) => {
    return Boolean(
      documents[documentType] ||
        getUploadedDocument(documentType)
    );
  };

  const getDocumentDisplayName = (
    documentType
  ) => {
    const selectedFile =
      documents[documentType];

    if (selectedFile) {
      return selectedFile.name;
    }

    const uploaded =
      getUploadedDocument(documentType);

    if (uploaded) {
      return uploaded.originalName;
    }

    return "";
  };

  // =====================================================
  // DELETE UPLOADED DOCUMENT
  // =====================================================

  const handleDeleteDocument = async (
    documentId
  ) => {
    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      return;
    }

    setDeletingDocumentId(documentId);

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
        clearSessionAndRedirect(navigate);
        return;
      }

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to delete the document."
        );
      }

      setUploadedDocuments(
        (previous) =>
          previous.filter(
            (document) =>
              document._id !== documentId
          )
      );

      setSavedMessage(
        "Document deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete document error:",
        error
      );

      setSavedMessage(
        error.message ||
          "Unable to delete the document."
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  // =====================================================
  // FORM VALIDATION
  // =====================================================

  const validateForm = () => {
    const validationErrors = {};

    if (!formData.patentTitle.trim()) {
      validationErrors.patentTitle =
        "Patent title is required.";
    }

    if (!formData.applicationNumber.trim()) {
      validationErrors.applicationNumber =
        "Application number is required.";
    }

    if (!formData.patentType) {
      validationErrors.patentType =
        "Patent type is required.";
    }

    if (!formData.patentStatus) {
      validationErrors.patentStatus =
        "Patent status is required.";
    }

    if (!formData.filingDate) {
      validationErrors.filingDate =
        "Filing date is required.";
    }

    if (
      formData.patentStatus === "Granted" &&
      !formData.grantDate
    ) {
      validationErrors.grantDate =
        "Grant date is required for a granted patent.";
    }

    if (!formData.financialYear) {
      validationErrors.financialYear =
        "Financial year is required.";
    }

    if (!formData.inventorName.trim()) {
      validationErrors.inventorName =
        "Inventor name is required.";
    }

    if (!formData.patentRole) {
      validationErrors.patentRole =
        "Your patent role is required.";
    }

    if (!formData.patentOffice.trim()) {
      validationErrors.patentOffice =
        "Patent office is required.";
    }

    const incentiveAmount = Number(
      formData.incentiveAmount
    );

    if (
      formData.incentiveAmount === "" ||
      Number.isNaN(incentiveAmount) ||
      incentiveAmount < 0
    ) {
      validationErrors.incentiveAmount =
        "Enter a valid incentive amount.";
    }

    if (coInventors.length > 0) {
      const invalidCoInventor =
        coInventors.some(
          (inventor) =>
            !inventor.name?.trim()
        );

      if (invalidCoInventor) {
        validationErrors.coInventors =
          "Please enter the name of every co-inventor.";
      }
    }

    // ---------------------------------------------------
    // REQUIRED DOCUMENTS
    // ---------------------------------------------------

    if (
      !hasDocument(
        DOCUMENT_TYPES.patentFilingProof
      )
    ) {
      validationErrors.patentFilingProof =
        "Patent Filing Proof is required.";
    }

    if (
      formData.patentStatus === "Published" &&
      !hasDocument(
        DOCUMENT_TYPES.publicationProof
      )
    ) {
      validationErrors.publicationProof =
        "Publication Proof is required for a published patent.";
    }

    if (
      formData.patentStatus === "Granted" &&
      !hasDocument(
        DOCUMENT_TYPES.patentCertificate
      )
    ) {
      validationErrors.patentCertificate =
        "Patent Certificate is required for a granted patent.";
    }

    // Validate newly selected documents.
    Object.entries(documents).forEach(
      ([documentType, file]) => {
        if (!file) {
          return;
        }

        const documentError =
          validateDocument(file);

        if (documentError) {
          validationErrors[documentType] =
            documentError;
        }
      }
    );

    if (!declaration) {
      validationErrors.declaration =
        "You must accept the declaration before submission.";
    }

    setErrors(validationErrors);

    return (
      Object.keys(validationErrors).length ===
      0
    );
  };

  // =====================================================
  // CLAIM PAYLOAD
  // =====================================================

  const buildClaimPayload = () => {
    return {
      claimType: "PATENT",
      financialYear: formData.financialYear,
      incentiveAmount: Number(
        formData.incentiveAmount || 0
      ),
      declarationAccepted: declaration,
      formData: {
        ...formData,
        coInventors,
      },
    };
  };

  // =====================================================
  // CREATE / UPDATE CLAIM
  // =====================================================

  const saveClaim = async () => {
    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      throw new Error(
        "Your session has expired. Please log in again."
      );
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
        body: JSON.stringify(
          buildClaimPayload()
        ),
      }
    );

    if (response.status === 401) {
      clearSessionAndRedirect(navigate);
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const result = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to save the claim."
      );
    }

    const savedClaim =
      result?.data?.claim ||
      result?.data;

    const savedClaimId =
      savedClaim?._id ||
      savedClaim?.id ||
      claimId;

    if (!savedClaimId) {
      throw new Error(
        "Claim was saved, but no claim ID was returned."
      );
    }

    setClaimId(savedClaimId);

    return savedClaimId;
  };

  // =====================================================
  // UPLOAD ONE DOCUMENT
  // =====================================================

  const uploadDocument = async (
    currentClaimId,
    documentType,
    file
  ) => {
    if (!file) {
      return null;
    }

    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const formDataToUpload =
      new FormData();

    formDataToUpload.append(
      "claimId",
      currentClaimId
    );

    formDataToUpload.append(
      "documentType",
      documentType
    );

    formDataToUpload.append(
      "document",
      file
    );

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
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const result = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.message ||
          `Unable to upload ${DOCUMENT_LABELS[documentType]}.`
      );
    }

    return (
      result?.data?.document ||
      result?.data ||
      null
    );
  };

  // =====================================================
  // UPLOAD SELECTED DOCUMENTS
  // =====================================================

  const uploadSelectedDocuments = async (
    currentClaimId
  ) => {
    const selectedDocuments =
      Object.entries(documents).filter(
        ([, file]) => Boolean(file)
      );

    if (
      selectedDocuments.length === 0
    ) {
      return [];
    }

    const uploaded = [];

    for (
      const [documentType, file] of selectedDocuments
    ) {
      const uploadedDocument =
        await uploadDocument(
          currentClaimId,
          documentType,
          file
        );

      if (uploadedDocument) {
        uploaded.push(uploadedDocument);
      }
    }

    if (uploaded.length > 0) {
      setUploadedDocuments(
        (previous) => [
          ...previous,
          ...uploaded,
        ]
      );

      setDocuments({
        patentFilingProof: null,
        publicationProof: null,
        patentCertificate: null,
      });
    }

    return uploaded;
  };

  // =====================================================
  // SAVE DRAFT
  // =====================================================

  const handleSaveDraft = async () => {
    setSavedMessage("");
    setErrors({});

    setSaving(true);

    try {
      const currentClaimId =
        await saveClaim();

      await uploadSelectedDocuments(
        currentClaimId
      );

      setSavedMessage(
        claimId
          ? "Draft updated successfully."
          : "Draft saved successfully."
      );
    } catch (error) {
      console.error(
        "Save draft error:",
        error
      );

      setSavedMessage(
        error.message ||
          "Unable to save the draft."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SUBMIT CLAIM
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setSavedMessage("");

    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    const token = getToken();

    if (!token) {
      clearSessionAndRedirect(navigate);
      return;
    }

    setSubmitting(true);

    try {
      // -----------------------------------------------
      // STEP 1: CREATE / UPDATE CLAIM
      // -----------------------------------------------

      const currentClaimId =
        await saveClaim();

      // -----------------------------------------------
      // STEP 2: UPLOAD SELECTED DOCUMENTS
      // -----------------------------------------------

      await uploadSelectedDocuments(
        currentClaimId
      );

      // -----------------------------------------------
      // STEP 3: RELOAD DOCUMENTS
      // -----------------------------------------------

      await loadUploadedDocuments(
        currentClaimId
      );

      // -----------------------------------------------
      // STEP 4: SUBMIT CLAIM
      // -----------------------------------------------

      const submitResponse =
        await fetch(
          `${API_BASE_URL}/api/claims/${currentClaimId}/submit`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (submitResponse.status === 401) {
        clearSessionAndRedirect(navigate);
        return;
      }

      const submitResult =
        await submitResponse
          .json()
          .catch(() => null);

      if (!submitResponse.ok) {
        throw new Error(
          submitResult?.message ||
            "Unable to submit the claim."
        );
      }

      setSavedMessage(
        "Patent claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 900);
    } catch (error) {
      console.error(
        "Submit patent claim error:",
        error
      );

      setSavedMessage(
        error.message ||
          "Unable to submit the patent claim."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // REQUIRED DOCUMENT STATUS
  // =====================================================

  const requiredDocumentSummary =
    useMemo(() => {
      const items = [
        {
          type: DOCUMENT_TYPES.patentFilingProof,
          required: true,
        },
        {
          type: DOCUMENT_TYPES.publicationProof,
          required:
            formData.patentStatus ===
            "Published",
        },
        {
          type: DOCUMENT_TYPES.patentCertificate,
          required:
            formData.patentStatus ===
            "Granted",
        },
      ];

      return items.filter(
        (item) => item.required
      );
    }, [formData.patentStatus]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="patent-page">
      <div className="patent-page-header">
        <button
          type="button"
          className="patent-back-button"
          onClick={() =>
            navigate("/claims")
          }
        >
          <ArrowLeft size={16} />
          Back to Claims
        </button>

        <div>
          <div className="page-eyebrow">
            Research Incentive
          </div>

          <h1 className="page-title">
            {isEditingDraft
              ? "Edit Patent Draft"
              : "New Patent Claim"}
          </h1>

          <p className="page-description">
            Submit patent details and supporting
            documents for research incentive
            processing.
          </p>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="patent-validation-card">
          <div className="patent-validation-icon">
            <CircleAlert size={18} />
          </div>

          <div>
            <strong>
              Please review the highlighted
              information.
            </strong>

            <p>
              Complete all required fields and
              supporting documents before submitting
              the claim.
            </p>
          </div>
        </div>
      )}

      {savedMessage && (
        <div className="patent-message-card">
          <CheckCircle2 size={17} />
          <span>{savedMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="patent-form"
      >
        {/* =================================================
            PATENT INFORMATION
        ================================================= */}

        <section className="rims-card patent-form-card">
          <SectionHeader
            icon={<Award size={18} />}
            title="Patent Information"
            description="Provide the official details of the patent."
          />

          <div className="patent-form-body">
            <div className="patent-form-grid">
              <Field
                label="Patent Title"
                required
                error={errors.patentTitle}
                full
              >
                <input
                  type="text"
                  value={
                    formData.patentTitle
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "patentTitle",
                      event.target.value
                    )
                  }
                  placeholder="Enter the patent title"
                  className={
                    errors.patentTitle
                      ? "field-error"
                      : ""
                  }
                />
              </Field>

              <Field
                label="Application Number"
                required
                error={
                  errors.applicationNumber
                }
              >
                <input
                  type="text"
                  value={
                    formData.applicationNumber
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "applicationNumber",
                      event.target.value
                    )
                  }
                  placeholder="Enter application number"
                  className={
                    errors.applicationNumber
                      ? "field-error"
                      : ""
                  }
                />
              </Field>

              <Field
                label="Patent Type"
                required
                error={errors.patentType}
              >
                <select
                  value={
                    formData.patentType
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "patentType",
                      event.target.value
                    )
                  }
                  className={
                    errors.patentType
                      ? "field-error"
                      : ""
                  }
                >
                  <option value="">
                    Select patent type
                  </option>

                  {PATENT_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Patent Status"
                required
                error={errors.patentStatus}
              >
                <select
                  value={
                    formData.patentStatus
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "patentStatus",
                      event.target.value
                    )
                  }
                  className={
                    errors.patentStatus
                      ? "field-error"
                      : ""
                  }
                >
                  <option value="">
                    Select patent status
                  </option>

                  {PATENT_STATUSES.map(
                    (status) => (
                      <option
                        key={status.value}
                        value={status.value}
                      >
                        {status.label}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Filing Date"
                required
                error={errors.filingDate}
              >
                <input
                  type="date"
                  value={
                    formData.filingDate
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "filingDate",
                      event.target.value
                    )
                  }
                  className={
                    errors.filingDate
                      ? "field-error"
                      : ""
                  }
                />
              </Field>

              <Field
                label="Grant Date"
                error={errors.grantDate}
              >
                <input
                  type="date"
                  value={
                    formData.grantDate
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "grantDate",
                      event.target.value
                    )
                  }
                  disabled={
                    formData.patentStatus !==
                    "Granted"
                  }
                  className={
                    errors.grantDate
                      ? "field-error"
                      : ""
                  }
                />
              </Field>

              <Field
                label="Financial Year"
                required
                error={errors.financialYear}
              >
                <select
                  value={
                    formData.financialYear
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "financialYear",
                      event.target.value
                    )
                  }
                  className={
                    errors.financialYear
                      ? "field-error"
                      : ""
                  }
                >
                  {FINANCIAL_YEARS.map(
                    (year) => (
                      <option
                        key={year.value}
                        value={year.value}
                      >
                        {year.label}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Patent Office"
                required
                error={errors.patentOffice}
              >
                <input
                  type="text"
                  value={
                    formData.patentOffice
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "patentOffice",
                      event.target.value
                    )
                  }
                  placeholder="Enter patent office"
                  className={
                    errors.patentOffice
                      ? "field-error"
                      : ""
                  }
                />
              </Field>
            </div>
          </div>
        </section>

        {/* =================================================
            INVENTOR INFORMATION
        ================================================= */}

        <section className="rims-card patent-form-card">
          <SectionHeader
            icon={<FileText size={18} />}
            title="Inventor Information"
            description="Provide your role and co-inventor details."
          />

          <div className="patent-form-body">
            <div className="patent-form-grid">
              <Field
                label="Inventor Name"
                required
                error={errors.inventorName}
              >
                <input
                  type="text"
                  value={
                    formData.inventorName
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "inventorName",
                      event.target.value
                    )
                  }
                  placeholder="Enter inventor name"
                  className={
                    errors.inventorName
                      ? "field-error"
                      : ""
                  }
                />
              </Field>

              <Field
                label="Your Patent Role"
                required
                error={errors.patentRole}
              >
                <select
                  value={
                    formData.patentRole
                  }
                  onChange={(event) =>
                    handleFieldChange(
                      "patentRole",
                      event.target.value
                    )
                  }
                  className={
                    errors.patentRole
                      ? "field-error"
                      : ""
                  }
                >
                  <option value="">
                    Select your role
                  </option>

                  {PATENT_ROLES.map(
                    (role) => (
                      <option
                        key={role.value}
                        value={role.value}
                      >
                        {role.label}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Incentive Amount"
                required
                error={
                  errors.incentiveAmount
                }
              >
                <CurrencyInput
                  value={
                    formData.incentiveAmount
                  }
                  onChange={(value) =>
                    handleFieldChange(
                      "incentiveAmount",
                      value
                    )
                  }
                  error={
                    errors.incentiveAmount
                  }
                />
              </Field>
            </div>

            <div className="patent-subsection">
              <div className="patent-form-section-header">
                <div>
                  <h3>Co-Inventors</h3>
                  <p>
                    Add other contributors to
                    this patent, if applicable.
                  </p>
                </div>

                <button
                  type="button"
                  className="patent-add-button"
                  onClick={
                    addCoInventor
                  }
                >
                  <Plus size={15} />
                  Add Co-Inventor
                </button>
              </div>

              {errors.coInventors && (
                <div className="patent-field-error">
                  {errors.coInventors}
                </div>
              )}

              {coInventors.length === 0 ? (
                <div className="patent-empty-inline">
                  No co-inventors added.
                </div>
              ) : (
                <div className="patent-co-inventor-list">
                  {coInventors.map(
                    (
                      inventor,
                      index
                    ) => (
                      <div
                        className="patent-co-inventor-row"
                        key={index}
                      >
                        <input
                          type="text"
                          value={
                            inventor.name ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateCoInventor(
                              index,
                              "name",
                              event.target
                                .value
                            )
                          }
                          placeholder="Co-inventor name"
                        />

                        <select
                          value={
                            inventor.role ||
                            "Co-Inventor"
                          }
                          onChange={(
                            event
                          ) =>
                            updateCoInventor(
                              index,
                              "role",
                              event.target
                                .value
                            )
                          }
                        >
                          <option value="Co-Inventor">
                            Co-Inventor
                          </option>
                        </select>

                        <button
                          type="button"
                          className="patent-remove-button"
                          onClick={() =>
                            removeCoInventor(
                              index
                            )
                          }
                          aria-label="Remove co-inventor"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            SUPPORTING DOCUMENTS
        ================================================= */}

        <section className="rims-card patent-form-card">
          <SectionHeader
            icon={<FileCheck2 size={18} />}
            title="Supporting Documents"
            description="Upload the documents required to verify the patent claim."
          />

          <div className="patent-form-body">
            {loadingDocuments && (
              <div className="patent-empty-inline">
                Loading uploaded documents...
              </div>
            )}

            <div className="research-document-list">
              <DocumentUpload
                documentType={
                  DOCUMENT_TYPES.patentFilingProof
                }
                label="Patent Filing Proof"
                required
                selectedFile={
                  documents.patentFilingProof
                }
                uploadedDocument={getUploadedDocument(
                  DOCUMENT_TYPES.patentFilingProof
                )}
                displayName={getDocumentDisplayName(
                  DOCUMENT_TYPES.patentFilingProof
                )}
                error={
                  errors.patentFilingProof
                }
                onChange={
                  handleDocumentChange
                }
                onDelete={
                  handleDeleteDocument
                }
                deletingDocumentId={
                  deletingDocumentId
                }
              />

              <DocumentUpload
                documentType={
                  DOCUMENT_TYPES.publicationProof
                }
                label="Publication Proof"
                required={
                  formData.patentStatus ===
                  "Published"
                }
                selectedFile={
                  documents.publicationProof
                }
                uploadedDocument={getUploadedDocument(
                  DOCUMENT_TYPES.publicationProof
                )}
                displayName={getDocumentDisplayName(
                  DOCUMENT_TYPES.publicationProof
                )}
                error={
                  errors.publicationProof
                }
                onChange={
                  handleDocumentChange
                }
                onDelete={
                  handleDeleteDocument
                }
                deletingDocumentId={
                  deletingDocumentId
                }
              />

              <DocumentUpload
                documentType={
                  DOCUMENT_TYPES.patentCertificate
                }
                label="Patent Certificate"
                required={
                  formData.patentStatus ===
                  "Granted"
                }
                selectedFile={
                  documents.patentCertificate
                }
                uploadedDocument={getUploadedDocument(
                  DOCUMENT_TYPES.patentCertificate
                )}
                displayName={getDocumentDisplayName(
                  DOCUMENT_TYPES.patentCertificate
                )}
                error={
                  errors.patentCertificate
                }
                onChange={
                  handleDocumentChange
                }
                onDelete={
                  handleDeleteDocument
                }
                deletingDocumentId={
                  deletingDocumentId
                }
              />
            </div>

            <div className="research-document-note">
              Accepted formats: PDF, JPG, JPEG,
              PNG. Maximum file size: 10 MB.
            </div>

            {requiredDocumentSummary.length >
              0 && (
              <div className="patent-document-status-summary">
                <strong>
                  Required documents
                </strong>

                <div>
                  {requiredDocumentSummary.map(
                    (item) => (
                      <span
                        key={item.type}
                        className={
                          hasDocument(
                            item.type
                          )
                            ? "document-status-complete"
                            : "document-status-pending"
                        }
                      >
                        {hasDocument(
                          item.type
                        ) ? (
                          <CheckCircle2
                            size={13}
                          />
                        ) : (
                          <CircleAlert
                            size={13}
                          />
                        )}

                        {
                          DOCUMENT_LABELS[
                            item.type
                          ]
                        }
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            DECLARATION
        ================================================= */}

        <section className="rims-card patent-declaration-card">
          <div className="patent-declaration-content">
            <label className="patent-declaration-label">
              <input
                type="checkbox"
                checked={declaration}
                onChange={(event) => {
                  setDeclaration(
                    event.target.checked
                  );

                  setErrors(
                    (previous) => ({
                      ...previous,
                      declaration: "",
                    })
                  );
                }}
              />

              <span>
                I declare that the information
                provided in this claim is accurate
                and the submitted documents are
                genuine.
              </span>
            </label>

            {errors.declaration && (
              <div className="patent-field-error">
                {errors.declaration}
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            SUBMISSION
        ================================================= */}

        <section className="rims-card patent-submission-card">
          <div>
            <h3>
              Ready to submit?
            </h3>

            <p>
              Save the claim as a draft if you
              want to continue later, or submit
              it for review once all information
              and required documents are complete.
            </p>
          </div>

          <div className="patent-submission-actions">
            <button
              type="button"
              className="patent-secondary-button"
              onClick={
                handleSaveDraft
              }
              disabled={
                saving || submitting
              }
            >
              <Save size={16} />

              {saving
                ? "Saving..."
                : "Save as Draft"}
            </button>

            <button
              type="submit"
              className="patent-primary-button"
              disabled={
                saving || submitting
              }
            >
              <CheckCircle2 size={16} />

              {submitting
                ? "Submitting..."
                : "Submit Claim"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};

// =========================================================
// SECTION HEADER
// =========================================================

const SectionHeader = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="patent-form-section-header">
      <div className="patent-form-section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>

        <p>{description}</p>
      </div>
    </div>
  );
};

// =========================================================
// FIELD
// =========================================================

const Field = ({
  label,
  required = false,
  error,
  children,
  full = false,
}) => {
  return (
    <div
      className={`patent-field ${
        full
          ? "patent-field-full"
          : ""
      }`}
    >
      <label>
        {label}

        {required && (
          <span aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <div className="patent-field-error">
          {error}
        </div>
      )}
    </div>
  );
};

// =========================================================
// CURRENCY INPUT
// =========================================================

const CurrencyInput = ({
  value,
  onChange,
  error,
}) => {
  return (
    <div
      className={`patent-input-prefix ${
        error ? "field-error" : ""
      }`}
    >
      <span>₹</span>

      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="0"
      />
    </div>
  );
};

// =========================================================
// DOCUMENT UPLOAD
// =========================================================

const DocumentUpload = ({
  documentType,
  label,
  required,
  selectedFile,
  uploadedDocument,
  displayName,
  error,
  onChange,
  onDelete,
  deletingDocumentId,
}) => {
  const inputId = `document-${documentType}`;

  const hasUploadedDocument =
    Boolean(uploadedDocument);

  const hasSelectedFile =
    Boolean(selectedFile);

  return (
    <div className="research-document-item">
      <div className="research-document-information">
        <div className="research-document-icon">
          <FileText size={18} />
        </div>

        <div>
          <h3>
            {label}

            {required && (
              <span aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </h3>

          <p>
            {hasSelectedFile
              ? selectedFile.name
              : hasUploadedDocument
              ? uploadedDocument.originalName
              : "No document uploaded"}
          </p>
        </div>
      </div>

      <div className="research-document-actions">
        <label
          htmlFor={inputId}
          className="research-upload-button"
        >
          <Upload size={15} />

          {hasSelectedFile ||
          hasUploadedDocument
            ? "Choose Another"
            : "Upload"}

          <input
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) =>
              onChange(
                documentType,
                event.target.files?.[0] ||
                  null
              )
            }
          />
        </label>

        {hasUploadedDocument && (
          <button
            type="button"
            className="patent-remove-button"
            onClick={() =>
              onDelete(
                uploadedDocument._id
              )
            }
            disabled={
              deletingDocumentId ===
              uploadedDocument._id
            }
            aria-label={`Delete ${label}`}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {displayName && (
        <div className="research-selected-file">
          <FileCheck2 size={14} />
          <span>
            {displayName}
          </span>
        </div>
      )}

      {error && (
        <div className="patent-field-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default Patent;