
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Mail,
  Building2,
  BriefcaseBusiness,
} from "lucide-react";

import { adminApi } from "../../services/adminApi";
import "./FacultyRegistrations.css";

const PAGE_SIZE = 10;

function clearStoredSession() {
  localStorage.removeItem("rimsAdminToken");
  localStorage.removeItem("rimsAdminUser");
  sessionStorage.removeItem("rimsAdminToken");
  sessionStorage.removeItem("rimsAdminUser");
}

function isSessionError(error) {
  return (
    error?.status === 401 ||
    error?.status === 403 ||
    /session.*(expired|invalid)|not authorized|unauthorized/i.test(
      error?.message || ""
    )
  );
}

function FacultyRegistrations({ onLogout }) {
  const [registrations, setRegistrations] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchRegistrations = useCallback(
    async (page = 1, searchText = "") => {
      setLoading(true);
      setError("");

      try {
        const result = await adminApi.getRegistrations({
          page,
          limit: PAGE_SIZE,
          search: searchText.trim(),
        });

        if (result?.success !== true || !Array.isArray(result.data)) {
          throw new Error(
            result?.message ||
              "The server returned invalid registration data."
          );
        }

        const data = result.data;
        const serverPagination = result.pagination || {};
        const currentPage = Number(serverPagination.page) || page;
        const total = Number(serverPagination.total);

        setRegistrations(data);

        setPagination({
          page: currentPage,
          limit: Number(serverPagination.limit) || PAGE_SIZE,
          total: Number.isFinite(total) ? total : data.length,
          totalPages:
            Number(serverPagination.totalPages) ||
            (data.length > 0 ? 1 : 0),
          hasPreviousPage:
            typeof serverPagination.hasPreviousPage === "boolean"
              ? serverPagination.hasPreviousPage
              : currentPage > 1,
          hasNextPage:
            typeof serverPagination.hasNextPage === "boolean"
              ? serverPagination.hasNextPage
              : false,
        });

        return data;
      } catch (err) {
        console.error("Faculty registrations error:", err);

        if (isSessionError(err)) {
          clearStoredSession();

          if (typeof onLogout === "function") {
            onLogout();
            return null;
          }
        }

        setError(
          err?.message || "Unable to load faculty registrations."
        );
        setRegistrations([]);

        return null;
      } finally {
        setLoading(false);
      }
    },
    [onLogout]
  );

  useEffect(() => {
    fetchRegistrations(1, "");
  }, [fetchRegistrations]);

  const handleSearch = async (event) => {
    event.preventDefault();

    const searchText = search.trim();

    setSubmittedSearch(searchText);
    setMessage("");

    await fetchRegistrations(1, searchText);
  };

  const handleDecision = async (faculty, decision) => {
    if (actionId) return;

    const facultyId = faculty?._id;

    if (!facultyId) {
      setError("The faculty registration ID is missing.");
      return;
    }

    const facultyName = faculty.fullName || "this faculty member";
    let rejectionReason = "";

    if (decision === "reject") {
      const input = window.prompt(
        `Enter the reason for rejecting ${facultyName}:`
      );

      if (input === null) return;

      rejectionReason = input.trim();

      if (!rejectionReason) {
        setError("A rejection reason is required.");
        return;
      }
    } else {
      const confirmed = window.confirm(
        `Approve the registration for ${facultyName}?`
      );

      if (!confirmed) return;
    }

    setActionId(facultyId);
    setError("");
    setMessage("");

    try {
      const result =
        decision === "approve"
          ? await adminApi.approveRegistration(facultyId)
          : await adminApi.rejectRegistration(
              facultyId,
              rejectionReason
            );

      if (result?.success !== true) {
        throw new Error(
          result?.message ||
            `Unable to ${decision} this faculty registration.`
        );
      }

      const successMessage =
        result.message ||
        `Faculty registration ${
          decision === "approve" ? "approved" : "rejected"
        } successfully.`;

      // Reload the current page after the server processes the decision.
      const refreshedData = await fetchRegistrations(
        pagination.page,
        submittedSearch
      );

      if (refreshedData === null) return;

      // If the last item on a page was removed, move back one page.
      if (
        refreshedData.length === 0 &&
        pagination.page > 1
      ) {
        const previousPage = pagination.page - 1;

        await fetchRegistrations(previousPage, submittedSearch);
      }

      setMessage(successMessage);
    } catch (err) {
      console.error("Faculty registration action error:", err);

      if (isSessionError(err)) {
        clearStoredSession();

        if (typeof onLogout === "function") {
          onLogout();
          return;
        }
      }

      setError(
        err?.message ||
          `Unable to ${decision} the faculty registration.`
      );
    } finally {
      setActionId("");
    }
  };

  return (
    <section className="admin-registrations-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            FACULTY MANAGEMENT
          </span>

          <h2>Faculty Registrations</h2>

          <p>
            Review and manage pending faculty access requests.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={() =>
            fetchRegistrations(
              pagination.page,
              submittedSearch
            )
          }
          disabled={loading || Boolean(actionId)}
        >
          <RefreshCw
            size={16}
            className={loading ? "admin-spinning" : ""}
          />
          <span>Refresh</span>
        </button>
      </div>

      <div className="admin-registration-summary">
        <div className="admin-registration-summary-icon">
          <Users size={23} />
        </div>

        <div>
          <span>Pending registrations</span>
          <strong>{pagination.total.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <form
        className="admin-registration-search"
        onSubmit={handleSearch}
      >
        <div className="admin-registration-search-input">
          <Search size={19} />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, employee ID, email, department..."
            aria-label="Search faculty registrations"
          />
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(actionId)}
        >
          Search
        </button>
      </form>

      {error && (
        <div className="admin-error-message" role="alert">
          <XCircle size={19} />

          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {message && (
        <div className="admin-registration-success" role="status">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="admin-registration-list-header">
        <div>
          <h3>Registration Requests</h3>
          <p>Only pending faculty accounts are shown.</p>
        </div>

        <span>
          {pagination.total.toLocaleString("en-IN")} total
        </span>
      </div>

      {loading ? (
        <div className="admin-registration-empty" role="status">
          <RefreshCw size={24} className="admin-spinning" />
          <p>Loading faculty registrations...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="admin-registration-empty">
          <Users size={30} />

          <h3>No pending registrations found</h3>

          <p>
            {submittedSearch
              ? "Try another search term or clear your search to view all pending registrations."
              : "New faculty requests will appear here when they are submitted."}
          </p>
        </div>
      ) : (
        <div className="admin-registration-list">
          {registrations.map((faculty) => {
            const isProcessing = actionId === faculty._id;

            return (
              <article
                className="admin-registration-card"
                key={faculty._id}
              >
                <div className="admin-registration-card-top">
                  <div className="admin-registration-avatar">
                    {(faculty.fullName || "F")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="admin-registration-person">
                    <h3>
                      {faculty.fullName || "Name unavailable"}
                    </h3>

                    <span>
                      {faculty.employeeId || "No employee ID"}
                    </span>
                  </div>

                  <span className="admin-registration-status">
                    Pending
                  </span>
                </div>

                <div className="admin-registration-details">
                  <div>
                    <Mail size={16} />
                    <span>
                      {faculty.email || "No email provided"}
                    </span>
                  </div>

                  <div>
                    <Building2 size={16} />
                    <span>
                      {faculty.department ||
                        "Department not provided"}
                    </span>
                  </div>

                  <div>
                    <BriefcaseBusiness size={16} />
                    <span>
                      {faculty.designation ||
                        "Designation not provided"}
                    </span>
                  </div>

                  {faculty.createdAt && (
                    <div>
                      <UserRound size={16} />
                      <span>
                        Requested on{" "}
                        {new Date(
                          faculty.createdAt
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="admin-registration-actions">
                  <button
                    type="button"
                    className="admin-registration-reject"
                    onClick={() =>
                      handleDecision(faculty, "reject")
                    }
                    disabled={Boolean(actionId)}
                  >
                    <XCircle size={17} />
                    Reject
                  </button>

                  <button
                    type="button"
                    className="admin-registration-approve"
                    onClick={() =>
                      handleDecision(faculty, "approve")
                    }
                    disabled={Boolean(actionId)}
                  >
                    <CheckCircle2 size={17} />
                    {isProcessing ? "Processing..." : "Approve"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="admin-registration-pagination">
          <button
            type="button"
            onClick={() =>
              fetchRegistrations(
                pagination.page - 1,
                submittedSearch
              )
            }
            disabled={
              !pagination.hasPreviousPage || Boolean(actionId)
            }
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              fetchRegistrations(
                pagination.page + 1,
                submittedSearch
              )
            }
            disabled={
              !pagination.hasNextPage || Boolean(actionId)
            }
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

export default FacultyRegistrations;
