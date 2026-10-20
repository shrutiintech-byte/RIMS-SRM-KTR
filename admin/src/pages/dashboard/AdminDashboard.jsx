
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  FileCheck2,
  Clock3,
  CheckCircle2,
  XCircle,
  Files,
  RefreshCw,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  ClipboardList,
  History,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  UserRound,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  Settings,
  CheckCheck,
} from "lucide-react";

import FacultyRegistrations from "./FacultyRegistrations";
import ClaimsManagement from "./ClaimsManagement";
import AuditHistory from "./AuditHistory";

import AdminNotifications from "../notifications/AdminNotifications";
import AdminProfile from "../profile/AdminProfile";
import AdminSettings from "../settings/AdminSettings";

import { adminApi } from "../../services/adminApi";
import "./AdminDashboard.css";

const STAT_CARDS = [
  { key: "totalUsers", label: "Total Users", icon: Users, color: "blue" },
  { key: "totalClaims", label: "Total Claims", icon: FileCheck2, color: "purple" },
  { key: "pendingClaims", label: "Pending Claims", icon: Clock3, color: "orange" },
  { key: "approvedClaims", label: "Approved Claims", icon: CheckCircle2, color: "green" },
  { key: "rejectedClaims", label: "Rejected Claims", icon: XCircle, color: "red" },
  { key: "totalDocuments", label: "Total Documents", icon: Files, color: "teal" },
];

const NAVIGATION_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "registrations", label: "Faculty Registrations", icon: Users },
  { id: "claims", label: "Claims Management", icon: ClipboardList },
  { id: "audit", label: "Audit History", icon: History },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
];

