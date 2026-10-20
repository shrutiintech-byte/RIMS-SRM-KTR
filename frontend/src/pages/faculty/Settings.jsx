import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Save,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";

import "./Settings.css";

const API_BASE_URL = "http://localhost:5000";

const defaultSettings = {
  emailNotifications: true,
  claimUpdates: true,
  approvalUpdates: true,
  documentUpdates: true,
  systemNotifications: true,
};

function Settings() {
  const [settings, setSettings] =
    useState(defaultSettings);

  const [theme, setTheme] =
    useState("light");

  const [saved, setSaved] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [user, setUser] =
    useState(null);

  const [passwordChangedAt, setPasswordChangedAt] =
    useState(null);

  const [lastLogin, setLastLogin] =
    useState(null);

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [passwordData, setPasswordData] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  // =========================================================
  // GET TOKEN
  // =========================================================

  const getToken = () => {
    return (
      localStorage.getItem("rimsToken") ||
      localStorage.getItem("token")
    );
  };

  // =========================================================
  // HANDLE UNAUTHORIZED
  // =========================================================

  const handleUnauthorized = () => {
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("token");
    localStorage.removeItem("rimsUser");
    localStorage.removeItem("user");

    window.location.href = "/";
  };

  // =========================================================
  // LOAD SETTINGS
  // =========================================================

  useEffect(() => {
    const loadSettings = async () => {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/settings`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to load settings"
          );
        }

        const data = result.data || {};

        setSettings({
          ...defaultSettings,
          ...(data.notificationPreferences || {}),
        });

        setPasswordChangedAt(
          data.passwordChangedAt || null
        );

        setLastLogin(
          data.lastLogin || null
        );
      } catch (error) {
        console.error(
          "Unable to load settings:",
          error
        );

        setError(
          error.message ||
            "Unable to load your settings."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // =========================================================
  // LOAD USER PROFILE
  // =========================================================

  useEffect(() => {
    const loadUserProfile = async () => {
      const token = getToken();

      if (!token) {
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

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          return;
        }

        setUser(
          result.data ||
            result.user ||
            null
        );
      } catch (error) {
        console.error(
          "Unable to load user profile:",
          error
        );
      }
    };

    loadUserProfile();
  }, []);

  // =========================================================
  // LOAD THEME
  // =========================================================

  useEffect(() => {
    try {
      const storedTheme =
        localStorage.getItem("rimsTheme");

      const selectedTheme =
        storedTheme === "dark"
          ? "dark"
          : "light";

      setTheme(selectedTheme);

      document.documentElement.setAttribute(
        "data-theme",
        selectedTheme
      );
    } catch (error) {
      console.error(
        "Unable to load theme:",
        error
      );

      document.documentElement.setAttribute(
        "data-theme",
        "light"
      );
    }
  }, []);

  // =========================================================
  // HANDLE TOGGLE
  // =========================================================

  const handleToggle = (settingName) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [settingName]:
        !currentSettings[settingName],
    }));

    setSaved(false);
    setError("");
  };

  // =========================================================
  // HANDLE THEME
  // =========================================================

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);

    document.documentElement.setAttribute(
      "data-theme",
      selectedTheme
    );

    try {
      localStorage.setItem(
        "rimsTheme",
        selectedTheme
      );
    } catch (error) {
      console.error(
        "Unable to save theme:",
        error
      );
    }

    setSaved(false);
  };

  // =========================================================
  // SAVE SETTINGS TO BACKEND
  // =========================================================

  const handleSaveSettings = async () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/settings`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notificationPreferences:
              settings,
          }),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to save settings"
        );
      }

      if (
        result.data &&
        result.data.notificationPreferences
      ) {
        setSettings({
          ...defaultSettings,
          ...result.data
            .notificationPreferences,
        });
      }

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error(
        "Unable to save settings:",
        error
      );

      setError(
        error.message ||
          "Unable to save your settings."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // PASSWORD INPUT
  // =========================================================

  const handlePasswordChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setPasswordData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordMessage("");
  };

  // =========================================================
  // PASSWORD STRENGTH
  // =========================================================

  const getPasswordStrength = () => {
    const password =
      passwordData.newPassword;

    if (!password) {
      return {
        label: "",
        width: "0%",
      };
    }

    let score = 0;

    if (password.length >= 8) {
      score++;
    }

    if (/[A-Z]/.test(password)) {
      score++;
    }

    if (/[a-z]/.test(password)) {
      score++;
    }

    if (/[0-9]/.test(password)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }

    if (score <= 2) {
      return {
        label: "Weak",
        width: "35%",
      };
    }

    if (score <= 4) {
      return {
        label: "Good",
        width: "70%",
      };
    }

    return {
      label: "Strong",
      width: "100%",
    };
  };

  const passwordStrength =
    getPasswordStrength();

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  const handleChangePassword = async (
    event
  ) => {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setPasswordError("");
    setPasswordMessage("");

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setPasswordError(
        "Please fill in all password fields."
      );
      return;
    }

    if (
      passwordData.newPassword.length < 8
    ) {
      setPasswordError(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      setPasswordError(
        "New password and confirmation password do not match."
      );
      return;
    }

    try {
      setPasswordLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/settings/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword:
              passwordData.currentPassword,
            newPassword:
              passwordData.newPassword,
            confirmPassword:
              passwordData.confirmPassword,
          }),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to change password"
        );
      }

      setPasswordMessage(
        "Password changed successfully."
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordChangedAt(
        new Date().toISOString()
      );
    } catch (error) {
      console.error(
        "Unable to change password:",
        error
      );

      setPasswordError(
        error.message ||
          "Unable to change password."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // =========================================================
  // CLOSE PASSWORD MODAL
  // =========================================================

  const closePasswordModal = () => {
    if (passwordLoading) {
      return;
    }

    setShowPasswordModal(false);

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordError("");
    setPasswordMessage("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("rimsToken");
    localStorage.removeItem("token");
    localStorage.removeItem("rimsUser");
    localStorage.removeItem("user");

    window.location.href = "/";
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <div className="settings-page">
        <section className="settings-page-header">
          <div>
            <span className="page-eyebrow">
              ACCOUNT PREFERENCES
            </span>

            <h1 className="page-title">
              Settings
            </h1>

            <p className="page-description">
              Loading your account settings...
            </p>
          </div>
        </section>

        <section className="rims-card settings-card">
          <div className="settings-loading">
            Loading settings...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="settings-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="settings-page-header">

        <div>

          <span className="page-eyebrow">
            ACCOUNT PREFERENCES
          </span>

          <h1 className="page-title">
            Settings
          </h1>

          <p className="page-description">
            Manage your notification preferences,
            interface preferences, and account security.
          </p>

        </div>

        <button
          type="button"
          className="settings-save-button"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saved ? (
            <>
              <Check size={17} />
              <span>Saved</span>
            </>
          ) : saving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save size={17} />
              <span>Save Changes</span>
            </>
          )}
        </button>

      </section>

      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {error && (
        <div className="settings-error-message">
          {error}
        </div>
      )}

      {/* =====================================================
          NOTIFICATION SETTINGS
      ===================================================== */}

      <section className="rims-card settings-card">

        <div className="settings-card-header">

          <div className="settings-card-icon">
            <Bell size={19} />
          </div>

          <div>
            <h2>
              Notification Preferences
            </h2>

            <p>
              Choose which RIMS notifications you want
              to receive.
            </p>
          </div>

        </div>

        <div className="settings-options">

          {/* Email Notifications */}

          <div className="settings-option">

            <div className="settings-option-content">

              <div className="settings-option-title">
                Email Notifications
              </div>

              <div className="settings-option-description">
                Receive important RIMS notifications
                through your registered email address.
              </div>

            </div>

            <button
              type="button"
              className={`settings-toggle ${
                settings.emailNotifications
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleToggle(
                  "emailNotifications"
                )
              }
              aria-label="Toggle email notifications"
              aria-pressed={
                settings.emailNotifications
              }
            >
              <span />
            </button>

          </div>

          {/* Claim Updates */}

          <div className="settings-option">

            <div className="settings-option-content">

              <div className="settings-option-title">
                Claim Updates
              </div>

              <div className="settings-option-description">
                Receive notifications when there is
                an update to your incentive claim.
              </div>

            </div>

            <button
              type="button"
              className={`settings-toggle ${
                settings.claimUpdates
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleToggle(
                  "claimUpdates"
                )
              }
              aria-label="Toggle claim updates"
              aria-pressed={
                settings.claimUpdates
              }
            >
              <span />
            </button>

          </div>

          {/* Approval Updates */}

          <div className="settings-option">

            <div className="settings-option-content">

              <div className="settings-option-title">
                Approval Updates
              </div>

              <div className="settings-option-description">
                Receive notifications about claim
                approvals, rejections, and decisions.
              </div>

            </div>

            <button
              type="button"
              className={`settings-toggle ${
                settings.approvalUpdates
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleToggle(
                  "approvalUpdates"
                )
              }
              aria-label="Toggle approval updates"
              aria-pressed={
                settings.approvalUpdates
              }
            >
              <span />
            </button>

          </div>

          {/* Document Updates */}

          <div className="settings-option">

            <div className="settings-option-content">

              <div className="settings-option-title">
                Document Updates
              </div>

              <div className="settings-option-description">
                Receive notifications about document
                verification and review.
              </div>

            </div>

            <button
              type="button"
              className={`settings-toggle ${
                settings.documentUpdates
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleToggle(
                  "documentUpdates"
                )
              }
              aria-label="Toggle document updates"
              aria-pressed={
                settings.documentUpdates
              }
            >
              <span />
            </button>

          </div>

          {/* System Notifications */}

          <div className="settings-option">

            <div className="settings-option-content">

              <div className="settings-option-title">
                System Notifications
              </div>

              <div className="settings-option-description">
                Receive important system and account
                notifications.
              </div>

            </div>

            <button
              type="button"
              className={`settings-toggle ${
                settings.systemNotifications
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleToggle(
                  "systemNotifications"
                )
              }
              aria-label="Toggle system notifications"
              aria-pressed={
                settings.systemNotifications
              }
            >
              <span />
            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          APPEARANCE
      ===================================================== */}

      <section className="rims-card settings-card">

        <div className="settings-card-header">

          <div className="settings-card-icon">
            <Monitor size={19} />
          </div>

          <div>
            <h2>
              Appearance
            </h2>

            <p>
              Choose your preferred interface appearance.
            </p>
          </div>

        </div>

        <div className="settings-theme-options">

          {/* Light */}

          <button
            type="button"
            className={`settings-theme-option ${
              theme === "light"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              handleThemeChange("light")
            }
          >

            <div className="settings-theme-icon">
              <Sun size={20} />
            </div>

            <div>
              <strong>
                Light
              </strong>

              <span>
                Use the standard RIMS interface.
              </span>
            </div>

            {theme === "light" && (
              <Check
                size={18}
                className="settings-theme-check"
              />
            )}

          </button>

          {/* Dark */}

          <button
            type="button"
            className={`settings-theme-option ${
              theme === "dark"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              handleThemeChange("dark")
            }
          >

            <div className="settings-theme-icon">
              <Moon size={20} />
            </div>

            <div>
              <strong>
                Dark
              </strong>

              <span>
                Use a darker interface appearance.
              </span>
            </div>

            {theme === "dark" && (
              <Check
                size={18}
                className="settings-theme-check"
              />
            )}

          </button>

        </div>

        <div className="settings-info-message">
          <span>
            Appearance selection is stored on this
            device.
          </span>
        </div>

      </section>

      {/* =====================================================
          ACCOUNT SECURITY
      ===================================================== */}

      <section className="rims-card settings-card">

        <div className="settings-card-header">

          <div className="settings-card-icon">
            <ShieldCheck size={19} />
          </div>

          <div>
            <h2>
              Account Security
            </h2>

            <p>
              Review your account security information
              and manage your password.
            </p>
          </div>

        </div>

        <div className="settings-security-info">

          <div className="settings-security-info-row">

            <div className="settings-security-info-icon">
              <UserRound size={17} />
            </div>

            <div>
              <span>
                Account
              </span>

              <strong>
                {user?.email ||
                  user?.data?.email ||
                  "Registered RIMS Account"}
              </strong>
            </div>

          </div>

          <div className="settings-security-info-row">

            <div className="settings-security-info-icon">
              <ShieldCheck size={17} />
            </div>

            <div>
              <span>
                Last Login
              </span>

              <strong>
                {formatDate(lastLogin)}
              </strong>
            </div>

          </div>

          <div className="settings-security-info-row">

            <div className="settings-security-info-icon">
              <KeyRound size={17} />
            </div>

            <div>
              <span>
                Password Last Changed
              </span>

              <strong>
                {formatDate(passwordChangedAt)}
              </strong>
            </div>

          </div>

        </div>

        <div className="settings-password-action">

          <div className="settings-security-content">

            <strong>
              Change Password
            </strong>

            <span>
              Update your RIMS account password
              securely.
            </span>

          </div>

          <button
            type="button"
            className="settings-password-button"
            onClick={() =>
              setShowPasswordModal(true)
            }
          >
            <KeyRound size={16} />
            <span>
              Change Password
            </span>
          </button>

        </div>

      </section>

      {/* =====================================================
          SESSION SECURITY
      ===================================================== */}

      <section className="rims-card settings-card">

        <div className="settings-card-header">

          <div className="settings-card-icon">
            <LogOut size={19} />
          </div>

          <div>
            <h2>
              Session
            </h2>

            <p>
              Manage your current RIMS account session.
            </p>

          </div>

        </div>

        <div className="settings-security-row">

          <div className="settings-security-content">

            <strong>
              Sign out of RIMS
            </strong>

            <span>
              End your current authenticated session
              on this device.
            </span>

          </div>

          <button
            type="button"
            className="settings-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>
              Sign Out
            </span>
          </button>

        </div>

      </section>

      {/* =====================================================
          SAVE BAR
      ===================================================== */}

      <div className="settings-bottom-actions">

        {saved && (
          <div className="settings-saved-message">
            <Check size={16} />
            <span>
              Your settings have been saved.
            </span>
          </div>
        )}

        <button
          type="button"
          className="settings-save-button"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saved ? (
            <>
              <Check size={17} />
              <span>Saved</span>
            </>
          ) : saving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save size={17} />
              <span>Save Changes</span>
            </>
          )}
        </button>

      </div>

      {/* =====================================================
          CHANGE PASSWORD MODAL
      ===================================================== */}

      {showPasswordModal && (
        <div
          className="settings-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePasswordModal();
            }
          }}
        >

          <div className="settings-password-modal">

            <div className="settings-modal-header">

              <div>

                <div className="settings-modal-icon">
                  <KeyRound size={20} />
                </div>

                <h2>
                  Change Password
                </h2>

                <p>
                  Create a new password for your
                  RIMS account.
                </p>

              </div>

              <button
                type="button"
                className="settings-modal-close"
                onClick={closePasswordModal}
                disabled={passwordLoading}
                aria-label="Close change password"
              >
                <X size={20} />
              </button>

            </div>

            {passwordError && (
              <div className="settings-password-error">
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div className="settings-password-success">
                <Check size={16} />
                <span>
                  {passwordMessage}
                </span>
              </div>
            )}

            <form
              onSubmit={handleChangePassword}
              className="settings-password-form"
            >

              {/* Current Password */}

              <div className="settings-password-field">

                <label htmlFor="currentPassword">
                  Current Password
                </label>

                <div className="settings-password-input-wrapper">

                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      passwordData.currentPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    disabled={passwordLoading}
                  />

                  <button
                    type="button"
                    className="settings-password-eye"
                    onClick={() =>
                      setShowCurrentPassword(
                        (value) => !value
                      )
                    }
                    disabled={passwordLoading}
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              {/* New Password */}

              <div className="settings-password-field">

                <label htmlFor="newPassword">
                  New Password
                </label>

                <div className="settings-password-input-wrapper">

                  <input
                    id="newPassword"
                    name="newPassword"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      passwordData.newPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    disabled={passwordLoading}
                  />

                  <button
                    type="button"
                    className="settings-password-eye"
                    onClick={() =>
                      setShowNewPassword(
                        (value) => !value
                      )
                    }
                    disabled={passwordLoading}
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

                {passwordData.newPassword && (
                  <div className="settings-password-strength">

                    <div className="settings-password-strength-bar">
                      <span
                        style={{
                          width:
                            passwordStrength.width,
                        }}
                      />
                    </div>

                    <span>
                      {passwordStrength.label}
                    </span>

                  </div>
                )}

                <small>
                  Use at least 8 characters. A combination
                  of uppercase, lowercase, numbers, and
                  symbols is recommended.
                </small>

              </div>

              {/* Confirm Password */}

              <div className="settings-password-field">

                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>

                <div className="settings-password-input-wrapper">

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      passwordData.confirmPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    disabled={passwordLoading}
                  />

                  <button
                    type="button"
                    className="settings-password-eye"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    disabled={passwordLoading}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              {/* Modal Actions */}

              <div className="settings-modal-actions">

                <button
                  type="button"
                  className="settings-modal-cancel"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="settings-modal-submit"
                  disabled={passwordLoading}
                >
                  {passwordLoading
                    ? "Updating..."
                    : "Update Password"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Settings;