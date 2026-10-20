import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  FileArchive,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./Drafts.css";

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

const claimTypeRoutes = {
  RESEARCH_PROJECT: "/incentive/research-project",
  PATENT: "/incentive/patent",
  JOURNAL_PUBLICATION: "/incentive/journal-publication",
  RESEARCH_AWARD: "/incentive/research-award",
  UNDERGRADUATE_RESEARCH:
    "/incentive/undergraduate-research",
  POSTGRADUATE_RESEARCH:
    "/incentive/postgraduate-research",
  BOOK_CHAPTER: "/incentive/book-chapter",
  CONFERENCE_PROCEEDINGS:
    "/incentive/conference-proceedings",
  PHD_SUPERVISION: "/incentive/phd-supervision",
  E_CONTENT: "/incentive/e-content",
  PROFESSIONAL_DEVELOPMENT:
    "/incentive/professional-development",
};

const getClaimTitle = (claim) => {
  const formData = claim?.formData || {};

  return (
    formData.researchTitle ||
    formData.projectTitle ||
    formData.title ||
    formData.patentTitle ||
    formData.journalTitle ||
    formData.publicationTitle ||
    formData.awardTitle ||
    formData.bookTitle ||
    formData.chapterTitle ||
    formData.conferenceTitle ||
    formData.paperTitle ||
    formData.courseTitle ||
    formData.programTitle ||
    formData.trainingTitle ||
    formData.activityTitle ||
    claimTypeLabels[claim?.claimType] ||
    "Untitled Draft"
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
  const numericAmount = Number(amount || 0);

  return `₹${numericAmount.toLocaleString("en-IN")}`;
};

function Drafts() {
  const navigate = useNavigate();

  const [draftClaims, setDraftClaims] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("All Categories");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDrafts = async () => {
      const token =
        localStorage.getItem("rimsToken");

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
              "Unable to load your drafts."
          );
        }

        const claims =
          result?.data?.claims ||
          result?.data ||
          [];

        const drafts = Array.isArray(claims)
          ? claims
              .filter(
                (claim) =>
                  claim.status === "DRAFT"
              )
              .map((claim) => ({
                id: claim._id,
                title: getClaimTitle(claim),
                category:
                  claimTypeLabels[
                    claim.claimType
                  ] ||
                  claim.claimType ||
                  "Other",
                financialYear:
                  claim.financialYear ||
                  "Not available",
                amount: formatAmount(
                  claim.incentiveAmount
                ),
                updated: formatDate(
                  claim.updatedAt ||
                    claim.createdAt
                ),
                claimType: claim.claimType,
                originalClaim: claim,
              }))
          : [];

        setDraftClaims(drafts);
      } catch (fetchError) {
        console.error(
          "Fetch drafts error:",
          fetchError
        );

        setError(
          fetchError.message ||
            "Unable to load your drafts."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, [navigate]);

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        draftClaims.map(
          (draft) => draft.category
        )
      ),
    ];

    return [
      "All Categories",
      ...uniqueCategories,
    ];
  }, [draftClaims]);

  const filteredDrafts = draftClaims.filter(
    (draft) => {
      const search =
        searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        draft.id
          .toLowerCase()
          .includes(search) ||
        draft.title
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        categoryFilter === "All Categories" ||
        draft.category === categoryFilter;

      return (
        matchesSearch &&
        matchesCategory
      );
    }
  );

  const handleContinueDraft = (draft) => {
    const route =
      claimTypeRoutes[draft.claimType];

    if (!route) {
      alert(
        "The incentive form for this draft could not be found."
      );
      return;
    }

    navigate(route, {
      state: {
        draftClaim: draft.originalClaim,
        isEditingDraft: true,
      },
    });
  };

  return (
    <div className="rims-page drafts-page">
      {/* PAGE HEADER */}
      <section className="drafts-page-header">
        <div className="drafts-page-heading">
          <span className="page-eyebrow">
            CLAIMS WORKSPACE
          </span>

          <h1 className="page-title">
            Drafts
          </h1>

          <p className="page-description">
            Continue working on incentive claims
            you have not submitted yet.
          </p>
        </div>
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rims-card drafts-filter-card">
        <div className="drafts-filter-heading">
          <div className="drafts-filter-icon">
            <Search size={18} />
          </div>

          <div>
            <h2>Find a Draft</h2>

            <p>
              Search or filter your saved claim
              drafts.
            </p>
          </div>
        </div>

        <div className="drafts-filter-controls">
          {/* Search */}
          <label className="drafts-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search by claim ID or title..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              aria-label="Search drafts"
            />
          </label>

          {/* Category */}
          <select
            className="drafts-filter-select"
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
            aria-label="Filter drafts by category"
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
        </div>
      </section>

      {/* DRAFT RECORDS */}
      <section className="rims-card drafts-records-card">
        <div className="drafts-records-header">
          <div>
            <h2>Saved Drafts</h2>

            <p>
              Claims you have started but not
              submitted
            </p>
          </div>

          <span className="drafts-record-count">
            {loading
              ? "..."
              : filteredDrafts.length}
          </span>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="drafts-empty-state">
            <div className="drafts-empty-icon">
              <FileArchive size={22} />
            </div>

            <h3>Loading drafts...</h3>

            <p>
              Retrieving your saved claims.
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="drafts-empty-state">
            <div className="drafts-empty-icon">
              <FileArchive size={22} />
            </div>

            <h3>Unable to load drafts</h3>

            <p>{error}</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !error &&
          filteredDrafts.length === 0 && (
            <div className="drafts-empty-state">
              <div className="drafts-empty-icon">
                <FileArchive size={22} />
              </div>

              <h3>
                {draftClaims.length === 0
                  ? "No drafts yet"
                  : "No matching drafts"}
              </h3>

              <p>
                {draftClaims.length === 0
                  ? "Your saved incentive claim drafts will appear here."
                  : "Try changing your search or category filter."}
              </p>
            </div>
          )}

        {/* DRAFT LIST */}
        {!loading &&
          !error &&
          filteredDrafts.length > 0 && (
            <div className="drafts-list">
              {filteredDrafts.map(
                (draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    className="draft-row"
                    onClick={() =>
                      handleContinueDraft(
                        draft
                      )
                    }
                  >
                    <div className="draft-main">
                      <span className="draft-id">
                        {draft.id}
                      </span>

                      <strong>
                        {draft.title}
                      </strong>

                      <span className="draft-meta">
                        {draft.category}
                        {" · "}
                        FY{" "}
                        {draft.financialYear}
                      </span>
                    </div>

                    <div className="draft-saved">
                      <span>
                        Last saved
                      </span>

                      <strong>
                        {draft.updated}
                      </strong>
                    </div>

                    <div className="draft-action">
                      <span>
                        {draft.amount}
                      </span>

                      <strong>
                        Continue
                      </strong>
                    </div>

                    <ArrowRight
                      size={17}
                      className="draft-arrow"
                    />
                  </button>
                )
              )}
            </div>
          )}
      </section>
    </div>
  );
}

export default Drafts;