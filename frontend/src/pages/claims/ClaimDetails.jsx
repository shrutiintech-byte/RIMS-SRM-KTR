import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import "./ClaimDetails.css";

const API_BASE_URL = "http://localhost:5000";

const claimTypeLabels = {
  RESEARCH_PROJECT: "Research Project",
  PATENT: "Patent",
  JOURNAL_PUBLICATION: "Journal Publication",
  RESEARCH_AWARD: "Research Award",
  UNDERGRADUATE_RESEARCH: "Undergraduate Research",
  POSTGRADUATE_RESEARCH: "Postgraduate Research",
  BOOK_CHAPTER: "Book / Book Chapter",
  CONFERENCE_PROCEEDINGS: "Conference Proceedings",
  PHD_SUPERVISION: "PhD Supervision",
  E_CONTENT: "E-Content",
  PROFESSIONAL_DEVELOPMENT: "Professional Development",
};

const claimEditRoutes = {
  RESEARCH_PROJECT: "/incentive/research-project",
  PATENT: "/incentive/patent",
  JOURNAL_PUBLICATION: "/incentive/journal-publication",
  RESEARCH_AWARD: "/incentive/research-award",
  UNDERGRADUATE_RESEARCH: "/incentive/undergraduate-research",
  POSTGRADUATE_RESEARCH: "/incentive/postgraduate-research",
  BOOK_CHAPTER: "/incentive/book-chapter",
  CONFERENCE_PROCEEDINGS: "/incentive/conference-proceedings",
  PHD_SUPERVISION: "/incentive/phd-supervision",
  E_CONTENT: "/incentive/e-content",
  PROFESSIONAL_DEVELOPMENT: "/incentive/professional-development",
};

const statusLabels = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  RETURNED: "Clarification Required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const workflowSteps = [
  {
    key: "DRAFT",
    title: "Draft",
    description: "Claim preparation",
  },
  {
    key: "SUBMITTED",
    title: "Submitted",
    description: "Claim submitted for review",
  },
  {
    key: "UNDER_REVIEW",
    title: "HOD Review",
    description: "Departmental scrutiny",
  },
  {
    key: "DOCUMENT_VERIFICATION",
    title: "Document Verification",
    description: "Supporting documents reviewed",
  },
  {
    key: "COMMITTEE_REVIEW",
    title: "Committee Review",
    description: "Incentive committee assessment",
  },
  {
    key: "CALCULATION_VERIFICATION",
    title: "Calculation Verification",
    description: "Incentive amount verification",
  },
  {
    key: "APPROVED",
    title: "Approved",
    description: "Claim approved",
  },
  {
    key: "FINANCE_PROCESSING",
    title: "Finance Processing",
    description: "Incentive processing",
  },
  {
    key: "CREDITED",
    title: "Credited",
    description: "Incentive credited",
  },
];

const formatDate = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAmount = (amount) => {
  const numericAmount = Number(amount || 0);

  return `₹${numericAmount.toLocaleString("en-IN")}`;
};

const getClaimTitle = (claim) => {
  const formData = claim?.formData || {};

  return (
    formData.title ||
    formData.projectTitle ||
    formData.patentTitle ||
    formData.paperTitle ||
    formData.publicationTitle ||
    formData.bookTitle ||
    formData.chapterTitle ||
    formData.awardTitle ||
    formData.conferenceTitle ||
    "Incentive Claim"
  );
};

const getDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const getCurrentWorkflowIndex = (status) => {
  switch (status) {
    case "DRAFT":
      return 0;

    case "SUBMITTED":
      return 1;

    case "UNDER_REVIEW":
      return 2;

    case "APPROVED":
      return 6;

    case "RETURNED":
    case "REJECTED":
      return 2;

    default:
      return 0;
  }
};

