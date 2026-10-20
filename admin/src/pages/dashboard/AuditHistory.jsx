
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { adminApi } from "../../services/adminApi";
import "./AuditHistory.css";

const PAGE_SIZE = 10;

// =====================================================
// HELPERS
// =====================================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLabel(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getActorName(actor) {
  if (!actor) return "System / Unknown";
  if (typeof actor === "string") return actor;

  return (
    actor.fullName ||
    actor.name ||
    actor.email ||
    actor.employeeId ||
    "System / Unknown"
  );
}

function getActorEmail(actor) {
  if (!actor || typeof actor === "string") return "";

  return actor.email || actor.employeeId || "";
}

function getTargetId(record) {
  const target = record?.targetId;

  if (!target) return "—";
  if (typeof target === "string") return target;

  return target._id || target.id || "—";
}

function getMetadataSummary(metadata) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return "";
  }

  return Object.entries(metadata)
    .filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        typeof value !== "object"
    )
    .slice(0, 3)
    .map(([key, value]) => `${formatLabel(key)}: ${String(value)}`)
    .join(" · ");
}

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

function isSessionError(error) {
  if (error?.status === 401 || error?.status === 403) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("session has expired") ||
    message.includes("session is invalid") ||
    message.includes("not authorized") ||
    message.includes("unauthorized")
  );
}

function normalizePagination(result, requestedPage, records) {
  const total = Math.max(
    0,
    Number(result?.pagination?.total ?? records.length) || 0
  );

  const limit = Math.max(
    1,
    Number(result?.pagination?.limit ?? PAGE_SIZE) || PAGE_SIZE
  );

  const totalPages = Math.max(
    1,
    Number(
      result?.pagination?.totalPages ??
        Math.ceil(total / limit)
    ) || 1
  );

  const page = Math.min(
    totalPages,
    Math.max(
      1,
      Number(result?.pagination?.page ?? requestedPage) ||
        requestedPage
    )
  );

  return {
    page,
    limit,
    total,
    totalPages,
  };
}

function clearAdminSession() {
  localStorage.removeItem("rimsAdminToken");
  localStorage.removeItem("rimsAdminUser");

  sessionStorage.removeItem("rimsAdminToken");
  sessionStorage.removeItem("rimsAdminUser");
}

// =====================================================
// AUDIT HISTORY COMPONENT
// =====================================================

