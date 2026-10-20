import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

import "./Profile.css";

const API_BASE_URL = "http://localhost:5000";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // GET AUTH TOKEN
  // =========================================================

  const getToken = () => {
    return (
      localStorage.getItem("rimsToken") ||
      localStorage.getItem("token")
    );
  };

  // =========================================================
  // HANDLE UNAUTHORIZED SESSION
  // =========================================================

  const handleUnauthorized = () => {
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("token");
    localStorage.removeItem("rimsUser");
    localStorage.removeItem("user");

    setUser(null);
    setError(
      "Your session has expired. Please log in again."
    );
  };

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  useEffect(() => {
    const loadProfile = async () => {
      const token = getToken();

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let result = {};

        try {
          result = await response.json();
        } catch {
          result = {};
        }

        // ---------------------------------------------------
        // SESSION EXPIRED
        // ---------------------------------------------------

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        // ---------------------------------------------------
        // REQUEST FAILED
        // ---------------------------------------------------

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Unable to retrieve your profile."
          );
        }

        // ---------------------------------------------------
        // GET REAL USER PROFILE
        // ---------------------------------------------------

        const profile = result.data?.user;

        if (!profile) {
          throw new Error(
            "Profile information is unavailable."
          );
        }

        // ---------------------------------------------------
        // STORE REAL PROFILE IN STATE
        // ---------------------------------------------------

        setUser(profile);

        // Cache only — backend remains the source of truth
        localStorage.setItem(
          "rimsUser",
          JSON.stringify(profile)
        );
      } catch (err) {
        console.error(
          "Profile request failed:",
          err
        );

        setError(
          err.message ||
            "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // =========================================================
  // LOGIN REDIRECT
  // =========================================================

  const handleLoginRedirect = () => {
    window.location.href = "/";
  };

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-state-card">
          <div className="profile-spinner" />

          <h2>Loading profile...</h2>

          <p>
            Please wait while your account information
            is being retrieved.
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR STATE
  // =========================================================

  if (error) {
    return (
      <main className="profile-page">
        <div className="profile-state-card profile-error-card">
          <div className="profile-state-icon">
            <ShieldCheck size={24} />
          </div>

          <h2>Unable to load profile</h2>

          <p>{error}</p>

          <button
            type="button"
            className="profile-retry-button"
            onClick={handleLoginRedirect}
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  // =========================================================
  // EMPTY STATE
  // =========================================================

  if (!user) {
    return (
      <main className="profile-page">
        <div className="profile-state-card">
          <div className="profile-state-icon">
            <User size={24} />
          </div>

          <h2>Profile unavailable</h2>

          <p>
            No profile information is currently
            available for your account.
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // PROFILE PHOTO
  // =========================================================

  const profilePhoto = user.profilePhoto
    ? user.profilePhoto.startsWith("http")
      ? user.profilePhoto
      : `${API_BASE_URL}${user.profilePhoto}`
    : null;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="profile-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="profile-page-header">
        <div>
          <span className="page-eyebrow">
            ACCOUNT
          </span>

          <h1 className="page-title">
            My Profile
          </h1>

          <p className="page-description">
            View your registered faculty information
            and account details.
          </p>
        </div>
      </section>

      {/* =====================================================
          PROFILE IDENTITY
      ===================================================== */}

      <section className="rims-card profile-identity-card">

        <div className="profile-cover-area">
          <div className="profile-photo-container">

            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={
                  user.fullName ||
                  "Faculty profile"
                }
                className="profile-photo"
              />
            ) : (
              <div className="profile-photo-placeholder">
                <User size={42} />
              </div>
            )}

            <div
              className="profile-photo-badge"
              title="Profile photograph"
            >
              <Camera size={14} />
            </div>

          </div>
        </div>

        <div className="profile-identity-content">

          <div className="profile-identity-main">
            <h2>
              {user.fullName || "—"}
            </h2>

            <p>
              {user.designation || "—"}
            </p>
          </div>

          <div className="profile-account-status">
            <CheckCircle2 size={16} />

            <span>
              {user.accountStatus || "—"}
            </span>
          </div>

        </div>

      </section>

      {/* =====================================================
          PERSONAL INFORMATION
      ===================================================== */}

      <section className="rims-card profile-information-card">

        <div className="profile-card-header">

          <div className="profile-card-header-icon">
            <User size={19} />
          </div>

          <div>
            <h2>Personal Information</h2>

            <p>
              Information associated with your
              RIMS account.
            </p>
          </div>

        </div>

        <div className="profile-information-grid">

          <div className="profile-information-item">
            <span className="profile-information-label">
              Full Name
            </span>

            <div className="profile-information-value">
              <User size={17} />

              <span>
                {user.fullName || "—"}
              </span>
            </div>
          </div>

          <div className="profile-information-item">
            <span className="profile-information-label">
              Employee ID
            </span>

            <div className="profile-information-value">
              <Briefcase size={17} />

              <span>
                {user.employeeId || "—"}
              </span>
            </div>
          </div>

          <div className="profile-information-item">
            <span className="profile-information-label">
              Email Address
            </span>

            <div className="profile-information-value">
              <Mail size={17} />

              <span>
                {user.email || "—"}
              </span>
            </div>
          </div>

          <div className="profile-information-item">
            <span className="profile-information-label">
              Department
            </span>

            <div className="profile-information-value">
              <Building2 size={17} />

              <span>
                {user.department || "—"}
              </span>
            </div>
          </div>

          <div className="profile-information-item">
            <span className="profile-information-label">
              Designation
            </span>

            <div className="profile-information-value">
              <Briefcase size={17} />

              <span>
                {user.designation || "—"}
              </span>
            </div>
          </div>

          <div className="profile-information-item">
            <span className="profile-information-label">
              Account Role
            </span>

            <div className="profile-information-value">
              <ShieldCheck size={17} />

              <span>
                {user.role || "—"}
              </span>
            </div>
          </div>

        </div>

      </section>

      {/* =====================================================
          ACCOUNT INFORMATION
      ===================================================== */}

      <section className="rims-card profile-account-card">

        <div className="profile-card-header">

          <div className="profile-card-header-icon">
            <ShieldCheck size={19} />
          </div>

          <div>
            <h2>Account Information</h2>

            <p>
              Current status and access information.
            </p>
          </div>

        </div>

        <div className="profile-account-grid">

          <div className="profile-account-item">
            <span>Account Status</span>

            <strong
              className={`profile-status ${
                user.accountStatus
                  ? user.accountStatus.toLowerCase()
                  : ""
              }`}
            >
              {user.accountStatus || "—"}
            </strong>
          </div>

          <div className="profile-account-item">
            <span>Account Role</span>

            <strong>
              {user.role || "—"}
            </strong>
          </div>

          <div className="profile-account-item">
            <span>Employee ID</span>

            <strong>
              {user.employeeId || "—"}
            </strong>
          </div>

        </div>

      </section>

    </main>
  );
}

export default Profile;