function getStoredUser() {
  try {
    const raw =
      localStorage.getItem("rimsAdminUser") ||
      sessionStorage.getItem("rimsAdminUser");

    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function clearAdminSession() {
  [
    "rimsAdminToken",
    "rimsAdminUser",
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function getNotificationData(result) {
  const candidates = [
    result?.data?.notifications,
    result?.notifications,
    result?.data?.data?.notifications,
    result?.data,
  ];

  return candidates.find(Array.isArray) || [];
}

function getUnreadCount(result, notifications = []) {
  const data = result?.data;

  const values = [
    data?.unreadCount,
    data?.unreadNotifications,
    data?.count,
    result?.unreadCount,
    typeof data === "number" || typeof data === "string" ? data : undefined,
  ];

  const count = values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= 0
  );

  if (count !== undefined) return Number(count);

  return notifications.filter(
    (notification) =>
      !(notification.isRead ?? notification.read ?? false)
  ).length;
}

function getNotificationId(notification) {
  return notification?._id || notification?.id;
}

function notificationIsRead(notification) {
  return Boolean(notification?.isRead ?? notification?.read ?? false);
}

function getNotificationIcon(type) {
  if (
    ["REGISTRATION_APPROVED", "CLAIM_APPROVED", "DOCUMENT_VERIFIED"].includes(type)
  ) {
    return CheckCircle2;
  }

  if (
    ["REGISTRATION_REJECTED", "CLAIM_REJECTED", "DOCUMENT_REJECTED"].includes(type)
  ) {
    return XCircle;
  }

  if (
    [
      "CLAIM_SUBMITTED",
      "CLAIM_UPDATED",
      "CLAIM_RETURNED",
      "DOCUMENT_UPLOADED",
    ].includes(type)
  ) {
    return FileCheck2;
  }

  return Bell;
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AdminDashboard({ onLogout }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("rimsAdminSidebarCollapsed") === "true"
  );

  const [theme, setTheme] = useState(() =>
    localStorage.getItem("rimsAdminTheme") === "dark" ? "dark" : "light"
  );

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationActionId, setNotificationActionId] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const [profile, setProfile] = useState(getStoredUser);

  const handleLogout = useCallback(() => {
    clearAdminSession();

    if (typeof onLogout === "function") {
      onLogout();
    }
  }, [onLogout]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setDashboardError("");

    try {
      const response = await adminApi.getDashboard();

      if (
        response?.success !== true ||
        !response.data ||
        typeof response.data !== "object" ||
        Array.isArray(response.data)
      ) {
        throw new Error(
          response?.message || "Unable to load dashboard statistics."
        );
      }

      setStats(response.data);
    } catch (error) {
      console.error("Dashboard error:", error);

      if (error?.status === 401) {
        handleLogout();
        return;
      }

      setDashboardError(
        error?.message || "Unable to load dashboard statistics."
      );
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  const fetchHeaderNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const [notificationResponse, countResponse] = await Promise.all([
        adminApi.getNotifications({ limit: 5 }),
        adminApi.getUnreadNotificationCount(),
      ]);

      const items = getNotificationData(notificationResponse);

      setNotifications(items);
      setUnreadCount(getUnreadCount(countResponse, items));
    } catch (error) {
      console.error("Notification error:", error);

      if (error?.status === 401) {
        handleLogout();
        return;
      }

      setNotificationsError(
        error?.message || "Unable to load notifications."
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [handleLogout]);

  const markNotificationRead = useCallback(
    async (id) => {
      if (!id) return;

      setNotificationActionId(id);
      setNotificationsError("");

      try {
        await adminApi.markNotificationAsRead(id);
        await fetchHeaderNotifications();
      } catch (error) {
        if (error?.status === 401) {
          handleLogout();
          return;
        }

        setNotificationsError(
          error?.message || "Unable to mark notification as read."
        );
      } finally {
        setNotificationActionId("");
      }
    },
    [fetchHeaderNotifications, handleLogout]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (markingAllRead || unreadCount === 0) return;

    setMarkingAllRead(true);
    setNotificationsError("");

    try {
      await adminApi.markAllNotificationsAsRead();
      await fetchHeaderNotifications();
    } catch (error) {
      if (error?.status === 401) {
        handleLogout();
        return;
      }

      setNotificationsError(
        error?.message || "Unable to mark notifications as read."
      );
    } finally {
      setMarkingAllRead(false);
    }
  }, [
    markingAllRead,
    unreadCount,
    fetchHeaderNotifications,
    handleLogout,
  ]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("rimsAdminTheme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "rimsAdminSidebarCollapsed",
      String(sidebarCollapsed)
    );
  }, [sidebarCollapsed]);

  useEffect(() => {
    fetchDashboard();
    fetchHeaderNotifications();
  }, [fetchDashboard, fetchHeaderNotifications]);

  useEffect(() => {
    const refreshNotifications = () => fetchHeaderNotifications();

    window.addEventListener("focus", refreshNotifications);

    return () => {
      window.removeEventListener("focus", refreshNotifications);
    };
  }, [fetchHeaderNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        event.target instanceof Element &&
        !event.target.closest(".admin-popover-anchor")
      ) {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const navigateTo = useCallback(
    (section) => {
      setActiveSection(section);
      setMobileMenuOpen(false);
      setNotificationsOpen(false);
      setProfileOpen(false);

      if (section === "notifications") {
        fetchHeaderNotifications();
      }

      if (section === "profile") {
        setProfile(getStoredUser());
      }
    },
    [fetchHeaderNotifications]
  );

  const renderDashboard = () => (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">OVERVIEW</span>
          <h1>Admin Dashboard</h1>
          <p>Monitor users, research claims, and documents across RIMS.</p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={fetchDashboard}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "admin-spinning" : ""}
          />
          Refresh
        </button>
      </div>

      {dashboardError && (
        <div className="admin-error-message" role="alert">
          <div>
            <strong>Dashboard unavailable</strong>
            <p>{dashboardError}</p>
          </div>

          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      <div className="admin-section-heading">
        <div>
          <h2>System Overview</h2>
          <p>Current statistics from your database</p>
        </div>

        <span className="admin-live-indicator">
          <span />
          Live data
        </span>
      </div>

      <div className="admin-stat-grid">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key];

          return (
            <article className="admin-stat-card" key={card.key}>
              <div className={`admin-stat-icon ${card.color}`}>
                <Icon size={22} />
              </div>

              <p className="admin-stat-label">{card.label}</p>

              <div className="admin-stat-value">
                {loading
                  ? "—"
                  : typeof value === "number" && Number.isFinite(value)
                    ? value.toLocaleString("en-IN")
                    : "—"}
              </div>

              <span className="admin-stat-caption">
                {loading
                  ? "Loading statistics..."
                  : dashboardError
                    ? "Data unavailable"
                    : "Database total"}
              </span>
            </article>
          );
        })}
      </div>

      <section className="admin-information-panel">
        <div className="admin-information-icon">
          <ShieldCheck size={23} />
        </div>

        <div>
          <h3>Administrative Overview</h3>
          <p>
            Review faculty registrations, manage research incentive claims,
            and inspect administrative activity from the navigation menu.
          </p>
        </div>
      </section>

      <footer className="admin-footer">
        <span>RIMS · Administration Portal</span>
        <span>Research Incentive Management System</span>
      </footer>
    </>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard();

      case "registrations":
        return <FacultyRegistrations onLogout={handleLogout} />;

      case "claims":
        return <ClaimsManagement onLogout={handleLogout} />;

      case "audit":
        return <AuditHistory onLogout={handleLogout} />;

      case "notifications":
        return (
          <AdminNotifications
            onLogout={handleLogout}
            onUnreadCountChange={setUnreadCount}
          />
        );

      case "profile":
        return (
          <AdminProfile
            onLogout={handleLogout}
            onProfileChange={(updatedProfile) => {
              setProfile(updatedProfile);
            }}
          />
        );

      case "settings":
        return (
          <AdminSettings
            theme={theme}
            onThemeChange={setTheme}
            onLogout={handleLogout}
          />
        );

      default:
        return renderDashboard();
    }
  };

  const displayedName =
    profile?.fullName ||
    profile?.name ||
    profile?.username ||
    "Administrator";

  const displayedEmail = profile?.email || "";

  const profilePhoto =
    profile?.profilePhoto ||
    profile?.avatar ||
    "";

  return (
    <div
      className={`admin-layout ${
        sidebarCollapsed ? "admin-sidebar-collapsed" : ""
      }`}
      data-theme={theme}
    >
      {mobileMenuOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar ${
          mobileMenuOpen ? "admin-sidebar-open" : ""
        }`}
      >
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <span>R</span>
          </div>

          <div className="admin-brand-copy">
            <h2>RIMS</h2>
            <p>Administration</p>
          </div>

          <button
            type="button"
            className="admin-close-menu"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="admin-sidebar-label">WORKSPACE</div>

        <nav className="admin-navigation" aria-label="Admin navigation">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;

            return (
              <button
                type="button"
                key={item.id}
                className={`admin-nav-item ${
                  active ? "admin-nav-active" : ""
                }`}
                aria-current={active ? "page" : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => navigateTo(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {item.id === "notifications" && unreadCount > 0 && (
                  <span className="admin-nav-notification-count">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-security-note">
            <ShieldCheck size={18} />

            <div>
              <strong>Secure workspace</strong>
              <span>Admin access</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Sign out" : undefined}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {/* Persistent header: branding, theme, notifications, and profile */}
        <header className="admin-topbar">
          <div className="admin-topbar-leading">
            <button
              type="button"
              className="admin-collapse-button"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((value) => !value)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </button>

            <button
              type="button"
              className="admin-menu-button"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div className="admin-topbar-brandmark">
              <span>R</span>
            </div>

            <div className="admin-topbar-title-wrap">
              <strong className="admin-system-title">
                Research Incentive Management System
              </strong>
              <span className="admin-system-subtitle">
                RIMS · Administration workspace
              </span>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <span className="admin-role-badge">
              <ShieldCheck size={14} />
              ADMIN
            </span>

            {/* Light/dark mode toggle */}
            <button
              type="button"
              className="admin-icon-action admin-theme-toggle"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={() =>
                setTheme((current) =>
                  current === "light" ? "dark" : "light"
                )
              }
            >
              {theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </button>

            {/* Notification bell dropdown */}
            <div className="admin-popover-anchor">
              <button
                type="button"
                className={`admin-icon-action admin-notification-button ${
                  notificationsOpen ? "is-open" : ""
                }`}
                aria-label={`Notifications: ${unreadCount} unread`}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  const opening = !notificationsOpen;

                  setNotificationsOpen(opening);
                  setProfileOpen(false);

                  if (opening) fetchHeaderNotifications();
                }}
              >
                <Bell size={18} />

                {unreadCount > 0 && (
                  <span className="admin-notification-count-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="admin-header-popover admin-notifications-popover">
                  <div className="admin-popover-heading">
                    <strong>Notifications</strong>
                    <span>{unreadCount} unread</span>
                  </div>

                  {notificationsError && (
                    <p className="admin-popover-error">
                      {notificationsError}
                    </p>
                  )}

                  {notificationsLoading && notifications.length === 0 && (
                    <div className="admin-notification-empty">
                      <RefreshCw size={18} className="admin-spinning" />
                      <p>Loading notifications...</p>
                    </div>
                  )}

                  {!notificationsLoading && notifications.length === 0 && (
                    <div className="admin-notification-empty">
                      <Check size={18} />
                      <div>
                        <strong>You’re all caught up</strong>
                        <p>No notifications to display.</p>
                      </div>
                    </div>
                  )}

                  {notifications.slice(0, 5).map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type);
                    const id = getNotificationId(notification);
                    const read = notificationIsRead(notification);

                    return (
                      <button
                        type="button"
                        key={id || `${notification.createdAt || "notice"}-${index}`}
                        className={`admin-popover-notification ${
                          read ? "" : "is-unread"
                        }`}
                        disabled={!id || notificationActionId === id}
                        onClick={async () => {
                          if (!read) {
                            await markNotificationRead(id);
                          }

                          navigateTo("notifications");
                        }}
                      >
                        <Icon size={18} />

                        <span>
                          <strong>
                            {notification.title || "Notification"}
                          </strong>
                          <small>{notification.message || ""}</small>
                          <small>{formatDate(notification.createdAt)}</small>
                        </span>
                      </button>
                    );
                  })}

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="admin-popover-view-all"
                      disabled={markingAllRead}
                      onClick={markAllNotificationsRead}
                    >
                      <CheckCheck size={15} />
                      {markingAllRead ? "Updating..." : "Mark all as read"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="admin-popover-view-all"
                    onClick={() => navigateTo("notifications")}
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="admin-popover-anchor admin-profile-anchor">
              <button
                type="button"
                className={`admin-profile-trigger ${
                  profileOpen ? "is-open" : ""
                }`}
                aria-expanded={profileOpen}
                aria-label="Open administrator profile"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                <span className="admin-profile-avatar">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="" />
                  ) : (
                    displayedName.charAt(0).toUpperCase()
                  )}
                </span>

                <span className="admin-profile-info">
                  <strong>{displayedName}</strong>
                  <span>Administrator</span>
                </span>

                <ChevronDown
                  size={15}
                  className="admin-profile-chevron"
                />
              </button>

              {profileOpen && (
                <div className="admin-header-popover admin-profile-popover">
                  <div className="admin-profile-popover-user">
                    <span className="admin-profile-avatar">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="" />
                      ) : (
                        <UserRound size={19} />
                      )}
                    </span>

                    <div>
                      <strong>{displayedName}</strong>
                      {displayedEmail && <span>{displayedEmail}</span>}
                      <span>Administrator</span>
                    </div>
                  </div>

                  <div className="admin-popover-divider" />

                  <button
                    type="button"
                    className="admin-profile-menu-item"
                    onClick={() => navigateTo("profile")}
                  >
                    <UserRound size={16} />
                    My Profile
                  </button>

                  <button
                    type="button"
                    className="admin-profile-menu-item"
                    onClick={() => navigateTo("settings")}
                  >
                    <Settings size={16} />
                    Settings
                  </button>

                  <button
                    type="button"
                    className="admin-profile-menu-item"
                    onClick={() => navigateTo("notifications")}
                  >
                    <Bell size={16} />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="admin-profile-menu-count">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  <div className="admin-popover-divider" />

                  <button
                    type="button"
                    className="admin-profile-menu-item admin-profile-signout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="admin-content">
          {renderActiveSection()}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