export default function AuditHistory({ onLogout }) {
  const [records, setRecords] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);
  const logoutHandledRef = useRef(false);
  const verificationRequestRef = useRef(0);

  // ---------------------------------------------------
  // MOUNT / UNMOUNT
  // ---------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      verificationRequestRef.current += 1;
    };
  }, []);

  // ---------------------------------------------------
  // SESSION EXPIRY
  // ---------------------------------------------------

  const handleSessionExpiry = useCallback(() => {
    if (logoutHandledRef.current) return;

    logoutHandledRef.current = true;

    clearAdminSession();

    if (typeof onLogout === "function") {
      onLogout();
    } else if (mountedRef.current) {
      setError(
        "Your admin session has expired. Please sign in again."
      );
    }
  }, [onLogout]);

  // ---------------------------------------------------
  // LOAD AUDIT HISTORY
  // ---------------------------------------------------

  const loadAuditHistory = useCallback(
    async (requestedPage = 1, showRefresh = false) => {
      const requestId = ++requestIdRef.current;

      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await adminApi.getAuditHistory({
          page: requestedPage,
          limit: PAGE_SIZE,
        });

        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        if (result?.success !== true) {
          throw new Error(
            result?.message || "Unable to load audit history."
          );
        }

        if (!Array.isArray(result.data)) {
          throw new Error(
            "The audit history response did not contain a records array."
          );
        }

        const nextPagination = normalizePagination(
          result,
          requestedPage,
          result.data
        );

        setRecords(result.data);
        setPagination(nextPagination);
      } catch (err) {
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        if (isSessionError(err)) {
          handleSessionExpiry();
        } else {
          setError(
            getErrorMessage(
              err,
              "Unable to load audit history."
            )
          );
        }
      } finally {
        if (
          mountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [handleSessionExpiry]
  );

  useEffect(() => {
    loadAuditHistory(1);
  }, [loadAuditHistory]);

  // ---------------------------------------------------
  // VERIFY AUDIT CHAIN
  // ---------------------------------------------------

  const verifyAuditChain = async () => {
    if (verifying) return;

    const requestId = ++verificationRequestRef.current;

    setVerifying(true);
    setVerificationError("");
    setVerification(null);

    try {
      const result = await adminApi.verifyAuditChain();

      if (
        !mountedRef.current ||
        requestId !== verificationRequestRef.current
      ) {
        return;
      }

      /*
       * IMPORTANT:
       * The backend returns HTTP 200 for both valid and
       * invalid chains.
       *
       * Valid:
       * {
       *   success: true,
       *   data: { valid: true, totalBlocks: 9 }
       * }
       *
       * Invalid:
       * {
       *   success: false,
       *   data: {
       *     valid: false,
       *     failedSequence: 3
       *   }
       * }
       *
       * Therefore, check data.valid rather than requiring
       * result.success to be true.
       */

      const verificationData = result?.data;

      if (
        !verificationData ||
        typeof verificationData.valid !== "boolean"
      ) {
        throw new Error(
          result?.message ||
            "The verification response is missing the valid status."
        );
      }

      // Both successful and unsuccessful integrity checks
      // are valid verification results that should be displayed.
      setVerification(verificationData);

      // Clear any old verification error after a valid response.
      setVerificationError("");
    } catch (err) {
      if (
        !mountedRef.current ||
        requestId !== verificationRequestRef.current
      ) {
        return;
      }

      if (isSessionError(err)) {
        handleSessionExpiry();
      } else {
        setVerificationError(
          getErrorMessage(
            err,
            "Unable to verify the audit chain."
          )
        );
      }
    } finally {
      if (
        mountedRef.current &&
        requestId === verificationRequestRef.current
      ) {
        setVerifying(false);
      }
    }
  };

  // ---------------------------------------------------
  // PAGINATION / REFRESH
  // ---------------------------------------------------

  const changePage = (nextPage) => {
    if (
      loading ||
      refreshing ||
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.page
    ) {
      return;
    }

    loadAuditHistory(nextPage);
  };

  const refreshCurrentPage = () => {
    if (loading || refreshing) return;

    loadAuditHistory(pagination.page, true);
  };

  const firstRecord =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const lastRecord = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------

  return (
    <main className="audit-page">
      <header className="audit-page-header">
        <div className="audit-page-heading">
          <div className="audit-eyebrow">
            <Activity size={15} aria-hidden="true" />
            <span>SECURITY &amp; COMPLIANCE</span>
          </div>

          <h1>Audit History</h1>

          <p>
            Review administrative activity and verify the integrity
            of the audit log.
          </p>
        </div>

        <div className="audit-header-actions">
          <button
            type="button"
            className="audit-button audit-button-secondary"
            onClick={refreshCurrentPage}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "audit-spinning" : ""}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="audit-button audit-button-primary"
            onClick={verifyAuditChain}
            disabled={verifying}
          >
            <ShieldCheck size={17} aria-hidden="true" />
            {verifying ? "Verifying..." : "Verify Audit Chain"}
          </button>
        </div>
      </header>

      {/* SUMMARY CARDS */}

      <section
        className="audit-summary-grid"
        aria-label="Audit summary"
      >
        <article className="audit-summary-card">
          <div className="audit-summary-icon audit-summary-icon-blue">
            <Activity size={21} aria-hidden="true" />
          </div>

          <div className="audit-summary-content">
            <span className="audit-summary-label">
              Total audit records
            </span>

            <strong className="audit-summary-value">
              {loading
                ? "—"
                : pagination.total.toLocaleString("en-IN")}
            </strong>

            <small className="audit-summary-caption">
              Recorded activities
            </small>
          </div>
        </article>

        <article className="audit-summary-card">
          <div className="audit-summary-icon audit-summary-icon-gold">
            <Fingerprint size={21} aria-hidden="true" />
          </div>

          <div className="audit-summary-content">
            <span className="audit-summary-label">
              Current page
            </span>

            <strong className="audit-summary-value">
              {loading
                ? "—"
                : `${pagination.page} / ${pagination.totalPages}`}
            </strong>

            <small className="audit-summary-caption">
              Audit record pages
            </small>
          </div>
        </article>

        <article className="audit-summary-card">
          <div className="audit-summary-icon audit-summary-icon-green">
            <ShieldCheck size={21} aria-hidden="true" />
          </div>

          <div className="audit-summary-content">
            <span className="audit-summary-label">
              Integrity check
            </span>

            <strong
              className={`audit-summary-value ${
                verification
                  ? verification.valid
                    ? "audit-value-success"
                    : "audit-value-danger"
                  : ""
              }`}
            >
              {verification
                ? verification.valid
                  ? "Verified"
                  : "Failed"
                : "Not checked"}
            </strong>

            <small className="audit-summary-caption">
              Verify the audit chain
            </small>
          </div>
        </article>
      </section>

      {/* VERIFICATION RESULT */}

      {verification && (
        <section
          className={`audit-verification ${
            verification.valid
              ? "audit-verification-success"
              : "audit-verification-failed"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="audit-verification-icon">
            {verification.valid ? (
              <CheckCircle2 size={23} aria-hidden="true" />
            ) : (
              <XCircle size={23} aria-hidden="true" />
            )}
          </div>

          <div className="audit-verification-content">
            <h2>
              {verification.valid
                ? "Audit chain verification passed"
                : "Audit chain verification failed"}
            </h2>

            <p>
              {verification.valid
                ? "The backend reports that the audit chain is valid."
                : "The backend reports an integrity issue. Review the failed sequence below."}
            </p>

            <div className="audit-verification-details">
              <span>
                Records checked:{" "}
                <strong>
                  {verification.totalBlocks ?? "—"}
                </strong>
              </span>

              {!verification.valid && (
                <span>
                  Failed sequence:{" "}
                  <strong>
                    {verification.failedSequence ?? "Not provided"}
                  </strong>
                </span>
              )}

              {verification.message && (
                <span>{verification.message}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* VERIFICATION ERROR */}

      {verificationError && (
        <div
          className="audit-message audit-message-error"
          role="alert"
        >
          <AlertCircle size={18} aria-hidden="true" />

          <span className="audit-message-text">
            {verificationError}
          </span>

          <button
            type="button"
            className="audit-message-dismiss"
            onClick={() => setVerificationError("")}
            aria-label="Dismiss verification error"
          >
            <XCircle size={17} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* HISTORY ERROR */}

      {error && (
        <div
          className="audit-message audit-message-error"
          role="alert"
        >
          <AlertCircle size={18} aria-hidden="true" />

          <span className="audit-message-text">{error}</span>

          <button
            type="button"
            className="audit-retry-button"
            onClick={() => loadAuditHistory(pagination.page)}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      {/* ACTIVITY TABLE */}

      <section className="audit-table-panel">
        <div className="audit-table-heading">
          <div>
            <h2>Activity log</h2>
            <p>Audit records returned by the backend</p>
          </div>

          <span className="audit-record-count">
            {loading
              ? "Loading..."
              : `${pagination.total.toLocaleString("en-IN")} records`}
          </span>
        </div>

        <div className="audit-table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th scope="col">Sequence</th>
                <th scope="col">Action</th>
                <th scope="col">Performed by</th>
                <th scope="col">Target</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Metadata</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="audit-table-state">
                    <RefreshCw
                      size={21}
                      className="audit-spinning"
                      aria-hidden="true"
                    />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="audit-table-state">
                    <AlertCircle size={22} aria-hidden="true" />
                    <strong>
                      Audit records could not be loaded.
                    </strong>
                    <span>Use Try again to retry the request.</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="audit-table-state">
                    <Activity size={25} aria-hidden="true" />
                    <strong>No audit records found</strong>
                    <span>
                      Records will appear here when activity is logged.
                    </span>
                  </td>
                </tr>
              ) : (
                records.map((record, index) => {
                  const actorName = getActorName(record.actorId);
                  const actorEmail = getActorEmail(record.actorId);
                  const metadata = getMetadataSummary(record.metadata);
                  const targetId = getTargetId(record);

                  return (
                    <tr
                      key={
                        record._id ||
                        `${record.sequence ?? "record"}-${
                          record.timestamp ?? index
                        }`
                      }
                    >
                      <td>
                        <span className="audit-sequence">
                          #{record.sequence ?? "—"}
                        </span>
                      </td>

                      <td>
                        <span className="audit-action">
                          {formatLabel(record.action)}
                        </span>
                      </td>

                      <td>
                        <div className="audit-actor">
                          <span className="audit-avatar">
                            {actorName.charAt(0).toUpperCase()}
                          </span>

                          <div className="audit-actor-details">
                            <strong>{actorName}</strong>
                            <small>
                              {actorEmail ||
                                "Actor details unavailable"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="audit-target">
                          <strong>
                            {formatLabel(record.targetType)}
                          </strong>
                          <small title={targetId}>{targetId}</small>
                        </div>
                      </td>

                      <td className="audit-timestamp">
                        {formatDate(record.timestamp)}
                      </td>

                      <td>
                        <span
                          className="audit-metadata"
                          title={metadata || "No metadata"}
                        >
                          {metadata || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <footer className="audit-pagination">
          <span className="audit-pagination-summary">
            {loading
              ? "Loading records..."
              : `Showing ${firstRecord}–${lastRecord} of ${pagination.total}`}
          </span>

          <div className="audit-pagination-controls">
            <button
              type="button"
              className="audit-page-button"
              aria-label="Previous page"
              title="Previous page"
              onClick={() => changePage(pagination.page - 1)}
              disabled={
                loading ||
                refreshing ||
                pagination.page <= 1
              }
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>

            <span className="audit-page-indicator">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              className="audit-page-button"
              aria-label="Next page"
              title="Next page"
              onClick={() => changePage(pagination.page + 1)}
              disabled={
                loading ||
                refreshing ||
                pagination.page >= pagination.totalPages
              }
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
