import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileArchive,
  FileCheck2,
  Plus,
  WalletCards,
} from "lucide-react";

import "./Dashboard.css";

const API_BASE_URL = "http://localhost:5000";

function Dashboard() {
  const navigate = useNavigate();

  const [faculty, setFaculty] = useState(() => {
    try {
      const storedUser =
        localStorage.getItem("rimsUser");

      return storedUser
        ? JSON.parse(storedUser)
        : null;
    } catch (error) {
      console.error(
        "Unable to read stored faculty profile:",
        error
      );

      return null;
    }
  });

  const [dashboardData, setDashboardData] =
    useState({
      claims: {
        totalClaims: 0,
        submittedClaims: 0,
        underReviewClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
        draftClaims: 0,
        approvedAmount: 0,
      },

      notifications: {
        unreadCount: 0,
      },
    });

  const [loadingDashboard, setLoadingDashboard] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState("");

  // =========================================================
  // LOAD DASHBOARD DATA
  // =========================================================

  useEffect(() => {
    const loadDashboard = async () => {
      const token =
        localStorage.getItem("rimsToken");

      if (!token) {
        setLoadingDashboard(false);
        navigate("/", { replace: true });
        return;
      }

      try {
        setDashboardError("");

        const response = await fetch(
          `${API_BASE_URL}/api/dashboard`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result =
          await response.json();

        // ---------------------------------------------------
        // AUTHENTICATION FAILED
        // ---------------------------------------------------

        if (response.status === 401) {
          localStorage.removeItem(
            "rimsToken"
          );

          localStorage.removeItem(
            "rimsUser"
          );

          navigate("/", {
            replace: true,
          });

          return;
        }

        // ---------------------------------------------------
        // OTHER API ERROR
        // ---------------------------------------------------

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to load dashboard"
          );
        }

        // ---------------------------------------------------
        // REAL DASHBOARD DATA
        // ---------------------------------------------------

        const data =
          result.data;

        setFaculty(data.user);

        setDashboardData({
          claims: {
            totalClaims:
              data.claims?.totalClaims ||
              0,

            submittedClaims:
              data.claims
                ?.submittedClaims ||
              0,

            underReviewClaims:
              data.claims
                ?.underReviewClaims ||
              0,

            approvedClaims:
              data.claims
                ?.approvedClaims ||
              0,

            rejectedClaims:
              data.claims
                ?.rejectedClaims ||
              0,

            draftClaims:
              data.claims?.draftClaims ||
              0,

            approvedAmount:
              data.claims
                ?.approvedAmount ||
              0,
          },

          notifications: {
            unreadCount:
              data.notifications
                ?.unreadCount ||
              0,
          },
        });

        localStorage.setItem(
          "rimsUser",
          JSON.stringify(data.user)
        );
      } catch (error) {
        console.error(
          "Dashboard request failed:",
          error
        );

        setDashboardError(
          error.message ||
            "Unable to load dashboard data"
        );
      } finally {
        setLoadingDashboard(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  // =========================================================
  // GET FIRST NAME
  // =========================================================

  const getFirstName = (name = "") => {
    return (
      name.trim().split(/\s+/)[0] ||
      "Faculty"
    );
  };

  // =========================================================
  // GET GREETING
  // =========================================================

  const getGreeting = () => {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  };

  // =========================================================
  // DASHBOARD VALUES
  // =========================================================

  const claims =
    dashboardData.claims;

  const notifications =
    dashboardData.notifications;

  const facultyName =
    faculty?.fullName || "Faculty";

  /*
   * Claims that currently require faculty action.
   *
   * RETURNED claims need correction/resubmission.
   * REJECTED claims are shown separately through the
   * claims page and are not counted as pending action.
   */
  const attentionCount =
    claims.returnedClaims || 0;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="rims-page dashboard-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="dashboard-header">

        <div className="dashboard-heading">

          <span className="page-eyebrow">
            Faculty Workspace
          </span>

          <h1 className="page-title">
            {getGreeting()},{" "}
            {loadingDashboard
              ? "Faculty"
              : getFirstName(
                  facultyName
                )}
          </h1>

          <p className="page-description">
            Manage your incentive claims,
            track their progress, and respond
            to actions that need your attention.
          </p>

        </div>

        <button
          type="button"
          className="dashboard-new-claim"
          onClick={() =>
            navigate(
              "/incentive/research-project"
            )
          }
        >
          <Plus
            size={17}
            strokeWidth={2}
          />

          <span>
            New Claim
          </span>
        </button>

      </section>

      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {dashboardError && (
        <section className="rims-card dashboard-error-card">
          <strong>
            Unable to load dashboard
          </strong>

          <span>
            {dashboardError}
          </span>
        </section>
      )}

      {/* =====================================================
          CLAIM SUMMARY
      ===================================================== */}

      <section
        className="dashboard-stat-grid"
        aria-label="Faculty claim summary"
      >

        {/* ===================================================
            MY CLAIMS
        =================================================== */}

        <button
          type="button"
          className="dashboard-stat-card"
          onClick={() =>
            navigate("/claims")
          }
          aria-label="View all claims"
        >

          <div className="stat-icon">

            <FileCheck2
              size={20}
              strokeWidth={1.9}
            />

          </div>

          <div className="stat-content">

            <div className="stat-heading-row">

              <span className="stat-label">
                My Claims
              </span>

              <ArrowRight
                size={15}
                className="stat-arrow"
              />

            </div>

            <strong className="stat-value">
              {loadingDashboard
                ? "—"
                : claims.totalClaims}
            </strong>

            <span className="stat-meta">
              Total claims created
            </span>

          </div>

        </button>

        {/* ===================================================
            IN REVIEW
        =================================================== */}

        <button
          type="button"
          className="dashboard-stat-card"
          onClick={() =>
            navigate(
              "/pending-actions"
            )
          }
          aria-label="View claims in review"
        >

          <div className="stat-icon stat-icon-review">

            <Clock3
              size={20}
              strokeWidth={1.9}
            />

          </div>

          <div className="stat-content">

            <div className="stat-heading-row">

              <span className="stat-label">
                In Review
              </span>

              <ArrowRight
                size={15}
                className="stat-arrow"
              />

            </div>

            <strong className="stat-value">
              {loadingDashboard
                ? "—"
                : claims.underReviewClaims}
            </strong>

            <span className="stat-meta">
              Currently in workflow
            </span>

          </div>

        </button>

        {/* ===================================================
            DRAFTS
        =================================================== */}

        <button
          type="button"
          className="dashboard-stat-card"
          onClick={() =>
            navigate("/drafts")
          }
          aria-label="View draft claims"
        >

          <div className="stat-icon stat-icon-drafts">

            <FileArchive
              size={20}
              strokeWidth={1.9}
            />

          </div>

          <div className="stat-content">

            <div className="stat-heading-row">

              <span className="stat-label">
                Drafts
              </span>

              <ArrowRight
                size={15}
                className="stat-arrow"
              />

            </div>

            <strong className="stat-value">
              {loadingDashboard
                ? "—"
                : claims.draftClaims}
            </strong>

            <span className="stat-meta">
              Not yet submitted
            </span>

          </div>

        </button>

        {/* ===================================================
            CREDITED
        =================================================== */}

        <div
          className="dashboard-stat-card dashboard-stat-card-static"
          aria-label="Total incentives credited"
        >

          <div className="stat-icon stat-icon-credited">

            <WalletCards
              size={20}
              strokeWidth={1.9}
            />

          </div>

          <div className="stat-content">

            <div className="stat-heading-row">

              <span className="stat-label">
                Credited
              </span>

            </div>

            <strong className="stat-value">
              {loadingDashboard
                ? "—"
                : `₹${Number(
                    claims.approvedAmount ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )}`}
            </strong>

            <span className="stat-meta">
              Incentives credited
            </span>

          </div>

        </div>

      </section>

      {/* =====================================================
          NEEDS YOUR ATTENTION
      ===================================================== */}

      <section className="dashboard-attention-section">

        <article className="rims-card dashboard-attention-card">

          <div className="dashboard-section-header">

            <div className="dashboard-section-heading">

              <div className="dashboard-section-icon attention-icon">

                <Clock3
                  size={17}
                  strokeWidth={1.9}
                />

              </div>

              <div>

                <h2 className="dashboard-card-title">
                  Needs Your Attention
                </h2>

                <p className="dashboard-card-subtitle">
                  Items that require a response
                  from you
                </p>

              </div>

            </div>

            <span className="attention-status">
              {loadingDashboard
                ? "—"
                : attentionCount}
            </span>

          </div>

          <div className="dashboard-attention-body">

            {attentionCount > 0 ? (
              <>
                <div className="dashboard-success-icon">

                  <Clock3
                    size={20}
                    strokeWidth={1.9}
                  />

                </div>

                <div className="dashboard-attention-message">

                  <strong>
                    {attentionCount} claim
                    {attentionCount !== 1
                      ? "s"
                      : ""}{" "}
                    require
                    {attentionCount === 1
                      ? "s"
                      : ""} your attention
                  </strong>

                  <span>
                    Review returned claims
                    and make the required
                    corrections.
                  </span>

                </div>

                <button
                  type="button"
                  className="dashboard-attention-label"
                  onClick={() =>
                    navigate(
                      "/pending-actions"
                    )
                  }
                >
                  View actions
                </button>
              </>
            ) : (
              <>
                <div className="dashboard-success-icon">

                  <CheckCircle2
                    size={20}
                    strokeWidth={1.9}
                  />

                </div>

                <div className="dashboard-attention-message">

                  <strong>
                    You're all caught up
                  </strong>

                  <span>
                    No claims currently require
                    your action.
                  </span>

                </div>

                <span className="dashboard-attention-label">
                  No action required
                </span>
              </>
            )}

          </div>

        </article>

      </section>

      {/* =====================================================
          RECENT CLAIMS
      ===================================================== */}

      <section className="rims-card dashboard-recent-card">

        <div className="dashboard-section-header">

          <div className="dashboard-section-heading">

            <div className="dashboard-section-icon">

              <FileCheck2
                size={17}
                strokeWidth={1.9}
              />

            </div>

            <div>

              <h2 className="dashboard-card-title">
                Recent Claims
              </h2>

              <p className="dashboard-card-subtitle">
                Your latest incentive activity
              </p>

            </div>

          </div>

          <button
            type="button"
            className="dashboard-view-all"
            onClick={() =>
              navigate("/claims")
            }
          >

            <span>
              View all
            </span>

            <ArrowRight
              size={15}
              strokeWidth={2}
            />

          </button>

        </div>

        {/* ===================================================
            CURRENT EMPTY STATE
        =================================================== */}

        {claims.totalClaims === 0 &&
        !loadingDashboard ? (
          <div className="dashboard-recent-empty">

            <div className="dashboard-recent-empty-icon">

              <FileCheck2
                size={20}
                strokeWidth={1.8}
              />

            </div>

            <strong>
              No claims yet
            </strong>

            <span>
              Your incentive activity will
              appear here once you create
              your first claim.
            </span>

            <button
              type="button"
              className="dashboard-empty-action"
              onClick={() =>
                navigate(
                  "/incentive/research-project"
                )
              }
            >

              <Plus
                size={14}
                strokeWidth={2}
              />

              <span>
                Create your first claim
              </span>

              <ArrowRight
                size={14}
                strokeWidth={2}
              />

            </button>

          </div>
        ) : (
          <div className="dashboard-recent-summary">

            <div className="dashboard-recent-summary-row">

              <div>
                <strong>
                  {claims.totalClaims}
                </strong>

                <span>
                  Total claims
                </span>
              </div>

              <div>
                <strong>
                  {claims.submittedClaims}
                </strong>

                <span>
                  Submitted
                </span>
              </div>

              <div>
                <strong>
                  {claims.approvedClaims}
                </strong>

                <span>
                  Approved
                </span>
              </div>

              <div>
                <strong>
                  {claims.rejectedClaims}
                </strong>

                <span>
                  Rejected
                </span>
              </div>

            </div>

            <div className="dashboard-recent-footer">

              <span>
                {notifications.unreadCount > 0
                  ? `${notifications.unreadCount} unread notification${
                      notifications.unreadCount !==
                      1
                        ? "s"
                        : ""
                    }`
                  : "No unread notifications"}
              </span>

              <button
                type="button"
                className="dashboard-view-all"
                onClick={() =>
                  navigate(
                    "/claims"
                  )
                }
              >
                <span>
                  View claims
                </span>

                <ArrowRight
                  size={15}
                  strokeWidth={2}
                />
              </button>

            </div>

          </div>
        )}

      </section>

    </div>
  );
}

export default Dashboard;