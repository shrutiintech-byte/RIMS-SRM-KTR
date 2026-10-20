
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  ShieldCheck,
  AlertCircle,
  Filter,
} from "lucide-react";

import { adminApi } from "../../services/adminApi";
import "./ClaimsManagement.css";

const PAGE_SIZE = 10;

const STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RETURNED",
];

const CLAIM_TYPES = [
  "RESEARCH_PROJECT",
  "PATENT",
  "JOURNAL_PUBLICATION",
  "RESEARCH_AWARD",
  "UNDERGRADUATE_RESEARCH",
  "POSTGRADUATE_RESEARCH",
  "BOOK_CHAPTER",
  "CONFERENCE_PROCEEDINGS",
  "PHD_SUPERVISION",
  "E_CONTENT",
  "PROFESSIONAL_DEVELOPMENT",
];

const FINANCIAL_YEARS = ["2026-27", "2025-26", "2024-25"];

function clearAdminSession() {
  localStorage.removeItem("rimsAdminToken");
  localStorage.removeItem("rimsAdminUser");
  sessionStorage.removeItem("rimsAdminToken");
  sessionStorage.removeItem("rimsAdminUser");
}

function isSessionError(error) {
  if (error?.status === 401 || error?.status === 403) return true;

  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("session has expired") ||
    message.includes("session is invalid") ||
    message.includes("not authorized") ||
    message.includes("unauthorized")
  );
}

function formatLabel(value = "") {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    return value.map(displayValue).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(
        ([key, item]) =>
          `${formatLabel(key)}: ${displayValue(item)}`
      )
      .join(" · ");
  }

  return String(value);
}

