import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import "./Reports.css";

const API_BASE_URL = "http://localhost:5000";

const CATEGORIES = [
  "All Categories",
  "Research Project",
  "Patent",
  "Journal Publication",
  "Research Award",
  "Undergraduate Research",
  "Postgraduate Research",
  "Book / Book Chapter",
  "Conference Proceedings",
  "PhD Supervision",
  "E-Content",
  "Professional Development",
];

const FINANCIAL_YEARS = [
  "All Years",
  "2026-27",
  "2025-26",
  "2024-25",
];

const EMPTY_SUMMARY = {
  totalClaims: 0,
  draftClaims: 0,
  submittedClaims: 0,
  underReviewClaims: 0,
  approvedClaims: 0,
  rejectedClaims: 0,
  returnedClaims: 0,
  totalIncentiveRequested: 0,
  totalIncentiveApproved: 0,
};

function formatCurrency(value) {
  const amount = Number(value) || 0;

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeText(value = "") {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatCategory(value = "") {
  const normalized = normalizeText(value);

  const knownCategories = {
    "research project": "Research Project",
    patent: "Patent",
    "journal publication": "Journal Publication",
    "research award": "Research Award",
    "undergraduate research": "Undergraduate Research",
    "postgraduate research": "Postgraduate Research",
    "book book chapter": "Book / Book Chapter",
    "book chapter": "Book / Book Chapter",
    "conference proceedings": "Conference Proceedings",
    "phd supervision": "PhD Supervision",
    "e content": "E-Content",
    "professional development": "Professional Development",
  };

  return knownCategories[normalized] || value || "—";
}

function getClaimDate(claim) {
  return (
    claim.submittedAt ||
    claim.createdAt ||
    claim.updatedAt ||
    null
  );
}

function getClaimTitle(claim) {
  const formData = claim.formData || {};

  return (
    formData.title ||
    formData.projectTitle ||
    formData.patentTitle ||
    formData.publicationTitle ||
    formData.journalTitle ||
    formData.awardTitle ||
    formData.bookTitle ||
    formData.conferenceTitle ||
    formData.researchTitle ||
    formData.name ||
    formatCategory(claim.claimType)
  );
}

function getStatusLabel(status = "") {
  const labels = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    RETURNED: "Returned",
  };

  return labels[status] || status || "Unknown";
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  if (!rows.length) {
    return false;
  }

  const headers = [
    "Claim Title",
    "Category",
    "Financial Year",
    "Status",
    "Incentive Amount",
    "Created Date",
    "Submitted Date",
    "Approved Date",
    "Review Comment",
  ];

  const csvRows = rows.map((claim) => [
    getClaimTitle(claim),
    formatCategory(claim.claimType),
    claim.financialYear || "",
    getStatusLabel(claim.status),
    Number(claim.incentiveAmount) || 0,
    formatDate(claim.createdAt),
    formatDate(claim.submittedAt),
    formatDate(claim.approvedAt),
    claim.reviewComment || "",
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...csvRows.map((row) =>
      row.map(escapeCsvValue).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(
    ["\uFEFF", csvContent],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  return true;
}

function Reports() {
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [categoryReport, setCategoryReport] = useState([]);
  const [financialYearReport, setFinancialYearReport] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All Categories");
  const [selectedYear, setSelectedYear] =
    useState("All Years");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [exportMessage, setExportMessage] = useState("");

  // =========================================================
  // LOAD REAL REPORT DATA
  // =========================================================

  const loadReports = useCallback(async (isRefresh = false) => {
    const token = localStorage.getItem("rimsToken");

    if (!token) {
      localStorage.removeItem("rimsUser");
      navigate("/", { replace: true });
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setExportMessage("");

    const requestOptions = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const requestJson = async (endpoint) => {
      const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        requestOptions
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (response.status === 401) {
        const authenticationError = new Error(
          "Your session has expired. Please sign in again."
        );

        authenticationError.status = 401;
        throw authenticationError;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Unable to load ${endpoint.split("/").pop()}.`
        );
      }

      return result.data;
    };

    try {
      // Summary and claim records are required.
      // The two breakdowns are loaded separately so a breakdown
      // failure does not prevent the main report from displaying.

      const [summaryData, claimsData] = await Promise.all([
        requestJson("/api/reports/summary"),
        requestJson("/api/reports/claims"),
      ]);

      setSummary({
        ...EMPTY_SUMMARY,
        ...(summaryData?.summary || {}),
      });

      setClaims(
        Array.isArray(claimsData?.claims)
          ? claimsData.claims
          : []
      );

      const [categoryResult, yearResult] =
        await Promise.allSettled([
          requestJson("/api/reports/by-category"),
          requestJson("/api/reports/by-financial-year"),
        ]);

      if (categoryResult.status === "fulfilled") {
        const report = categoryResult.value?.report;

        setCategoryReport(
          Array.isArray(report) ? report : []
        );
      } else {
        setCategoryReport([]);
        console.error(
          "Unable to load category report:",
          categoryResult.reason
        );
      }

      if (yearResult.status === "fulfilled") {
        const report = yearResult.value?.report;

        setFinancialYearReport(
          Array.isArray(report) ? report : []
        );
      } else {
        setFinancialYearReport([]);
        console.error(
          "Unable to load financial-year report:",
          yearResult.reason
        );
      }
    } catch (requestError) {
      console.error(
        "Reports request failed:",
        requestError
      );

      if (requestError.status === 401) {
        localStorage.removeItem("rimsToken");
        localStorage.removeItem("rimsUser");

        navigate("/", { replace: true });
        return;
      }

      setError(
        requestError.message ||
          "Unable to load reports. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // =========================================================
  // FILTER CLAIMS
  // =========================================================

  const filteredClaims = useMemo(() => {
    const search = normalizeText(searchTerm);

    return claims.filter((claim) => {
      const categoryMatches =
        selectedCategory === "All Categories" ||
        normalizeText(claim.claimType) ===
          normalizeText(selectedCategory);

      const yearMatches =
        selectedYear === "All Years" ||
        String(claim.financialYear || "") === selectedYear;

      const title = normalizeText(getClaimTitle(claim));
      const category = normalizeText(
        formatCategory(claim.claimType)
      );
      const status = normalizeText(
        getStatusLabel(claim.status)
      );

      const searchMatches =
        !search ||
        title.includes(search) ||
        category.includes(search) ||
        status.includes(search) ||
        normalizeText(claim.financialYear).includes(search);

      return (
        categoryMatches &&
        yearMatches &&
        searchMatches
      );
    });
  }, [
    claims,
    searchTerm,
    selectedCategory,
    selectedYear,
  ]);

  // =========================================================
  // SUMMARY VALUES
  // =========================================================

  const filteredSummary = useMemo(() => {
    const result = {
      totalClaims: filteredClaims.length,
      approvedClaims: 0,
      pendingClaims: 0,
      totalIncentiveRequested: 0,
      totalIncentiveApproved: 0,
    };

    filteredClaims.forEach((claim) => {
      const amount = Number(claim.incentiveAmount) || 0;

      if (claim.status === "APPROVED") {
        result.approvedClaims += 1;
        result.totalIncentiveApproved += amount;
      }

      if (
        ["SUBMITTED", "UNDER_REVIEW"].includes(claim.status)
      ) {
        result.pendingClaims += 1;
      }

      result.totalIncentiveRequested += amount;
    });

    return result;
  }, [filteredClaims]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedCategory !== "All Categories" ||
    selectedYear !== "All Years";

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All Categories");
    setSelectedYear("All Years");
    setExportMessage("");
  };

  // =========================================================
  // DOWNLOAD CSV
  // =========================================================

  const handleDownload = () => {
    if (filteredClaims.length === 0) {
      setExportMessage(
        "There are no claim records to export for the selected filters."
      );
      return;
    }

    const yearPart =
      selectedYear === "All Years"
        ? "all-years"
        : selectedYear.replace("/", "-");

    const success = downloadCsv(
      `RIMS-Claims-Report-${yearPart}.csv`,
      filteredClaims
    );

    if (success) {
      setExportMessage(
        `${filteredClaims.length} claim record${
          filteredClaims.length === 1 ? "" : "s"
        } exported successfully.`
      );
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="reports-page">
      {/* PAGE HEADER */}

      <header className="reports-header">
        <div className="reports-title-row">
          <div className="reports-title-icon">
            <FileSpreadsheet size={24} />
          </div>

          <div>
            <span className="page-eyebrow">
              Faculty Workspace
            </span>

            <h1 className="page-title">
              Reports
            </h1>

            <p className="page-description">
              Review your incentive activity and export your claim records.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="reports-generate-button"
          onClick={handleDownload}
          disabled={loading || filteredClaims.length === 0}
        >
          <Download size={17} />

          <span>
            Export CSV
          </span>
        </button>
      </header>

      {/* ERROR MESSAGE */}

      {error && (
        <section
          className="reports-list-card"
          role="alert"
        >
          <div className="reports-empty">
            <div className="reports-empty-icon">
              <ShieldAlert size={25} />
            </div>

            <h3>Unable to load reports</h3>

            <p>{error}</p>

            <button
              type="button"
              className="reports-generate-button"
              onClick={() => loadReports(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "is-spinning" : ""}
              />

              <span>
                Try Again
              </span>
            </button>
          </div>
        </section>
      )}

      {/* SUMMARY CARDS */}

      <section
        className="reports-summary"
        aria-label="Report summary"
      >
        <article className="reports-summary-card">
          <div className="reports-summary-icon">
            <FileText size={20} />
          </div>

          <div>
            <span>Total Claims</span>

            <strong>
              {loading ? "—" : filteredSummary.totalClaims}
            </strong>

            <p>Matching your filters</p>
          </div>
        </article>

        <article className="reports-summary-card">
          <div className="reports-summary-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Approved Claims</span>

            <strong>
              {loading ? "—" : filteredSummary.approvedClaims}
            </strong>

            <p>Approved claim records</p>
          </div>
        </article>

        <article className="reports-summary-card">
          <div className="reports-summary-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Pending Claims</span>

            <strong>
              {loading ? "—" : filteredSummary.pendingClaims}
            </strong>

            <p>Submitted or under review</p>
          </div>
        </article>

        <article className="reports-summary-card">
          <div className="reports-summary-icon">
            <IndianRupee size={20} />
          </div>

          <div>
            <span>Approved Incentives</span>

            <strong>
              {loading
                ? "—"
                : formatCurrency(
                    filteredSummary.totalIncentiveApproved
                  )}
            </strong>

            <p>For approved claims only</p>
          </div>
        </article>
      </section>

      {/* FILTERS */}

      <section className="reports-filter-card">
        <div className="reports-filter-title">
          <div>
            <h2>Filter Reports</h2>

            <p>
              Narrow your claim records by category, year, or keyword.
            </p>
          </div>

          <button
            type="button"
            className="reports-generate-button"
            onClick={() => loadReports(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "is-spinning" : ""}
            />

            <span>
              Refresh
            </span>
          </button>
        </div>

        <div className="reports-filter-row">
          <div className="reports-search">
            <Search size={18} />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search claims, categories, or status..."
              aria-label="Search reports"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
            aria-label="Filter by category"
          >
            {CATEGORIES.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(event.target.value)
            }
            aria-label="Filter by financial year"
          >
            {FINANCIAL_YEARS.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="reports-clear-button"
              onClick={clearFilters}
            >
              <X size={15} />

              <span>
                Clear
              </span>
            </button>
          )}
        </div>

        {exportMessage && (
          <p
            className="reports-export-message"
            role="status"
          >
            {exportMessage}
          </p>
        )}
      </section>

      {/* CLAIM REPORT TABLE */}

      <section className="reports-list-card">
        <div className="reports-list-header">
          <div>
            <h2>Claim Report</h2>

            <p>
              {loading
                ? "Loading your claim records..."
                : `${filteredClaims.length} record${
                    filteredClaims.length === 1 ? "" : "s"
                  } found`}
            </p>
          </div>

          <span className="reports-list-header-icon">
            <CalendarDays size={19} />
          </span>
        </div>

        {loading ? (
          <div className="reports-empty">
            <div className="reports-empty-icon">
              <RefreshCw
                size={23}
                className="is-spinning"
              />
            </div>

            <h3>Loading reports</h3>

            <p>
              Fetching your latest claim information from RIMS.
            </p>
          </div>
        ) : !error && filteredClaims.length === 0 ? (
          <div className="reports-empty">
            <div className="reports-empty-icon">
              <FileText size={25} />
            </div>

            <h3>
              {claims.length === 0
                ? "No claim records available"
                : "No matching claims"}
            </h3>

            <p>
              {claims.length === 0
                ? "Your claim records will appear here after they are created."
                : "Try changing your search or filters to find claim records."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                className="reports-clear-button"
                onClick={clearFilters}
              >
                <X size={15} />

                <span>
                  Clear filters
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th scope="col">Claim</th>
                  <th scope="col">Category</th>
                  <th scope="col">Financial Year</th>
                  <th scope="col">Date</th>
                  <th scope="col">Incentive</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredClaims.map((claim, index) => (
                  <tr
                    key={
                      claim._id ||
                      claim.id ||
                      `${claim.claimType}-${claim.createdAt}-${index}`
                    }
                  >
                    <td>
                      <div className="reports-name">
                        <span className="reports-file-icon">
                          <FileText size={17} />
                        </span>

                        <div>
                          <strong>
                            {getClaimTitle(claim)}
                          </strong>

                          <span>
                            {claim.reviewComment
                              ? claim.reviewComment
                              : `Claim #${String(
                                  claim._id || claim.id || index + 1
                                ).slice(-8)}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {formatCategory(claim.claimType)}
                    </td>

                    <td>
                      {claim.financialYear || "—"}
                    </td>

                    <td>
                      {formatDate(getClaimDate(claim))}
                    </td>

                    <td>
                      {formatCurrency(claim.incentiveAmount)}
                    </td>

                    <td>
                      <span
                        className={`reports-status reports-status-${normalizeText(
                          claim.status
                        ).replace(/\s+/g, "-")}`}
                      >
                        {getStatusLabel(claim.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredClaims.length > 0 && (
          <div className="reports-table-footer">
            <span>
              Showing {filteredClaims.length} of {claims.length} claims
            </span>

            <button
              type="button"
              className="reports-download-button"
              onClick={handleDownload}
            >
              <Download size={15} />

              <span>
                Download CSV
              </span>
            </button>
          </div>
        )}
      </section>

      {/* APPROVED INCENTIVE BREAKDOWNS */}

      {!loading && !error && (
        <section className="reports-list-card">
          <div className="reports-list-header">
            <div>
              <h2>Approved Incentive Breakdown</h2>

              <p>
                Approved claim totals returned by the RIMS reporting service.
              </p>
            </div>

            <span className="reports-list-header-icon">
              <IndianRupee size={19} />
            </span>
          </div>

          <div className="reports-breakdown-grid">
            <div className="reports-breakdown-panel">
              <h3>By Category</h3>

              {categoryReport.length === 0 ? (
                <p className="reports-breakdown-empty">
                  No approved category totals available.
                </p>
              ) : (
                <div className="reports-breakdown-list">
                  {categoryReport.map((item, index) => (
                    <div
                      className="reports-breakdown-row"
                      key={item._id || item.claimType || index}
                    >
                      <div>
                        <strong>
                          {formatCategory(
                            item._id || item.claimType
                          )}
                        </strong>

                        <span>
                          {Number(item.claimCount) || 0} approved claim
                          {(Number(item.claimCount) || 0) === 1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      <strong>
                        {formatCurrency(item.totalAmount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="reports-breakdown-panel">
              <h3>By Financial Year</h3>

              {financialYearReport.length === 0 ? (
                <p className="reports-breakdown-empty">
                  No approved financial-year totals available.
                </p>
              ) : (
                <div className="reports-breakdown-list">
                  {financialYearReport.map((item, index) => (
                    <div
                      className="reports-breakdown-row"
                      key={item._id || item.financialYear || index}
                    >
                      <div>
                        <strong>
                          {item._id || item.financialYear || "—"}
                        </strong>

                        <span>
                          {Number(item.claimCount) || 0} approved claim
                          {(Number(item.claimCount) || 0) === 1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      <strong>
                        {formatCurrency(item.totalAmount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default Reports;