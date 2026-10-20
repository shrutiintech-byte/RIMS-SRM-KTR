import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Award,
  CheckCircle2,
  FileCheck2,
  FileText,
  IndianRupee,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./ResearchAward.css";

const API_BASE_URL = "http://localhost:5000";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

const AWARD_LEVELS = [
  "Institutional",
  "Regional",
  "National",
  "International",
];

const AWARD_TYPES = [
  "Research Excellence Award",
  "Best Researcher Award",
  "Young Researcher Award",
  "Outstanding Research Award",
  "Innovation Award",
  "Other",
];

const FACULTY_ROLES = [
  "Recipient",
  "Co-Recipient",
  "Team Member",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const initialFormData = {
  awardTitle: "",
  awardType: "",
  otherAwardType: "",
  awardingOrganization: "",
  awardLevel: "",
  awardDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  recipientName: "",
  facultyRole: "Recipient",
  awardDescription: "",
  incentiveAmount: "",
};

const initialDocuments = {
  awardCertificate: null,
  awardLetter: null,
  supportingEvidence: null,
};

const DOCUMENT_TYPES = {
  awardCertificate: "Award Certificate",
  awardLetter: "Award Letter",
  supportingEvidence: "Supporting Evidence",
};

const createCoRecipientId = () => {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
};

function ResearchAward() {
  const location = useLocation();
  const navigate = useNavigate();

  const draftClaim =
    location.state?.draftClaim || null;

  const isEditingDraft =
    location.state?.isEditingDraft === true;

  const [formData, setFormData] =
    useState(initialFormData);

  const [coRecipients, setCoRecipients] =
    useState([]);

  const [documents, setDocuments] =
    useState(initialDocuments);

  const [existingDocuments, setExistingDocuments] =
    useState({});

  const [declarationAccepted, setDeclarationAccepted] =
    useState(false);

  const [claimId, setClaimId] =
    useState(draftClaim?._id || null);

  const [errors, setErrors] =
    useState({});

  const [savedMessage, setSavedMessage] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [documentsLoading, setDocumentsLoading] =
    useState(false);

  /* ========================================================
     LOAD DRAFT DATA
  ======================================================== */

  useEffect(() => {
    if (!draftClaim) {
      return;
    }

    const draftFormData =
      draftClaim.formData || {};

    setFormData({
      ...initialFormData,
      ...draftFormData,
      incentiveAmount:
        draftFormData.incentiveAmount ??
        draftClaim.incentiveAmount ??
        "",
    });

    const savedCoRecipients =
      Array.isArray(
        draftFormData.coRecipients
      )
        ? draftFormData.coRecipients
        : [];

    setCoRecipients(
      savedCoRecipients.map(
        (recipient) => ({
          id:
            recipient.id ||
            createCoRecipientId(),
          name:
            recipient.name || "",
          affiliation:
            recipient.affiliation || "",
          role:
            recipient.role ||
            "Co-Recipient",
        })
      )
    );

    setDeclarationAccepted(
      Boolean(
        draftClaim.declarationAccepted
      )
    );

    setClaimId(
      draftClaim._id ||
        draftClaim.id ||
        null
    );
  }, [draftClaim]);

  /* ========================================================
     LOAD EXISTING DOCUMENTS
  ======================================================== */

  useEffect(() => {
    if (!claimId) {
      return;
    }

    const loadExistingDocuments =
      async () => {
        const token =
          localStorage.getItem(
            "rimsToken"
          );

        if (!token) {
          navigate("/");
          return;
        }

        setDocumentsLoading(true);

        try {
          const response =
            await fetch(
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
            localStorage.removeItem(
              "rimsToken"
            );

            localStorage.removeItem(
              "rimsUser"
            );

            navigate("/");
            return;
          }

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result?.message ||
                "Unable to retrieve existing documents."
            );
          }

          const documentsList =
            result?.data?.documents ||
            [];

          const mappedDocuments = {};

          documentsList.forEach(
            (document) => {
              const documentKey =
                Object.keys(
                  DOCUMENT_TYPES
                ).find(
                  (key) =>
                    DOCUMENT_TYPES[key] ===
                    document.documentType
                );

              if (documentKey) {
                mappedDocuments[
                  documentKey
                ] = document;
              }
            }
          );

          setExistingDocuments(
            mappedDocuments
          );
        } catch (error) {
          console.error(
            "Load research award documents error:",
            error
          );

          setErrors((previous) => ({
            ...previous,
            documents:
              error.message ||
              "Unable to load existing documents.",
          }));
        } finally {
          setDocumentsLoading(false);
        }
      };

    loadExistingDocuments();
  }, [claimId, navigate]);

  /* ========================================================
     FIELD CHANGE
  ======================================================== */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setErrors(
      (previous) => ({
        ...previous,
        [name]: "",
      })
    );

    setSavedMessage("");
  };

  /* ========================================================
     DOCUMENT CHANGE
  ======================================================== */

  const handleFileChange = (
    event,
    documentName
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setErrors(
        (previous) => ({
          ...previous,
          [documentName]:
            "File size must not exceed 10 MB.",
        })
      );

      event.target.value = "";
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setErrors(
        (previous) => ({
          ...previous,
          [documentName]:
            "Only PDF, JPG and PNG files are allowed.",
        })
      );

      event.target.value = "";
      return;
    }

    setDocuments(
      (previous) => ({
        ...previous,
        [documentName]: file,
      })
    );

    setErrors(
      (previous) => ({
        ...previous,
        [documentName]: "",
        documents: "",
      })
    );

    setSavedMessage("");
  };

  /* ========================================================
     CO-RECIPIENT
  ======================================================== */

  const addCoRecipient = () => {
    setCoRecipients(
      (previous) => [
        ...previous,
        {
          id: createCoRecipientId(),
          name: "",
          affiliation: "",
          role: "Co-Recipient",
        },
      ]
    );

    setSavedMessage("");
  };

  const updateCoRecipient = (
    id,
    field,
    value
  ) => {
    setCoRecipients(
      (previous) =>
        previous.map(
          (recipient) =>
            recipient.id === id
              ? {
                  ...recipient,
                  [field]: value,
                }
              : recipient
        )
    );

    setErrors(
      (previous) => ({
        ...previous,
        [`coRecipient-${id}`]:
          "",
      })
    );

    setSavedMessage("");
  };

  const removeCoRecipient = (
    id
  ) => {
    setCoRecipients(
      (previous) =>
        previous.filter(
          (recipient) =>
            recipient.id !== id
        )
    );

    setErrors(
      (previous) => ({
        ...previous,
        [`coRecipient-${id}`]:
          "",
      })
    );

    setSavedMessage("");
  };

  /* ========================================================
     CHECK EXISTING DOCUMENT
  ======================================================== */

  const hasUsableExistingDocument = (
    documentName
  ) => {
    const document =
      existingDocuments[
        documentName
      ];

    if (!document) {
      return false;
    }

    return document.status !==
      "REJECTED";
  };

  /* ========================================================
     VALIDATION
  ======================================================== */

  const validateForm = () => {
    const newErrors = {};

    if (
      !formData.awardTitle.trim()
    ) {
      newErrors.awardTitle =
        "Award title is required.";
    }

    if (!formData.awardType) {
      newErrors.awardType =
        "Please select an award type.";
    }

    if (
      formData.awardType ===
        "Other" &&
      !formData.otherAwardType.trim()
    ) {
      newErrors.otherAwardType =
        "Please specify the award type.";
    }

    if (
      !formData.awardingOrganization.trim()
    ) {
      newErrors.awardingOrganization =
        "Awarding organization is required.";
    }

    if (!formData.awardLevel) {
      newErrors.awardLevel =
        "Please select the award level.";
    }

    if (!formData.awardDate) {
      newErrors.awardDate =
        "Award date is required.";
    }

    if (
      !formData.recipientName.trim()
    ) {
      newErrors.recipientName =
        "Recipient name is required.";
    }

    if (
      !formData.awardDescription.trim()
    ) {
      newErrors.awardDescription =
        "Please provide a brief description of the award.";
    }

    if (
      formData.incentiveAmount ===
        "" ||
      Number(
        formData.incentiveAmount
      ) < 0
    ) {
      newErrors.incentiveAmount =
        "Please enter a valid incentive amount.";
    }

    if (
      !documents.awardCertificate &&
      !hasUsableExistingDocument(
        "awardCertificate"
      )
    ) {
      newErrors.awardCertificate =
        "Award certificate is required.";
    }

    if (
      !documents.awardLetter &&
      !hasUsableExistingDocument(
        "awardLetter"
      )
    ) {
      newErrors.awardLetter =
        "Award letter or official communication is required.";
    }

    if (!declarationAccepted) {
      newErrors.declaration =
        "You must accept the declaration before submitting.";
    }

    coRecipients.forEach(
      (recipient, index) => {
        if (
          !recipient.name.trim()
        ) {
          newErrors[
            `coRecipient-${recipient.id}`
          ] =
            `Please enter the name of co-recipient ${
              index + 1
            }.`;
        }
      }
    );

    setErrors(newErrors);

    return (
      Object.keys(
        newErrors
      ).length === 0
    );
  };

  /* ========================================================
     GET CLAIM ID FROM RESPONSE
  ======================================================== */

  const getClaimIdFromResponse = (
    result
  ) => {
    return (
      result?.data?.claim?._id ||
      result?.data?.claim?.id ||
      result?.data?._id ||
      result?.data?.id ||
      null
    );
  };

  /* ========================================================
     SAVE CLAIM TO BACKEND
  ======================================================== */

  const saveClaim = async () => {
    const token =
      localStorage.getItem(
        "rimsToken"
      );

    if (!token) {
      navigate("/");
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const payload = {
      claimType:
        "RESEARCH_AWARD",

      financialYear:
        formData.financialYear,

      incentiveAmount:
        Number(
          formData.incentiveAmount || 0
        ),

      declarationAccepted:
        declarationAccepted,

      formData: {
        ...formData,
        coRecipients,
      },
    };

    const isExistingClaim =
      Boolean(claimId);

    const response =
      await fetch(
        isExistingClaim
          ? `${API_BASE_URL}/api/claims/${claimId}`
          : `${API_BASE_URL}/api/claims`,
        {
          method:
            isExistingClaim
              ? "PATCH"
              : "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

    if (response.status === 401) {
      localStorage.removeItem(
        "rimsToken"
      );

      localStorage.removeItem(
        "rimsUser"
      );

      navigate("/");

      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to save the research award claim."
      );
    }

    const returnedClaimId =
      getClaimIdFromResponse(
        result
      );

    if (!returnedClaimId) {
      throw new Error(
        "The claim was saved, but no claim ID was returned by the server."
      );
    }

    setClaimId(
      returnedClaimId
    );

    return returnedClaimId;
  };

  /* ========================================================
     UPLOAD SELECTED DOCUMENTS
  ======================================================== */

  const uploadSelectedDocuments =
    async (savedClaimId) => {
      const token =
        localStorage.getItem(
          "rimsToken"
        );

      if (!token) {
        navigate("/");
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const documentEntries =
        Object.entries(
          documents
        ).filter(
          ([, file]) =>
            Boolean(file)
        );

      const uploadedDocuments =
        {};

      for (
        const [
          documentName,
          file,
        ] of documentEntries
      ) {
        const formDataToUpload =
          new FormData();

        formDataToUpload.append(
          "claimId",
          savedClaimId
        );

        formDataToUpload.append(
          "documentType",
          DOCUMENT_TYPES[
            documentName
          ]
        );

        formDataToUpload.append(
          "document",
          file
        );

        const response =
          await fetch(
            `${API_BASE_URL}/api/documents/`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body:
                formDataToUpload,
            }
          );

        if (
          response.status === 401
        ) {
          localStorage.removeItem(
            "rimsToken"
          );

          localStorage.removeItem(
            "rimsUser"
          );

          navigate("/");

          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              `Unable to upload ${DOCUMENT_TYPES[documentName]}.`
          );
        }

        const uploadedDocument =
          result?.data?.document;

        if (
          uploadedDocument
        ) {
          uploadedDocuments[
            documentName
          ] = uploadedDocument;
        }
      }

      if (
        Object.keys(
          uploadedDocuments
        ).length > 0
      ) {
        setExistingDocuments(
          (previous) => ({
            ...previous,
            ...uploadedDocuments,
          })
        );

        setDocuments(
          (previous) => {
            const updated = {
              ...previous,
            };

            Object.keys(
              uploadedDocuments
            ).forEach(
              (documentName) => {
                updated[
                  documentName
                ] = null;
              }
            );

            return updated;
          }
        );
      }

      return uploadedDocuments;
    };

  /* ========================================================
     SAVE DRAFT
  ======================================================== */

  const handleSaveDraft = async () => {
    if (
      isSaving ||
      isSubmitting
    ) {
      return;
    }

    setSavedMessage("");
    setErrors({});

    setIsSaving(true);

    try {
      const savedClaimId =
        await saveClaim();

      let uploadedCount = 0;

      const selectedDocuments =
        Object.values(
          documents
        ).filter(Boolean).length;

      if (
        selectedDocuments > 0
      ) {
        const uploaded =
          await uploadSelectedDocuments(
            savedClaimId
          );

        uploadedCount =
          Object.keys(uploaded)
            .length;
      }

      if (
        uploadedCount > 0
      ) {
        setSavedMessage(
          "Draft saved and documents uploaded successfully."
        );
      } else {
        setSavedMessage(
          isEditingDraft ||
            claimId
            ? "Draft updated successfully."
            : "Draft saved successfully."
        );
      }
    } catch (error) {
      console.error(
        "Save research award draft error:",
        error
      );

      setSavedMessage(
        error.message ||
          "Unable to save the draft."
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ========================================================
     SUBMIT
  ======================================================== */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      isSaving ||
      isSubmitting
    ) {
      return;
    }

    setSavedMessage("");

    const isValid =
      validateForm();

    if (!isValid) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const savedClaimId =
        await saveClaim();

      await uploadSelectedDocuments(
        savedClaimId
      );

      const token =
        localStorage.getItem(
          "rimsToken"
        );

      if (!token) {
        navigate("/");
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const submitResponse =
        await fetch(
          `${API_BASE_URL}/api/claims/${savedClaimId}/submit`,
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
        localStorage.removeItem(
          "rimsToken"
        );

        localStorage.removeItem(
          "rimsUser"
        );

        navigate("/");

        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const submitResult =
        await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(
          submitResult?.message ||
            "Unable to submit the research award claim."
        );
      }

      setSavedMessage(
        "Research award claim submitted successfully."
      );

      setTimeout(() => {
        navigate("/claims");
      }, 900);
    } catch (error) {
      console.error(
        "Submit research award error:",
        error
      );

      setSavedMessage(
        error.message ||
          "Unable to submit the research award claim."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ========================================================
     RENDER
  ======================================================== */

  return (
    <div className="research-award-page">

      {/* ==================================================
          PAGE HEADER
      ================================================== */}

      <section className="research-award-header">

        <button
          type="button"
          className="research-award-back"
          onClick={() =>
            navigate("/claims")
          }
        >
          <ArrowLeft size={16} />

          <span>
            Back to Claims
          </span>
        </button>

        <div className="research-award-heading">

          <span className="research-award-eyebrow">
            INCENTIVE CATEGORY
          </span>

          <h1 className="research-award-page-title">
            {isEditingDraft
              ? "Edit Research Award Claim"
              : "New Research Award Claim"}
          </h1>

          <p className="research-award-page-description">
            Submit details of a research or academic
            award received by faculty.
          </p>

        </div>

      </section>

      {/* ==================================================
          SUCCESS / ERROR MESSAGE
      ================================================== */}

      {savedMessage && (
        <div className="research-award-message">

          <CheckCircle2 size={16} />

          <span>
            {savedMessage}
          </span>

        </div>
      )}

      {errors.documents && (
        <div className="research-award-message">
          <FileText size={16} />
          <span>
            {errors.documents}
          </span>
        </div>
      )}

      <form
        className="research-award-form"
        onSubmit={handleSubmit}
        noValidate
      >

        {/* ==================================================
            AWARD INFORMATION
        ================================================== */}

        <section className="research-award-card">

          <SectionHeader
            icon={<Award size={18} />}
            title="Award Information"
            description="Provide the details of the research or academic award."
          />

          <div className="research-award-form-body">

            <div className="research-award-form-grid">

              <Field
                full
                label="Award Title"
                required
                error={
                  errors.awardTitle
                }
              >
                <input
                  id="awardTitle"
                  name="awardTitle"
                  type="text"
                  value={
                    formData.awardTitle
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter the title of the award"
                />
              </Field>

              <Field
                label="Award Type"
                required
                error={
                  errors.awardType
                }
              >
                <select
                  id="awardType"
                  name="awardType"
                  value={
                    formData.awardType
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="">
                    Select award type
                  </option>

                  {AWARD_TYPES.map(
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
              </Field>

              {formData.awardType ===
                "Other" && (
                <Field
                  label="Specify Award Type"
                  required
                  error={
                    errors.otherAwardType
                  }
                >
                  <input
                    id="otherAwardType"
                    name="otherAwardType"
                    type="text"
                    value={
                      formData.otherAwardType
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter award type"
                  />
                </Field>
              )}

              <Field
                label="Awarding Organization"
                required
                error={
                  errors.awardingOrganization
                }
              >
                <input
                  id="awardingOrganization"
                  name="awardingOrganization"
                  type="text"
                  value={
                    formData.awardingOrganization
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter organization name"
                />
              </Field>

              <Field
                label="Award Level"
                required
                error={
                  errors.awardLevel
                }
              >
                <select
                  id="awardLevel"
                  name="awardLevel"
                  value={
                    formData.awardLevel
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="">
                    Select award level
                  </option>

                  {AWARD_LEVELS.map(
                    (level) => (
                      <option
                        key={level}
                        value={level}
                      >
                        {level}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Award Date"
                required
                error={
                  errors.awardDate
                }
              >
                <input
                  id="awardDate"
                  name="awardDate"
                  type="date"
                  value={
                    formData.awardDate
                  }
                  onChange={
                    handleChange
                  }
                />
              </Field>

              <Field
                label="Financial Year"
                required
              >
                <select
                  id="financialYear"
                  name="financialYear"
                  value={
                    formData.financialYear
                  }
                  onChange={
                    handleChange
                  }
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
              </Field>

              <Field
                full
                label="Award Description"
                required
                error={
                  errors.awardDescription
                }
              >
                <textarea
                  id="awardDescription"
                  name="awardDescription"
                  rows="4"
                  value={
                    formData.awardDescription
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Briefly describe the award, achievement and recognition received"
                />
              </Field>

            </div>

          </div>

        </section>

        {/* ==================================================
            RECIPIENT INFORMATION
        ================================================== */}

        <section className="research-award-card">

          <SectionHeader
            icon={<FileText size={18} />}
            title="Recipient Information"
            description="Enter the faculty member associated with the award."
          />

          <div className="research-award-form-body">

            <div className="research-award-form-grid">

              <Field
                label="Recipient Name"
                required
                error={
                  errors.recipientName
                }
              >
                <input
                  id="recipientName"
                  name="recipientName"
                  type="text"
                  value={
                    formData.recipientName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter faculty name"
                />
              </Field>

              <Field
                label="Faculty Role"
                required
              >
                <select
                  id="facultyRole"
                  name="facultyRole"
                  value={
                    formData.facultyRole
                  }
                  onChange={
                    handleChange
                  }
                >
                  {FACULTY_ROLES.map(
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
              </Field>

            </div>

            <div className="research-award-subsection">

              <div className="research-award-subsection-header">

                <div>
                  <h3>
                    Co-Recipients
                  </h3>

                  <p>
                    Add other faculty members
                    who received the award.
                  </p>
                </div>

                <button
                  type="button"
                  className="research-award-add-button"
                  onClick={
                    addCoRecipient
                  }
                >
                  <Plus size={15} />
                  Add Co-Recipient
                </button>

              </div>

              {coRecipients.length ===
              0 ? (
                <div className="research-award-empty-inline">

                  <FileText size={17} />

                  <span>
                    No Co-Recipients added.
                  </span>

                </div>
              ) : (
                <div className="research-award-co-list">

                  {coRecipients.map(
                    (
                      recipient,
                      index
                    ) => (
                      <div
                        className="research-award-co-row"
                        key={
                          recipient.id
                        }
                      >

                        <span className="research-award-co-number">
                          {index + 1}
                        </span>

                        <div className="research-award-co-fields">

                          <div className="research-award-field">

                            <label>
                              Name
                              <span>
                                *
                              </span>
                            </label>

                            <input
                              type="text"
                              value={
                                recipient.name
                              }
                              onChange={(
                                event
                              ) =>
                                updateCoRecipient(
                                  recipient.id,
                                  "name",
                                  event.target.value
                                )
                              }
                              placeholder="Co-recipient name"
                            />

                          </div>

                          <div className="research-award-field">

                            <label>
                              Affiliation
                            </label>

                            <input
                              type="text"
                              value={
                                recipient.affiliation
                              }
                              onChange={(
                                event
                              ) =>
                                updateCoRecipient(
                                  recipient.id,
                                  "affiliation",
                                  event.target.value
                                )
                              }
                              placeholder="Department / Institution"
                            />

                          </div>

                        </div>

                        <button
                          type="button"
                          className="research-award-remove-button"
                          onClick={() =>
                            removeCoRecipient(
                              recipient.id
                            )
                          }
                          aria-label="Remove co-recipient"
                          title="Remove Co-Recipient"
                        >
                          <Trash2 size={15} />
                        </button>

                        {errors[
                          `coRecipient-${recipient.id}`
                        ] && (
                          <p className="research-award-error research-award-co-error">
                            {
                              errors[
                                `coRecipient-${recipient.id}`
                              ]
                            }
                          </p>
                        )}

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </div>

        </section>

        {/* ==================================================
            INCENTIVE INFORMATION
        ================================================== */}

        <section className="research-award-card">

          <SectionHeader
            icon={<IndianRupee size={18} />}
            title="Incentive Information"
            description="Enter the incentive amount associated with this claim."
          />

          <div className="research-award-form-body">

            <div className="research-award-form-grid">

              <Field
                label="Claimed Incentive Amount"
                required
                error={
                  errors.incentiveAmount
                }
                hint="The final eligible amount will be verified during claim review."
              >

                <div className="research-award-input-prefix">

                  <span>
                    ₹
                  </span>

                  <input
                    id="incentiveAmount"
                    name="incentiveAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      formData.incentiveAmount
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0.00"
                  />

                </div>

              </Field>

            </div>

          </div>

        </section>

        {/* ==================================================
            SUPPORTING DOCUMENTS
        ================================================== */}

        <section className="research-award-card">

          <SectionHeader
            icon={<FileCheck2 size={18} />}
            title="Supporting Documents"
            description="Attach the documents required to support the Research Award incentive claim."
          />

          <div className="research-award-form-body">

            <div className="research-award-document-list">

              <DocumentUpload
                label="Award Certificate"
                description="Official certificate or recognition document."
                documentName="awardCertificate"
                required
                selectedFile={
                  documents.awardCertificate
                }
                existingDocument={
                  existingDocuments.awardCertificate
                }
                error={
                  errors.awardCertificate
                }
                onFileChange={
                  handleFileChange
                }
                loading={
                  documentsLoading
                }
              />

              <DocumentUpload
                label="Award Letter"
                description="Official award letter or communication."
                documentName="awardLetter"
                required
                selectedFile={
                  documents.awardLetter
                }
                existingDocument={
                  existingDocuments.awardLetter
                }
                error={
                  errors.awardLetter
                }
                onFileChange={
                  handleFileChange
                }
                loading={
                  documentsLoading
                }
              />

              <DocumentUpload
                label="Supporting Evidence"
                description="Additional evidence related to the award."
                documentName="supportingEvidence"
                selectedFile={
                  documents.supportingEvidence
                }
                existingDocument={
                  existingDocuments.supportingEvidence
                }
                error={
                  errors.supportingEvidence
                }
                onFileChange={
                  handleFileChange
                }
                loading={
                  documentsLoading
                }
              />

            </div>

            <div className="research-award-document-note">

              <FileText size={17} />

              <p>
                Accepted formats: PDF, JPG,
                JPEG, and PNG. Maximum file size
                10 MB per document.
              </p>

            </div>

          </div>

        </section>

        {/* ==================================================
            DECLARATION
        ================================================== */}

        <section className="research-award-card">

          <SectionHeader
            icon={<CheckCircle2 size={18} />}
            title="Declaration"
            description="Confirm the accuracy of the information and documents submitted."
          />

          <div className="research-award-declaration">

            <div className="research-award-checkbox-wrapper">

              <input
                id="declarationAccepted"
                type="checkbox"
                checked={
                  declarationAccepted
                }
                onChange={(
                  event
                ) => {
                  setDeclarationAccepted(
                    event.target
                      .checked
                  );

                  setErrors(
                    (previous) => ({
                      ...previous,
                      declaration:
                        "",
                    })
                  );
                }}
              />

              <label htmlFor="declarationAccepted">

                I declare that the information
                provided in this claim is true
                and accurate to the best of my
                knowledge. I understand that the
                submitted documents may be
                verified during the review process.

              </label>

            </div>

            {errors.declaration && (
              <p className="research-award-error">
                {
                  errors.declaration
                }
              </p>
            )}

          </div>

        </section>

        {/* ==================================================
            SUBMISSION
        ================================================== */}

        <section className="research-award-submission-card">

          <div className="research-award-submission-content">

            <div>

              <span className="research-award-eyebrow">
                CLAIM SUBMISSION
              </span>

              <h2>
                Ready to submit?
              </h2>

              <p>
                Save your work as a draft or
                submit the completed claim for
                institutional verification.
              </p>

            </div>

            <div className="research-award-submission-meta">

              <span>
                Policy
              </span>

              <strong>
                R1.0
              </strong>

            </div>

          </div>

          <div className="research-award-actions">

            <button
              type="button"
              className="research-award-secondary-button"
              onClick={
                handleSaveDraft
              }
              disabled={
                isSaving ||
                isSubmitting
              }
            >
              <Save size={16} />

              {isSaving
                ? "Saving..."
                : "Save as Draft"}
            </button>

            <button
              type="submit"
              className="research-award-primary-button"
              disabled={
                isSaving ||
                isSubmitting
              }
            >
              <FileCheck2 size={16} />

              {isSubmitting
                ? "Submitting..."
                : "Submit Claim"}
            </button>

          </div>

        </section>

      </form>
    </div>
  );
}


/* ============================================================
   SECTION HEADER
   ============================================================ */

function SectionHeader({
  icon,
  title,
  description,
}) {
  return (
    <div className="research-award-section-header">

      <div className="research-award-section-icon">
        {icon}
      </div>

      <div>

        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}


/* ============================================================
   FIELD
   ============================================================ */

function Field({
  label,
  required = false,
  hint,
  full = false,
  error,
  children,
}) {
  return (
    <div
      className={`research-award-field ${
        full
          ? "research-award-field-full"
          : ""
      }`}
    >

      <label>

        {label}

        {required && (
          <span>*</span>
        )}

      </label>

      {children}

      {hint && (
        <small>
          {hint}
        </small>
      )}

      {error && (
        <p className="research-award-error">
          {error}
        </p>
      )}

    </div>
  );
}


/* ============================================================
   DOCUMENT UPLOAD
   ============================================================ */

function DocumentUpload({
  label,
  description,
  documentName,
  required = false,
  selectedFile,
  existingDocument,
  error,
  onFileChange,
  loading,
}) {
  const existingIsUsable =
    existingDocument &&
    existingDocument.status !==
      "REJECTED";

  return (
    <div className="research-award-document-item">

      <div className="research-award-document-info">

        <div className="research-award-document-icon">
          <FileText size={18} />
        </div>

        <div>

          <h3>
            {label}

            {required && (
              <span>*</span>
            )}
          </h3>

          <p>
            {description}
          </p>

          {selectedFile && (
            <div className="research-award-selected-file">
              <FileCheck2 size={14} />

              <span>
                {selectedFile.name}
              </span>
            </div>
          )}

          {!selectedFile &&
            existingIsUsable && (
              <div className="research-award-selected-file">
                <FileCheck2 size={14} />

                <span>
                  Uploaded:{" "}
                  {
                    existingDocument.originalName
                  }
                </span>
              </div>
            )}

          {!selectedFile &&
            existingDocument &&
            existingDocument.status ===
              "REJECTED" && (
              <div className="research-award-selected-file">
                <FileText size={14} />

                <span>
                  Previous document was rejected.
                  Please upload a replacement.
                </span>
              </div>
            )}

          {loading && (
            <small>
              Checking uploaded documents...
            </small>
          )}

        </div>

      </div>

      <div className="research-award-document-action">

        <label
          className="research-award-upload-button"
        >
          <Upload size={15} />

          <span>
            {selectedFile
              ? "Change File"
              : existingIsUsable
              ? "Replace File"
              : "Choose File"}
          </span>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) =>
              onFileChange(
                event,
                documentName
              )
            }
          />
        </label>

      </div>

      {error && (
        <p className="research-award-error research-award-document-error">
          {error}
        </p>
      )}

    </div>
  );
}

export default ResearchAward;