function claimTitle(claim) {
  const form = claim?.formData || {};

  const possibleTitles = [
    form.title,
    form.projectTitle,
    form.publicationTitle,
    form.journalTitle,
    form.patentTitle,
    form.awardTitle,
    form.bookTitle,
    form.conferenceTitle,
    form.researchTitle,
    form.name,
  ];

  return (
    possibleTitles.find(
      (value) => typeof value === "string" && value.trim()
    ) || formatLabel(claim?.claimType || "Research Claim")
  );
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

function ClaimsManagement({ onLogout }) {
  const [claims, setClaims] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [claimType, setClaimType] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [viewingDocumentId, setViewingDocumentId] = useState(null);
  const [documentError, setDocumentError] = useState("");

  const [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);

  const handleSessionExpiry = useCallback(() => {
    clearAdminSession();

    setClaims([]);
    setSelectedClaim(null);
    setDecision(null);
    setViewingDocumentId(null);

    setError(
      "Your admin session has expired or is no longer authorized. Please sign in again."
    );

    if (typeof onLogout === "function") onLogout();
  }, [onLogout]);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await adminApi.getClaims({
        page,
        limit: PAGE_SIZE,
        status,
        claimType,
        financialYear,
      });

      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error(
          result?.message || "Unexpected claims response."
        );
      }

      setClaims(result.data);

      setPagination(
        result.pagination || {
          page,
          limit: PAGE_SIZE,
          total: result.data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      );
    } catch (err) {
      console.error("Claims loading error:", err);

      if (isSessionError(err)) {
        handleSessionExpiry();
      } else {
        setError(
          getErrorMessage(
            err,
            "Unable to load claims. Check that the backend is running."
          )
        );
      }

      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    status,
    claimType,
    financialYear,
    handleSessionExpiry,
  ]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const openClaimDetails = async (claim) => {
    setSelectedClaim(claim);
    setDetailsLoading(true);
    setDetailsError("");
    setDocumentError("");

    try {
      const result = await adminApi.getClaim(claim._id);

      if (!result?.success || !result.data) {
        throw new Error(
          result?.message || "Unable to load claim details."
        );
      }

      setSelectedClaim(result.data);
    } catch (err) {
      if (isSessionError(err)) handleSessionExpiry();

      setDetailsError(
        getErrorMessage(err, "Unable to load claim details.")
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const viewDocument = async (claim, document) => {
    if (!claim?._id || !document?._id) {
      setDocumentError(
        "The claim or document ID is missing. Please reload the claim details."
      );
      return;
    }

    if (viewingDocumentId) return;

    setDocumentError("");

    const documentTab = window.open("about:blank", "_blank");

    if (!documentTab) {
      setDocumentError(
        "Your browser blocked the document tab. Allow pop-ups for this site and try again."
      );
      return;
    }

    setViewingDocumentId(document._id);

    try {
      const blob = await adminApi.getClaimDocumentFile(
        claim._id,
        document._id
      );

      const allowedInlineTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ];

      const responseType = String(blob.type || "")
        .split(";")[0]
        .trim()
        .toLowerCase();

      const safeBlob = allowedInlineTypes.includes(responseType)
        ? blob
        : new Blob([blob], {
            type: "application/octet-stream",
          });

      const objectUrl = URL.createObjectURL(safeBlob);
      documentTab.location.href = objectUrl;

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60000);
    } catch (err) {
      documentTab.close();

      if (isSessionError(err)) handleSessionExpiry();

      setDocumentError(
        getErrorMessage(
          err,
          "Unable to open this document. Please try again."
        )
      );
    } finally {
      setViewingDocumentId(null);
    }
  };

  function canProcess(claim) {
    return (
      claim != null &&
      ["SUBMITTED", "UNDER_REVIEW"].includes(claim.status)
    );
  }

  const startDecision = (claim, action) => {
    if (!claim || !canProcess(claim)) return;

    setSelectedClaim(null);
    setDecision({ claim, action });
    setRemarks("");
    setDecisionError("");
  };

  const submitDecision = async (event) => {
    event.preventDefault();

    if (!decision || decisionLoading) return;

    if (
      ["reject", "return"].includes(decision.action) &&
      !remarks.trim()
    ) {
      setDecisionError(
        decision.action === "return"
          ? "Please explain what corrections are required."
          : "Please provide a reason for rejecting this claim."
      );
      return;
    }

    setDecisionLoading(true);
    setDecisionError("");
    setError("");

    try {
      let result;

      if (decision.action === "approve") {
        result = await adminApi.approveClaim(
          decision.claim._id,
          remarks.trim()
        );
      } else if (decision.action === "reject") {
        result = await adminApi.rejectClaim(
          decision.claim._id,
          remarks.trim()
        );
      } else if (decision.action === "return") {
        result = await adminApi.returnClaimForCorrection(
          decision.claim._id,
          remarks.trim()
        );
      }

      if (!result?.success) {
        throw new Error(
          result?.message || "Unable to process this claim."
        );
      }

      const completedAction = decision.action;

      setDecision(null);
      setRemarks("");
      setSelectedClaim(null);

      await fetchClaims();

      setSuccessMessage(
        completedAction === "approve"
          ? "Claim approved successfully."
          : completedAction === "reject"
            ? "Claim rejected successfully."
            : "Claim returned to faculty for corrections."
      );
    } catch (err) {
      if (isSessionError(err)) handleSessionExpiry();

      setDecisionError(
        getErrorMessage(err, "Unable to submit the decision.")
      );
    } finally {
      setDecisionLoading(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();

  const visibleClaims = claims.filter((claim) => {
    if (!normalizedSearch) return true;

    const faculty = claim.faculty || {};

    const searchableText = [
      claim._id,
      claimTitle(claim),
      claim.claimType,
      claim.financialYear,
      faculty.fullName,
      faculty.employeeId,
      faculty.email,
      faculty.department,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setClaimType("");
    setFinancialYear("");
    setPage(1);
  };

  const decisionTitle = !decision
    ? ""
    : decision.action === "approve"
      ? "Approve claim?"
      : decision.action === "reject"
        ? "Reject claim?"
        : "Return claim for corrections?";

  const decisionDescription = !decision
    ? ""
    : decision.action === "approve"
      ? "Confirm that the claim has been reviewed and should be approved. You may add optional remarks."
      : decision.action === "reject"
        ? "Provide a reason for rejecting this claim."
        : "Explain what information or documents the faculty member needs to correct before resubmitting the claim.";

  const decisionPlaceholder = !decision
    ? ""
    : decision.action === "approve"
      ? "Optional approval remarks..."
      : decision.action === "reject"
        ? "Explain why this claim is being rejected..."
        : "Describe the corrections required...";

  return (
    <div className="claims-page">
      <div className="claims-page-heading">
        <div>
          <span className="claims-eyebrow">
            RESEARCH ADMINISTRATION
          </span>

          <h1>Claims Management</h1>

          <p>
            Review faculty incentive claims, inspect supporting
            information, and record your decisions.
          </p>
        </div>

        <button
          type="button"
          className="claims-refresh-button"
          onClick={fetchClaims}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "claims-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="claims-summary-row">
        <div className="claims-summary-card">
          <span className="claims-summary-icon">
            <FileText size={20} />
          </span>

          <div>
            <span className="claims-summary-label">
              Matching claims
            </span>

            <strong>
              {Number(pagination.total || 0).toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        <div className="claims-security-note">
          <ShieldCheck size={19} />
          <span>Administrative review workspace</span>
        </div>
      </div>

      <section className="claims-panel">
        <div className="claims-panel-heading">
          <div>
            <h2>Research claims</h2>
            <p>Filter records and select a claim to review.</p>
          </div>

          <span className="claims-record-count">
            Page {pagination.page || page} of{" "}
            {Math.max(1, pagination.totalPages || 1)}
          </span>
        </div>

        <div className="claims-filters">
          <label className="claims-search">
            <Search size={17} />

            <input
              type="search"
              value={search}
              placeholder="Search current results..."
              aria-label="Search claims on this page"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="claims-filter-control">
            <span>Status</span>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {STATUSES.map((item) => (
                <option value={item} key={item}>
                  {formatLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="claims-filter-control">
            <span>Claim type</span>

            <select
              value={claimType}
              onChange={(event) => {
                setClaimType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All claim types</option>
              {CLAIM_TYPES.map((item) => (
                <option value={item} key={item}>
                  {formatLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="claims-filter-control">
            <span>Financial year</span>

            <select
              value={financialYear}
              onChange={(event) => {
                setFinancialYear(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All years</option>
              {FINANCIAL_YEARS.map((year) => (
                <option value={year} key={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="claims-reset-button"
            onClick={resetFilters}
            title="Reset filters"
          >
            <Filter size={16} />
            Reset
          </button>
        </div>

        {successMessage && !error && (
          <div className="claims-success" role="status">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="claims-error" role="alert">
            <AlertCircle size={19} />

            <div>
              <strong>Unable to load claims</strong>
              <p>{error}</p>
            </div>

            <button type="button" onClick={fetchClaims}>
              Retry
            </button>
          </div>
        )}

        <div className="claims-table-wrapper">
          <table className="claims-table">
            <thead>
              <tr>
                <th>Claim</th>
                <th>Faculty</th>
                <th>Financial year</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="claims-table-message">
                    <RefreshCw
                      size={19}
                      className="claims-spin"
                    />
                    Loading claims...
                  </td>
                </tr>
              ) : visibleClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="claims-table-message">
                    <FileText size={23} />
                    <strong>No matching claims found</strong>
                    <span>
                      Try changing your filters or search terms.
                    </span>
                  </td>
                </tr>
              ) : (
                visibleClaims.map((claim) => {
                  const faculty = claim.faculty || {};
                  const actionable = canProcess(claim);

                  return (
                    <tr key={claim._id}>
                      <td>
                        <div className="claims-primary-cell">
                          <strong>{claimTitle(claim)}</strong>

                          <span>
                            ID:{" "}
                            {String(claim._id)
                              .slice(-8)
                              .toUpperCase()}
                          </span>

                          <small>
                            {formatLabel(claim.claimType)}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="claims-faculty-cell">
                          <strong>
                            {faculty.fullName ||
                              "Faculty unavailable"}
                          </strong>

                          <span>
                            {faculty.employeeId ||
                              faculty.email ||
                              "—"}
                          </span>

                          {faculty.department && (
                            <small>{faculty.department}</small>
                          )}
                        </div>
                      </td>

                      <td>{claim.financialYear || "—"}</td>

                      <td className="claims-amount">
                        {formatAmount(claim.incentiveAmount)}
                      </td>

                      <td>
                        <span
                          className={`claims-status claims-status-${String(
                            claim.status || "unknown"
                          ).toLowerCase()}`}
                        >
                          {formatLabel(claim.status || "Unknown")}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          claim.submittedAt || claim.createdAt
                        )}
                      </td>

                      <td>
                        <div className="claims-row-actions">
                          <button
                            type="button"
                            className="claims-icon-button"
                            title="View claim details"
                            aria-label="View claim details"
                            onClick={() => openClaimDetails(claim)}
                          >
                            <Eye size={17} />
                          </button>

                          {actionable && (
                            <>
                              <button
                                type="button"
                                className="claims-icon-button claims-approve-icon"
                                title="Approve claim"
                                aria-label="Approve claim"
                                onClick={() =>
                                  startDecision(claim, "approve")
                                }
                              >
                                <CheckCircle2 size={17} />
                              </button>

                              <button
                                type="button"
                                className="claims-icon-button claims-reject-icon"
                                title="Reject claim"
                                aria-label="Reject claim"
                                onClick={() =>
                                  startDecision(claim, "reject")
                                }
                              >
                                <XCircle size={17} />
                              </button>

                              <button
                                type="button"
                                className="claims-icon-button"
                                title="Return for corrections"
                                aria-label="Return for corrections"
                                onClick={() =>
                                  startDecision(claim, "return")
                                }
                              >
                                <RotateCcw size={17} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="claims-pagination">
          <span>
            Showing {visibleClaims.length} on this page ·{" "}
            {Number(pagination.total || 0).toLocaleString("en-IN")} total
          </span>

          <div className="claims-pagination-actions">
            <button
              type="button"
              disabled={
                loading ||
                !pagination.hasPreviousPage ||
                page <= 1
              }
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span>{page}</span>

            <button
              type="button"
              disabled={loading || !pagination.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* CLAIM DETAILS MODAL */}
      {selectedClaim && (
        <div
          className="claims-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !detailsLoading &&
              !viewingDocumentId
            ) {
              setSelectedClaim(null);
            }
          }}
        >
          <section
            className="claims-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="claims-details-title"
          >
            <header className="claims-modal-header">
              <div>
                <span className="claims-eyebrow">CLAIM RECORD</span>
                <h2 id="claims-details-title">Claim details</h2>
              </div>

              <button
                type="button"
                className="claims-icon-button"
                aria-label="Close claim details"
                onClick={() => setSelectedClaim(null)}
                disabled={detailsLoading || !!viewingDocumentId}
              >
                <X size={19} />
              </button>
            </header>

            {detailsLoading ? (
              <div className="claims-modal-message">
                <RefreshCw
                  size={20}
                  className="claims-spin"
                />
                Loading claim details...
              </div>
            ) : detailsError ? (
              <div className="claims-error" role="alert">
                <AlertCircle size={19} />
                <p>{detailsError}</p>
              </div>
            ) : (
              <div className="claims-modal-body">
                <div className="claims-detail-title">
                  <h3>{claimTitle(selectedClaim)}</h3>

                  <span
                    className={`claims-status claims-status-${String(
                      selectedClaim.status || "unknown"
                    ).toLowerCase()}`}
                  >
                    {formatLabel(
                      selectedClaim.status || "Unknown"
                    )}
                  </span>
                </div>

                <div className="claims-detail-grid">
                  <div>
                    <span>Faculty</span>
                    <strong>
                      {selectedClaim.faculty?.fullName || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Employee ID</span>
                    <strong>
                      {selectedClaim.faculty?.employeeId || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Department</span>
                    <strong>
                      {selectedClaim.faculty?.department || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Financial year</span>
                    <strong>
                      {selectedClaim.financialYear || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Claim type</span>
                    <strong>
                      {formatLabel(selectedClaim.claimType)}
                    </strong>
                  </div>

                  <div>
                    <span>Incentive amount</span>
                    <strong>
                      {formatAmount(selectedClaim.incentiveAmount)}
                    </strong>
                  </div>

                  <div>
                    <span>Submitted on</span>
                    <strong>
                      {formatDate(
                        selectedClaim.submittedAt ||
                          selectedClaim.createdAt
                      )}
                    </strong>
                  </div>
                </div>

                {selectedClaim.formData &&
                  Object.keys(selectedClaim.formData).length > 0 && (
                    <div className="claims-detail-section">
                      <h3>Submitted information</h3>

                      <dl className="claims-form-data">
                        {Object.entries(
                          selectedClaim.formData
                        ).map(([key, value]) => (
                          <div key={key}>
                            <dt>{formatLabel(key)}</dt>
                            <dd>{displayValue(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                <div className="claims-detail-section">
                  <h3>
                    Supporting documents (
                    {selectedClaim.documents?.length || 0})
                  </h3>

                  {documentError && (
                    <div
                      className="claims-inline-error"
                      role="alert"
                    >
                      <AlertCircle size={17} />
                      <span>{documentError}</span>
                    </div>
                  )}

                  {selectedClaim.documents?.length ? (
                    <div className="claims-document-list">
                      {selectedClaim.documents.map(
                        (document, index) => {
                          const isViewing =
                            viewingDocumentId === document._id;

                          return (
                            <div
                              className="claims-document-item"
                              key={document._id || index}
                            >
                              <FileText size={18} />

                              <div>
                                <strong>
                                  {document.originalName ||
                                    formatLabel(
                                      document.documentType
                                    ) ||
                                    `Document ${index + 1}`}
                                </strong>

                                <span>
                                  {formatLabel(
                                    document.status || "Uploaded"
                                  )}
                                </span>

                                {document.fileSize != null && (
                                  <small>
                                    {(
                                      Number(document.fileSize) /
                                      1024
                                    ).toFixed(1)}{" "}
                                    KB
                                  </small>
                                )}
                              </div>

                              <button
                                type="button"
                                className="claims-neutral-button"
                                onClick={() =>
                                  viewDocument(
                                    selectedClaim,
                                    document
                                  )
                                }
                                disabled={
                                  !!viewingDocumentId ||
                                  detailsLoading
                                }
                                title="Open supporting document"
                              >
                                {isViewing ? (
                                  <>
                                    <RefreshCw
                                      size={15}
                                      className="claims-spin"
                                    />
                                    Opening...
                                  </>
                                ) : (
                                  <>
                                    <Eye size={15} />
                                    View
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <p className="claims-muted-text">
                      No supporting documents are attached to this claim.
                    </p>
                  )}
                </div>
              </div>
            )}

            <footer className="claims-modal-footer">
              {canProcess(selectedClaim) && !detailsLoading && (
                <>
                  <button
                    type="button"
                    className="claims-secondary-button"
                    onClick={() =>
                      startDecision(selectedClaim, "return")
                    }
                  >
                    <RotateCcw size={16} />
                    Return for corrections
                  </button>

                  <button
                    type="button"
                    className="claims-secondary-button"
                    onClick={() =>
                      startDecision(selectedClaim, "reject")
                    }
                  >
                    <XCircle size={16} />
                    Reject
                  </button>

                  <button
                    type="button"
                    className="claims-primary-button"
                    onClick={() =>
                      startDecision(selectedClaim, "approve")
                    }
                  >
                    <CheckCircle2 size={16} />
                    Approve
                  </button>
                </>
              )}

              <button
                type="button"
                className="claims-neutral-button"
                onClick={() => setSelectedClaim(null)}
                disabled={!!viewingDocumentId}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* APPROVE / REJECT / RETURN DECISION MODAL */}
      {decision && (
        <div
          className="claims-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !decisionLoading
            ) {
              setDecision(null);
            }
          }}
        >
          <section
            className="claims-modal claims-decision-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="claims-decision-title"
          >
            <header className="claims-modal-header">
              <div>
                <span className="claims-eyebrow">
                  ADMINISTRATIVE DECISION
                </span>

                <h2 id="claims-decision-title">
                  {decisionTitle}
                </h2>
              </div>

              <button
                type="button"
                className="claims-icon-button"
                aria-label="Cancel decision"
                onClick={() => setDecision(null)}
                disabled={decisionLoading}
              >
                <X size={19} />
              </button>
            </header>

            <form onSubmit={submitDecision}>
              <div className="claims-decision-body">
                <p>
                  <strong>{claimTitle(decision.claim)}</strong>
                </p>

                <p className="claims-muted-text">
                  {decisionDescription}
                </p>

                <label className="claims-remarks-label">
                  Remarks
                  {decision.action !== "approve" && (
                    <span> · Required</span>
                  )}

                  <textarea
                    value={remarks}
                    onChange={(event) =>
                      setRemarks(event.target.value)
                    }
                    rows={4}
                    maxLength={2000}
                    placeholder={decisionPlaceholder}
                    required={decision.action !== "approve"}
                    disabled={decisionLoading}
                  />
                </label>

                {decisionError && (
                  <div
                    className="claims-inline-error"
                    role="alert"
                  >
                    <AlertCircle size={17} />
                    <span>{decisionError}</span>
                  </div>
                )}
              </div>

              <footer className="claims-modal-footer">
                <button
                  type="button"
                  className="claims-neutral-button"
                  onClick={() => setDecision(null)}
                  disabled={decisionLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    decision.action === "approve"
                      ? "claims-primary-button"
                      : decision.action === "reject"
                        ? "claims-danger-button"
                        : "claims-secondary-button"
                  }
                  disabled={decisionLoading}
                >
                  {decisionLoading ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="claims-spin"
                      />
                      Processing...
                    </>
                  ) : decision.action === "approve" ? (
                    <>
                      <CheckCircle2 size={16} />
                      Confirm approval
                    </>
                  ) : decision.action === "reject" ? (
                    <>
                      <XCircle size={16} />
                      Confirm rejection
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      Return for corrections
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default ClaimsManagement;
