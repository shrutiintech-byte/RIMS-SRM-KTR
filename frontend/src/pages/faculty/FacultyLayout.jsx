import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
} from "lucide-react";

import FacultySidebar from "../../components/layout/FacultySidebar";

import "./FacultyLayout.css";

const API_BASE_URL = "http://localhost:5000";

function FacultyLayout({
  children,
  activePath = "/dashboard",
}) {
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const [faculty, setFaculty] = useState(null);

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [profilePhotoUrl, setProfilePhotoUrl] =
    useState(null);

  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);

  const profileMenuRef = useRef(null);

  /* =======================================================
     LOAD LOGGED-IN FACULTY
  ======================================================= */

  useEffect(() => {
    const loadFacultyProfile = async () => {
      try {
        const token =
          localStorage.getItem("rimsToken");

        if (!token) {
          setLoadingProfile(false);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          setFaculty(result.data.user);
        } else {
          console.error(
            "Unable to load faculty profile:",
            result.message
          );
        }
      } catch (error) {
        console.error(
          "Faculty profile request failed:",
          error
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    loadFacultyProfile();
  }, []);

  /* =======================================================
     LOAD PROFILE PHOTO
  ======================================================= */

  useEffect(() => {
    if (!faculty?.profilePhoto) {
      setProfilePhotoUrl(null);
      return;
    }

    const photoPath = faculty.profilePhoto;

    /*
      MongoDB stores:

      /uploads/profile-photos/profile-xxxx.jpg

      Convert it into:

      http://localhost:5000/uploads/profile-photos/profile-xxxx.jpg
    */

    const photoUrl = photoPath.startsWith("http")
      ? photoPath
      : `${API_BASE_URL}${photoPath}`;

    setProfilePhotoUrl(photoUrl);
  }, [faculty?.profilePhoto]);

  /* =======================================================
     CLOSE PROFILE MENU ON OUTSIDE CLICK
  ======================================================= */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target
        )
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* =======================================================
     CLOSE MOBILE SIDEBAR WITH ESC
  ======================================================= */

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* =======================================================
     PROFILE HELPERS
  ======================================================= */

  const getInitials = (name = "") => {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "F";
    }

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return `${parts[0].charAt(0)}${
      parts[parts.length - 1].charAt(0)
    }`.toUpperCase();
  };

  const facultyName =
    faculty?.fullName || "Faculty";

  const facultyDesignation =
    faculty?.designation || "Faculty";

  const facultyDepartment =
    faculty?.department || "—";

  const facultyEmployeeId =
    faculty?.employeeId || "—";

  const facultyRole =
    faculty?.role || "FACULTY";

  const facultyAccountStatus =
    faculty?.accountStatus || "ACTIVE";

  const facultyInitials =
    getInitials(facultyName);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const handleSidebarNavigation = () => {
    setMobileSidebarOpen(false);
  };

  const handleProfileNavigation = (path) => {
    setProfileMenuOpen(false);
    setMobileSidebarOpen(false);
    navigate(path);
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("rimsUser");

    setProfileMenuOpen(false);

    navigate("/", {
      replace: true,
    });
  };

  /* =======================================================
     COMPONENT
  ======================================================= */

  return (
    <div
      className={`faculty-app ${
        sidebarCollapsed
          ? "sidebar-collapsed"
          : ""
      } ${
        mobileSidebarOpen
          ? "mobile-sidebar-open"
          : ""
      }`}
    >
      {/* =================================================
          SIDEBAR
      ================================================= */}

      <FacultySidebar
        activePath={activePath}
        collapsed={sidebarCollapsed}
        onNavigate={handleSidebarNavigation}
      />

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {mobileSidebarOpen && (
        <button
          type="button"
          className="faculty-mobile-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setMobileSidebarOpen(false)
          }
        />
      )}

      {/* =================================================
          MAIN APPLICATION
      ================================================= */}

      <div className="faculty-main">
        {/* ===============================================
            TOPBAR
        =============================================== */}

        <header className="faculty-topbar">
          {/* =============================================
              TOPBAR LEFT
          ============================================= */}

          <div className="faculty-topbar-left">
            {/* MOBILE MENU */}

            <button
              type="button"
              className="topbar-icon-button mobile-menu-button"
              onClick={() =>
                setMobileSidebarOpen(true)
              }
              aria-label="Open navigation"
              aria-expanded={mobileSidebarOpen}
            >
              <Menu size={20} />
            </button>

            {/* DESKTOP SIDEBAR TOGGLE */}

            <button
              type="button"
              className="topbar-icon-button desktop-sidebar-button"
              onClick={() =>
                setSidebarCollapsed(
                  (previous) => !previous
                )
              }
              aria-label={
                sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              aria-pressed={sidebarCollapsed}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>

            {/* RIMS BRANDING */}

            <div className="faculty-topbar-brand">
              <strong>
                Research Incentive Management System
              </strong>

              <div className="faculty-topbar-meta">
                <span>
                  Policy on Incentives R1.0
                </span>

                <span className="topbar-brand-separator">
                  •
                </span>

                <span>
                  Academic Year 2026–27
                </span>
              </div>
            </div>
          </div>

          {/* =============================================
              TOPBAR RIGHT
          ============================================= */}

          <div className="faculty-topbar-right">
            {/* ROLE */}

            <div
              className="faculty-role-indicator"
              title={`Current role: ${facultyRole}`}
            >
              <span className="role-dot" />

              <span>
                {loadingProfile
                  ? "Loading..."
                  : facultyRole}
              </span>
            </div>

            {/* NOTIFICATIONS */}

            <button
              type="button"
              className="faculty-notification-button"
              aria-label="Notifications"
              onClick={() =>
                navigate("/notifications")
              }
            >
              <Bell size={20} />
            </button>

            {/* PROFILE */}

            <div
              className="faculty-profile-wrapper"
              ref={profileMenuRef}
            >
              <button
                type="button"
                className={`faculty-profile-button ${
                  profileMenuOpen
                    ? "profile-button-active"
                    : ""
                }`}
                onClick={() =>
                  setProfileMenuOpen(
                    (previous) => !previous
                  )
                }
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
              >
                {/* AVATAR */}

                <span className="faculty-avatar">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt={`${facultyName} profile`}
                    />
                  ) : (
                    facultyInitials
                  )}
                </span>

                {/* NAME */}

                <span className="faculty-header-identity">
                  <strong>
                    {loadingProfile
                      ? "Loading..."
                      : facultyName}
                  </strong>

                  <small>
                    {loadingProfile
                      ? "Faculty"
                      : facultyDesignation}
                  </small>
                </span>

                <ChevronDown
                  size={16}
                  className={`profile-chevron ${
                    profileMenuOpen
                      ? "profile-chevron-open"
                      : ""
                  }`}
                />
              </button>

              {/* =========================================
                  PROFILE DROPDOWN
              ========================================= */}

              {profileMenuOpen && (
                <div
                  className="faculty-profile-menu"
                  role="menu"
                >
                  {/* PROFILE SUMMARY */}

                  <div className="profile-menu-header">
                    <div className="profile-menu-avatar">
                      {profilePhotoUrl ? (
                        <img
                          src={profilePhotoUrl}
                          alt={`${facultyName} profile`}
                        />
                      ) : (
                        facultyInitials
                      )}
                    </div>

                    <div className="profile-menu-identity">
                      <strong>
                        {facultyName}
                      </strong>

                      <span>
                        {facultyDesignation}
                      </span>
                    </div>
                  </div>

                  {/* PROFILE DETAILS */}

                  <div className="profile-menu-details">
                    <div className="profile-detail-row">
                      <span>
                        Department
                      </span>

                      <strong>
                        {facultyDepartment}
                      </strong>
                    </div>

                    <div className="profile-detail-row">
                      <span>
                        Employee ID
                      </span>

                      <strong>
                        {facultyEmployeeId}
                      </strong>
                    </div>

                    <div className="profile-detail-row">
                      <span>
                        Role
                      </span>

                      <strong>
                        {facultyRole}
                      </strong>
                    </div>

                    <div className="profile-detail-row">
                      <span>
                        Account
                      </span>

                      <strong className="profile-status">
                        {facultyAccountStatus}
                      </strong>
                    </div>
                  </div>

                  {/* MENU ACTIONS */}

                  <div className="profile-menu-actions">
                    <button
                      type="button"
                      className="profile-menu-item"
                      role="menuitem"
                      onClick={() =>
                        handleProfileNavigation(
                          "/profile"
                        )
                      }
                    >
                      <UserRound size={18} />

                      <span>
                        View Profile
                      </span>
                    </button>

                    <button
                      type="button"
                      className="profile-menu-item"
                      role="menuitem"
                      onClick={() =>
                        handleProfileNavigation(
                          "/settings"
                        )
                      }
                    >
                      <Settings size={18} />

                      <span>
                        Settings
                      </span>
                    </button>
                  </div>

                  {/* LOGOUT */}

                  <div className="profile-menu-footer">
                    <button
                      type="button"
                      className="profile-menu-item profile-logout"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <LogOut size={18} />

                      <span>
                        Sign out
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main className="faculty-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default FacultyLayout;