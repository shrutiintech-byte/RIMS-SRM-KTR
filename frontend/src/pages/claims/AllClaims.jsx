import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ChevronDown,
  FileCheck2,
  Filter,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";

import "./AllClaims.css";

const API_BASE_URL = "http://localhost:5000";

const categories = [
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

const statuses = [
  "All Statuses",
  "Draft",
  "Submitted",
  "Under Review",
  "Clarification Required",
  "Approved",
  "Rejected",
];

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

const statusLabels = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  RETURNED: "Clarification Required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const getClaimTitle = (claim) => {
  const formData = claim.formData || {};

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
    "Untitled Claim"
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (amount) => {
  const numericAmount = Number(amount || 0);

  return `₹${numericAmount.toLocaleString("en-IN")}`;
};

function AllClaims() {
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All Statuses");
  const [categoryFilter, setCategoryFilter] =
    useState("All Categories");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClaims = async () => {
      const token = localStorage.getItem("rimsToken");

      if (!token) {
        navigate("/");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/claims`,
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
            result.message ||
              "Unable to retrieve claims"
          );
        }

        const receivedClaims =
          result?.data?.claims || [];

        setClaims(receivedClaims);
      } catch (fetchError) {
        console.error(
          "Fetch claims error:",
          fetchError
        );

        setError(
          fetchError.message ||
            "Unable to load your claims. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, [navigate]);

  const formattedClaims = useMemo(() => {
    return claims.map((claim) => {
      const category =
        claimTypeLabels[claim.claimType] ||
        claim.claimType ||
        "-";

      const status =
        statusLabels[claim.status] ||
        claim.status ||
        "-";

      return {
        ...claim,
        claimId: claim._id,
        category,
        title: getClaimTitle(claim),
        createdOn: formatDate(claim.createdAt),
        amount: formatAmount(
          claim.incentiveAmount
        ),
        status,
      };
    });
  }, [claims]);

  const filteredClaims = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    return formattedClaims.filter((claim) => {
      const matchesSearch =
        !search ||
        claim.claimId
          ?.toLowerCase()
          .includes(search) ||
        claim.title
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "All Statuses" ||
        claim.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All Categories" ||
        claim.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    formattedClaims,
    searchTerm,
    statusFilter,
    categoryFilter,
  ]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "All Statuses" ||
    categoryFilter !== "All Categories";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All Statuses");
    setCategoryFilter("All Categories");
  };

  const handleViewClaim = (claimId) => {
    navigate(`/claims/${claimId}`);
  };

  return (
    <div className="rims-page claims-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <section className="claims-page-header">

        <div className="claims-heading">

          <span className="claims-page-eyebrow">
            Claims Workspace
          </span>

          <h1 className="claims-page-title">
            All Claims
          </h1>

          <p className="claims-page-description">
            View and manage all your research incentive
            claims in one place.
          </p>

        </div>

      </section>


      {/* =====================================================
          SEARCH & FILTERS
          ===================================================== */}

      <section className="claims-filter-card">

        <div className="claims-filter-header">

          <div className="claims-filter-title">

            <div className="claims-filter-title-icon">
              <Filter size={16} />
            </div>

            <div>

              <h2>
                Find a Claim
              </h2>

              <p>
                Search or filter your claims.
              </p>

            </div>

          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="claims-clear-button"
              onClick={clearFilters}
            >
              <RotateCcw size={14} />
              Clear filters
            </button>
          )}

        </div>


        <div className="claims-filter-controls">

          {/* Search */}

          <div className="claims-search-wrapper">

            <Search
              size={17}
              className="claims-search-icon"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by claim ID or title..."
              className="claims-search-input"
            />

          </div>


          {/* Status */}

          <div className="claims-select-wrapper">

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="claims-select"
            >

              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}

            </select>

            <ChevronDown
              size={16}
              className="claims-select-icon"
            />

          </div>


          {/* Category */}

          <div className="claims-select-wrapper">

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
              className="claims-select"
            >

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}

            </select>

            <ChevronDown
              size={16}
              className="claims-select-icon"
            />

          </div>

        </div>

      </section>


      {/* =====================================================
          CLAIM RECORDS
          ===================================================== */}

      <section className="claims-table-card">

        <div className="claims-table-header">

          <div>

            <h2>
              Claim Records
            </h2>

            <p>
              {loading
                ? "Loading your claims..."
                : filteredClaims.length === 0
                ? "No claim records available"
                : `${filteredClaims.length} claim${
                    filteredClaims.length !== 1
                      ? "s"
                      : ""
                  } found`}
            </p>

          </div>

          <span className="claims-record-count">
            {loading
              ? "..."
              : filteredClaims.length}
          </span>

        </div>


        {/* =====================================================
            ERROR STATE
            ===================================================== */}

        {error && !loading && (

          <div className="claims-empty-state">

            <div className="claims-empty-icon">
              <FileCheck2 size={24} />
            </div>

            <h3>
              Unable to load claims
            </h3>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="claims-empty-secondary-button"
              onClick={() =>
                window.location.reload()
              }
            >
              <RotateCcw size={14} />
              Try again
            </button>

          </div>

        )}


        {/* =====================================================
            LOADING STATE
            ===================================================== */}

        {loading && !error && (

          <div className="claims-empty-state">

            <div className="claims-empty-icon">
              <FileCheck2 size={24} />
            </div>

            <h3>
              Loading claims
            </h3>

            <p>
              Please wait while we retrieve your claims.
            </p>

          </div>

        )}


        {/* =====================================================
            DATA TABLE
            ===================================================== */}

        {!loading &&
          !error &&
          filteredClaims.length > 0 && (

            <div className="claims-table-container">

              <table className="claims-table">

                <thead>

                  <tr>
                    <th>Claim ID</th>
                    <th>Category</th>
                    <th>Claim Title</th>
                    <th>Created On</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredClaims.map((claim) => (

                    <tr key={claim.claimId}>

                      <td>
                        {claim.claimId}
                      </td>

                      <td>
                        {claim.category}
                      </td>

                      <td>
                        {claim.title}
                      </td>

                      <td>
                        {claim.createdOn}
                      </td>

                      <td>
                        {claim.amount}
                      </td>

                      <td>
                        {claim.status}
                      </td>

                      <td>

                        <button
                          type="button"
                          className="claims-row-action"
                          onClick={() =>
                            handleViewClaim(
                              claim.claimId
                            )
                          }
                        >
                          View
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}


        {/* =====================================================
            EMPTY STATE
            ===================================================== */}

        {!loading &&
          !error &&
          filteredClaims.length === 0 && (

            <div className="claims-empty-state">

              <div className="claims-empty-icon">
                <FileCheck2 size={24} />
              </div>

              <h3>
                {hasActiveFilters
                  ? "No matching claims"
                  : "No claims yet"}
              </h3>

              <p>
                {hasActiveFilters
                  ? "No claims match your current search or filters."
                  : "Your research incentive claims will appear here once you create one."}
              </p>

              {hasActiveFilters ? (

                <button
                  type="button"
                  className="claims-empty-secondary-button"
                  onClick={clearFilters}
                >
                  <RotateCcw size={14} />
                  Reset filters
                </button>

              ) : (

                <button
                  type="button"
                  className="claims-empty-primary-button"
                  onClick={() =>
                    navigate(
                      "/incentive/research-project"
                    )
                  }
                >
                  <Plus size={15} />
                  Create your first claim
                </button>

              )}

            </div>

          )}

      </section>

    </div>
  );
}

export default AllClaims;