function ClaimDetails() {
  const navigate = useNavigate();
  const { claimId } = useParams();

  const [claim, setClaim] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [error, setError] = useState("");
  const [documentsError, setDocumentsError] = useState("");

  useEffect(() => {
    const fetchClaimDetails = async () => {
      const token = localStorage.getItem("rimsToken");

      if (!token) {
        navigate("/");
        return;
      }

      if (!claimId) {
        setError("Claim reference is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/claims/${claimId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("rimsToken");
          localStorage.removeItem("rimsUser");
          navigate("/");
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to retrieve claim details"
          );
        }

        const receivedClaim = result?.data?.claim || result?.data;

        if (!receivedClaim) {
          throw new Error("Claim details were not found.");
        }

        setClaim(receivedClaim);
      } catch (fetchError) {
        console.error("Fetch claim details error:", fetchError);

        setError(
          fetchError.message || "Unable to load claim details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClaimDetails();
  }, [claimId, navigate]);

  useEffect(() => {
    const fetchDocuments = async () => {
      const token = localStorage.getItem("rimsToken");

      if (!token) {
        setDocumentsLoading(false);
        return;
      }

      try {
        setDocumentsLoading(true);
        setDocumentsError("");

        const response = await fetch(
          `${API_BASE_URL}/api/documents`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("rimsToken");
          localStorage.removeItem("rimsUser");
          navigate("/");
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to retrieve documents"
          );
        }

        const receivedDocuments = result?.data?.documents || [];

        const claimDocuments = receivedDocuments.filter(
          (document) => {
            const documentClaimId =
              document.claim?._id || document.claim;

            return String(documentClaimId) === String(claimId);
          }
        );

        setDocuments(claimDocuments);
      } catch (fetchError) {
        console.error("Fetch claim documents error:", fetchError);

        setDocumentsError(
          fetchError.message || "Unable to load claim documents."
        );
      } finally {
        setDocumentsLoading(false);
      }
    };

    if (claimId) {
      fetchDocuments();
    }
  }, [claimId, navigate]);

  const claimCategory = useMemo(
    () =>
      claimTypeLabels[claim?.claimType] ||
      claim?.claimType ||
      "-",
    [claim]
  );

  const claimStatus = useMemo(
    () =>
      statusLabels[claim?.status] ||
      claim?.status ||
      "-",
    [claim]
  );

  const currentWorkflowIndex = useMemo(
    () => getCurrentWorkflowIndex(claim?.status),
    [claim]
  );

  const formEntries = useMemo(() => {
    if (!claim?.formData) return [];

    return Object.entries(claim.formData).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== ""
    );
  }, [claim]);

  const handleBack = () => {
    navigate("/claims");
  };

  // Edit is available only for claims returned by the administrator.
  const handleEditClaim = () => {
    if (claim?.status !== "RETURNED") {
      return;
    }

    const editRoute = claimEditRoutes[claim.claimType];

    if (!editRoute) {
      alert(
        "The edit form for this claim type is not available."
      );
      return;
    }

    navigate(editRoute, {
      state: {
        draftClaim: claim,
        isEditingDraft: true,
        isEditingReturnedClaim: true,
      },
    });
  };

  /*
   * Documents API requires Authorization header.
   * Fetch the file with JWT and open it as a Blob.
   */
  const handleViewDocument = async (documentId) => {
    const token = localStorage.getItem("rimsToken");

    if (!token) {
      navigate("/");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${documentId}/file`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("rimsToken");
        localStorage.removeItem("rimsUser");
        navigate("/");
        return;
      }

      if (!response.ok) {
        const result = await response.json().catch(() => null);

        throw new Error(
          result?.message || "Unable to open this document."
        );
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, "_blank", "noopener,noreferrer");

      window.setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    } catch (documentError) {
      console.error("View document error:", documentError);

      alert(
        documentError.message || "Unable to open this document."
      );
    }
  };

  if (loading) {
    return (
      <div className="rims-page claim-details-page">
        <button
          type="button"
          className="claim-details-back"
          onClick={handleBack}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <section className="claim-details-header">
          <div className="claim-details-heading">
            <span className="page-eyebrow">CLAIM DETAILS</span>
            <h1 className="page-title">Loading Claim</h1>
            <p className="page-description">
              Please wait while we retrieve the claim information.
            </p>
          </div>
        </section>

        <section className="rims-card claim-information-card">
          <div className="claim-information-empty">
            <Clock3 size={22} strokeWidth={1.8} />
            <strong>Loading claim details...</strong>
            <span>Retrieving your claim from the system.</span>
          </div>
        </section>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="rims-page claim-details-page">
        <button
          type="button"
          className="claim-details-back"
          onClick={handleBack}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <section className="claim-details-header">
          <div className="claim-details-heading">
            <span className="page-eyebrow">CLAIM DETAILS</span>
            <h1 className="page-title">Claim Not Available</h1>
            <p className="page-description">
              {error ||
                "The requested claim could not be found."}
            </p>
          </div>
        </section>

        <section className="rims-card claim-information-card">
          <div className="claim-information-empty">
            <FileText size={22} strokeWidth={1.8} />
            <strong>Unable to display this claim</strong>
            <span>
              The claim may no longer exist or you may not have
              access to it.
            </span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="rims-page claim-details-page">
      {/* BACK NAVIGATION */}
      <button
        type="button"
        className="claim-details-back"
        onClick={handleBack}
      >
        <ArrowLeft size={16} />
        <span>Back to Claims</span>
      </button>

      {/* CLAIM HEADER */}
      <section className="claim-details-header">
        <div className="claim-details-heading">
          <span className="page-eyebrow">CLAIM DETAILS</span>

          <h1 className="page-title">
            {getClaimTitle(claim)}
          </h1>

          <p className="page-description">
            Review claim information, workflow progress, eligibility,
            and submitted documents.
          </p>
        </div>
      </section>

      {/* EDIT RETURNED CLAIM */}
      {claim.status === "RETURNED" && (
        <section className="claim-details-edit-section">
          <div className="claim-details-edit-message">
            <strong>Corrections required</strong>
            <p>
              Your claim has been returned by the administrator.
              Review the comments below, correct the information,
              and resubmit your claim.
            </p>
          </div>

          <button
            type="button"
            className="claim-details-edit"
            onClick={handleEditClaim}
          >
            <Pencil size={16} />
            <span>Edit Claim</span>
          </button>
        </section>
      )}

      {/* CLAIM SUMMARY */}
      <section
        className="claim-summary-grid"
        aria-label="Claim summary"
      >
        <article className="rims-card claim-summary-card">
          <span className="claim-summary-label">
            Claim Reference
          </span>
          <strong className="claim-summary-value">
            {claim._id}
          </strong>
        </article>

        <article className="rims-card claim-summary-card">
          <span className="claim-summary-label">Category</span>
          <strong className="claim-summary-value">
            {claimCategory}
          </strong>
        </article>

        <article className="rims-card claim-summary-card">
          <span className="claim-summary-label">Status</span>

          <span className="claim-status-placeholder">
            {claim.status === "APPROVED" ? (
              <CheckCircle2 size={14} strokeWidth={1.9} />
            ) : (
              <Clock3 size={14} strokeWidth={1.9} />
            )}

            <span>{claimStatus}</span>
          </span>
        </article>

        <article className="rims-card claim-summary-card">
          <span className="claim-summary-label">
            Eligible Incentive
          </span>
          <strong className="claim-summary-value">
            {formatAmount(claim.incentiveAmount)}
          </strong>
        </article>
      </section>

      {/* CLAIM OVERVIEW */}
      <section className="rims-card claim-information-card">
        <div className="claim-section-header">
          <div className="claim-section-icon">
            <FileText size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2>Claim Overview</h2>
            <p>Key information about this claim.</p>
          </div>
        </div>

        <div className="claim-information-grid">
          <div>
            <span>Financial Year</span>
            <strong>{claim.financialYear || "-"}</strong>
          </div>

          <div>
            <span>Created On</span>
            <strong>{formatDate(claim.createdAt)}</strong>
          </div>

          <div>
            <span>Last Updated</span>
            <strong>{formatDateTime(claim.updatedAt)}</strong>
          </div>

          <div>
            <span>Submitted On</span>
            <strong>{formatDateTime(claim.submittedAt)}</strong>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="rims-card claim-workflow-card">
        <div className="claim-section-header">
          <div className="claim-section-icon">
            <Clock3 size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2>Workflow Progress</h2>
            <p>
              Track your claim through the incentive review process.
            </p>
          </div>
        </div>

        <div
          className="claim-workflow"
          aria-label="Claim workflow"
        >
          {workflowSteps.map((step, index) => {
            const isCompleted = index < currentWorkflowIndex;
            const isActive = index === currentWorkflowIndex;

            return (
              <div
                key={step.key}
                className={`claim-workflow-step ${
                  isCompleted || isActive ? "active" : ""
                }`}
              >
                <div className="claim-workflow-marker">
                  {isCompleted || isActive ? (
                    <CheckCircle2 size={16} strokeWidth={2} />
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="claim-workflow-content">
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </div>

                {index < workflowSteps.length - 1 && (
                  <div
                    className={`claim-workflow-line ${
                      isCompleted ? "active" : ""
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CLAIM INFORMATION + DOCUMENTS */}
      <div className="claim-details-content-grid">
        {/* CLAIM INFORMATION */}
        <section className="rims-card claim-information-card">
          <div className="claim-section-header">
            <div className="claim-section-icon">
              <FileText size={17} strokeWidth={1.9} />
            </div>

            <div>
              <h2>Claim Information</h2>
              <p>Details submitted for this incentive claim.</p>
            </div>
          </div>

          {formEntries.length > 0 ? (
            <div className="claim-information-list">
              {formEntries.map(([key, value]) => (
                <div
                  className="claim-information-row"
                  key={key}
                >
                  <span>
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (letter) =>
                        letter.toUpperCase()
                      )}
                  </span>

                  <strong>{getDisplayValue(value)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="claim-information-empty">
              <FileText size={22} strokeWidth={1.8} />
              <strong>No claim information available</strong>
              <span>
                No additional claim information has been submitted.
              </span>
            </div>
          )}
        </section>

        {/* DOCUMENTS */}
        <section className="rims-card claim-documents-card">
          <div className="claim-section-header">
            <div className="claim-section-icon">
              <FileCheck2 size={17} strokeWidth={1.9} />
            </div>

            <div>
              <h2>Documents &amp; Verification</h2>
              <p>
                Supporting documents submitted with this claim.
              </p>
            </div>
          </div>

          {documentsLoading ? (
            <div className="claim-information-empty">
              <Clock3 size={22} strokeWidth={1.8} />
              <strong>Loading documents...</strong>
              <span>Retrieving submitted documents.</span>
            </div>
          ) : documentsError ? (
            <div className="claim-information-empty">
              <FileCheck2 size={22} strokeWidth={1.8} />
              <strong>Unable to load documents</strong>
              <span>{documentsError}</span>
            </div>
          ) : documents.length > 0 ? (
            <div className="claim-documents-list">
              {documents.map((document) => (
                <div
                  className="claim-document-item"
                  key={document._id}
                >
                  <div className="claim-document-icon">
                    <FileText size={18} strokeWidth={1.8} />
                  </div>

                  <div className="claim-document-info">
                    <strong>
                      {document.originalName ||
                        document.storedName ||
                        "Document"}
                    </strong>

                    <span>
                      {document.documentType ||
                        "Supporting Document"}
                    </span>

                    <small>
                      Uploaded {formatDateTime(document.createdAt)}
                    </small>

                    {document.status === "REJECTED" && (
                      <small className="claim-document-rejection">
                        Rejected
                        {document.reviewComment
                          ? `: ${document.reviewComment}`
                          : ""}
                      </small>
                    )}

                    {document.status === "VERIFIED" && (
                      <small>Verified</small>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleViewDocument(document._id)
                    }
                    className="claim-document-view"
                  >
                    <ExternalLink size={14} />
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="claim-information-empty">
              <FileCheck2 size={22} strokeWidth={1.8} />
              <strong>No documents available</strong>
              <span>
                No supporting documents have been uploaded for this
                claim.
              </span>
            </div>
          )}
        </section>
      </div>

      {/* REVIEW INFORMATION */}
      {(claim.reviewComment || claim.reviewedAt) && (
        <section className="rims-card claim-information-card">
          <div className="claim-section-header">
            <div className="claim-section-icon">
              <FileCheck2 size={17} strokeWidth={1.9} />
            </div>

            <div>
              <h2>Review Information</h2>
              <p>
                Information recorded during claim review.
              </p>
            </div>
          </div>

          <div className="claim-information-grid">
            <div>
              <span>Reviewed On</span>
              <strong>
                {formatDateTime(claim.reviewedAt)}
              </strong>
            </div>

            <div>
              <span>Review Comment</span>
              <strong>
                {claim.reviewComment || "-"}
              </strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ClaimDetails;