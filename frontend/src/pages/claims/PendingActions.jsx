import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AlertCircle,
  FileCheck2,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./PendingActions.css";

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

const getClaimTitle = (claim) => {
  const formData = claim?.formData || {};

  return (
    formData.projectTitle ||
    formData.patentTitle ||
    formData.title ||
    formData.paperTitle ||
    formData.publicationTitle ||
    formData.awardTitle ||
    formData.bookTitle ||
    formData.chapterTitle ||
    formData.conferenceTitle ||
    formData.contentTitle ||
    formData.programName ||
    formData.courseName ||
    formData.activityTitle ||
    `${claimTypeLabels[claim?.claimType] || "Incentive Claim"}`
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatAmount = (amount) => {
  if (amount === undefined || amount === null) {
    return "Amount not specified";
  }

  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

function PendingActions() {
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("All Categories");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPendingActions = async () => {
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
            result?.message ||
              "Unable to retrieve pending actions."
          );
        }

        const receivedClaims =
          result?.data?.claims ||
          result?.data ||
          [];

        const returnedClaims = Array.isArray(receivedClaims)
          ? receivedClaims.filter(
              (claim) => claim.status === "RETURNED"
            )
          : [];

        setClaims(returnedClaims);
      } catch (fetchError) {
        console.error(
          "Pending actions error:",
          fetchError
        );

        setError(
          fetchError.message ||
            "Unable to load pending actions."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPendingActions();
  }, [navigate]);

  const pendingActions = useMemo(() => {
    return claims.map((claim) => ({
      id: claim._id,
      title: getClaimTitle(claim),
      category:
        claimTypeLabels[claim.claimType] ||
        claim.claimType ||
        "Incentive Claim",
      actionType: "Clarification Required",
      actionLabel: formatAmount(
        claim.incentiveAmount
      ),
      updated: formatDate(
        claim.updatedAt || claim.createdAt
      ),
      reviewComment:
        claim.reviewComment ||
        "Please review the claim and make the required corrections.",
    }));
  }, [claims]);

  const filteredActions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return pendingActions.filter((action) => {
      const matchesSearch =
        !search ||
        action.id.toLowerCase().includes(search) ||
        action.title.toLowerCase().includes(search) ||
        action.category.toLowerCase().includes(search) ||
        action.reviewComment.toLowerCase().includes(search);

      const matchesCategory =
        categoryFilter === "All Categories" ||
        action.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [
    pendingActions,
    searchTerm,
    categoryFilter,
  ]);

  const handleOpenClaim = (claimId) => {
    navigate(`/claims/${claimId}`);
  };

  return (
    <div className="rims-page pending-actions-page">
      {/* PAGE HEADER */}
      <section className="pending-page-header">
        <div className="pending-page-heading">
          <span className="page-eyebrow">
            CLAIMS WORKSPACE
          </span>

          <h1 className="page-title">
            Pending Actions
          </h1>

          <p className="page-description">
            Review and complete actions required
            from you for your incentive claims.
          </p>
        </div>
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rims-card pending-filter-card">
        <div className="pending-filter-heading">
          <div className="pending-filter-icon">
            <Search size={18} />
          </div>

          <div>
            <h2>Find an Action</h2>

            <p>
              Search or filter claims that require
              your response.
            </p>
          </div>
        </div>

        <div className="pending-filter-controls">
          {/* Search */}
          <label className="pending-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search by claim ID or title..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              aria-label="Search pending actions"
            />
          </label>

          {/* Category */}
          <select
            className="pending-filter-select"
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            aria-label="Filter by category"
          >
            <option value="All Categories">
              All Categories
            </option>

            {Object.values(claimTypeLabels).map(
              (category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              )
            )}
          </select>

          {/* Action Type */}
          <div className="pending-action-type-display">
            <span className="pending-action-type-label">
              Action Type
            </span>

            <span className="pending-action-type-value">
              Clarification Required
            </span>
          </div>
        </div>
      </section>

      {/* ACTION RECORDS */}
      <section className="rims-card pending-records-card">
        <div className="pending-records-header">
          <div>
            <h2>Actions Required</h2>

            <p>
              Claims that need your attention
            </p>
          </div>

          <span className="pending-record-count">
            {filteredActions.length}
          </span>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="pending-loading-state">
            Loading pending actions...
          </div>
        ) : error ? (
          /* ERROR */
          <div className="pending-error-state">
            <div className="pending-error-icon">
              <AlertCircle size={22} />
            </div>

            <h3>
              Unable to load pending actions
            </h3>

            <p>{error}</p>
          </div>
        ) : filteredActions.length === 0 ? (
          /* EMPTY STATE */
          <div className="pending-empty-state">
            <div className="pending-empty-icon">
              <FileCheck2 size={22} />
            </div>

            <h3>
              {pendingActions.length === 0
                ? "No pending actions"
                : "No matching actions"}
            </h3>

            <p>
              {pendingActions.length === 0
                ? "You're all caught up. Claims requiring your response will appear here."
                : "Try changing your search or category filter."}
            </p>
          </div>
        ) : (
          /* ACTION LIST */
          <div className="pending-claim-list">
            {filteredActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="pending-claim-row"
                onClick={() =>
                  handleOpenClaim(action.id)
                }
              >
                <div className="pending-claim-main">
                  <span className="pending-claim-id">
                    Claim ID: {action.id}
                  </span>

                  <strong>
                    {action.title}
                  </strong>

                  <span className="pending-claim-meta">
                    {action.category}
                    {" · "}
                    Updated {action.updated}
                  </span>
                </div>

                <div className="pending-claim-stage">
                  <span>
                    {action.actionType}
                  </span>
                </div>

                <div className="pending-claim-amount">
                  {action.actionLabel}
                </div>

                <ArrowRight
                  size={17}
                  className="pending-claim-arrow"
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default PendingActions;