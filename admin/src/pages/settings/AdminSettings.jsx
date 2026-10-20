
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Bell,
  ShieldCheck,
  Monitor,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  UserCheck,
  Settings2,
  Accessibility,
  Info,
  Palette,
  Clock3,
  LockKeyhole,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

import "./AdminSettings.css";

const API_BASE_URL = "http://localhost:5000";

const SETTINGS_KEY = "rimsAdminSettings";
const THEME_KEY = "rimsAdminTheme";
const SIDEBAR_KEY = "rimsAdminSidebarCollapsed";

const DEFAULT_SETTINGS = {
  theme: "light",
  compactSidebar: false,
  showNotificationBadges: true,
  claimNotifications: true,
  registrationNotifications: true,
  systemNotifications: true,
  reducedMotion: false,
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function normalizeSettings(value, fallbackTheme = "light") {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    ...DEFAULT_SETTINGS,
    theme:
      input.theme === "dark" || input.theme === "light"
        ? input.theme
        : fallbackTheme,
    compactSidebar: input.compactSidebar === true,
    showNotificationBadges:
      input.showNotificationBadges !== false,
    claimNotifications: input.claimNotifications !== false,
    registrationNotifications:
      input.registrationNotifications !== false,
    systemNotifications: input.systemNotifications !== false,
    reducedMotion: input.reducedMotion === true,
  };
}

function readSettings(propTheme) {
  const fallbackTheme =
    propTheme === "dark" ? "dark" : "light";

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);

    if (stored) {
      return normalizeSettings(
        JSON.parse(stored),
        fallbackTheme
      );
    }

    const savedTheme = localStorage.getItem(THEME_KEY);

    return normalizeSettings(
      {
        ...DEFAULT_SETTINGS,
        theme:
          savedTheme === "dark" || savedTheme === "light"
            ? savedTheme
            : fallbackTheme,
      },
      fallbackTheme
    );
  } catch (error) {
    console.error("Unable to read admin settings:", error);
    return normalizeSettings(DEFAULT_SETTINGS, fallbackTheme);
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.dataset.rimsTheme = theme;
  root.classList.toggle("dark", isDark);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.error("Unable to persist theme preference:", error);
  }
}

function AdminSettings({ theme, setTheme }) {
  const [settings, setSettings] = useState(() =>
    readSettings(theme)
  );

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    ...EMPTY_PASSWORD_FORM,
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Apply the initial saved theme and layout preferences.
  useEffect(() => {
    applyTheme(settings.theme);

    if (typeof setTheme === "function") {
      setTheme(settings.theme);
    }

    document.documentElement.dataset.rimsCompactSidebar =
      String(settings.compactSidebar);

    document.documentElement.dataset.rimsNotificationBadges =
      String(settings.showNotificationBadges);

    document.documentElement.dataset.rimsReducedMotion =
      String(settings.reducedMotion);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the document theme synchronized with the selected theme.
  useEffect(() => {
    applyTheme(settings.theme);

    if (typeof setTheme === "function") {
      setTheme(settings.theme);
    }
  }, [settings.theme, setTheme]);

  // Make layout/accessibility preferences available to CSS.
  useEffect(() => {
    const root = document.documentElement;

    root.dataset.rimsCompactSidebar = String(
      settings.compactSidebar
    );

    root.dataset.rimsNotificationBadges = String(
      settings.showNotificationBadges
    );

    root.dataset.rimsReducedMotion = String(
      settings.reducedMotion
    );
  }, [
    settings.compactSidebar,
    settings.showNotificationBadges,
    settings.reducedMotion,
  ]);

  function updateSetting(key, value) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
    setError("");
    setConfirmReset(false);
  }

  function saveSettings() {
    setError("");
    setSaved(false);

    try {
      const cleanSettings = normalizeSettings(settings);

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(cleanSettings)
      );

      localStorage.setItem(THEME_KEY, cleanSettings.theme);

      localStorage.setItem(
        SIDEBAR_KEY,
        String(cleanSettings.compactSidebar)
      );

      applyTheme(cleanSettings.theme);

      if (typeof setTheme === "function") {
        setTheme(cleanSettings.theme);
      }

      setSettings(cleanSettings);

      setLastSaved(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      setSaved(true);
      setConfirmReset(false);
    } catch (err) {
      console.error("Unable to save admin settings:", err);

      setError(
        "Your settings could not be saved. Check browser storage and try again."
      );
    }
  }

  function resetSettings() {
    const defaults = { ...DEFAULT_SETTINGS };

    setError("");
    setSaved(false);

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(defaults)
      );

      localStorage.setItem(THEME_KEY, defaults.theme);
      localStorage.setItem(SIDEBAR_KEY, "false");

      setSettings(defaults);
      applyTheme(defaults.theme);

      if (typeof setTheme === "function") {
        setTheme(defaults.theme);
      }

      setLastSaved("");
      setConfirmReset(false);
    } catch (err) {
      console.error("Unable to reset admin settings:", err);

      setError(
        "Unable to reset settings. Check browser storage and try again."
      );
    }
  }

  function updatePasswordField(field, value) {
    setPasswordForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  }

  function togglePasswordVisibility(field) {
    setPasswordVisibility((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  }

  async function handleChangePassword(event) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all three password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (new TextEncoder().encode(newPassword).length > 72) {
      setPasswordError(
        "Your new password must not exceed 72 UTF-8 bytes."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "The new password and confirmation do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    const token =
      localStorage.getItem("rimsAdminToken") ||
      sessionStorage.getItem("rimsAdminToken");

    if (!token) {
      setPasswordError(
        "Your admin session could not be found. Please sign in again."
      );
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.message ||
            "Unable to change your password. Please try again."
        );
      }

      setPasswordForm({ ...EMPTY_PASSWORD_FORM });

      setPasswordVisibility({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });

      setPasswordSuccess(
        data.message || "Your password has been changed successfully."
      );
    } catch (err) {
      console.error("Change password request failed:", err);

      setPasswordError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  const activeTheme =
    theme === "dark" || theme === "light"
      ? theme
      : settings.theme;

  return (
    <main className="admin-settings-page">
      <header className="as-heading">
        <div className="as-heading-copy">
          <span className="as-eyebrow">ADMIN WORKSPACE</span>
          <h1>Settings</h1>
          <p>
            Personalize your RIMS workspace, notifications,
            and accessibility preferences.
          </p>
        </div>

        <div className="as-heading-mark" aria-hidden="true">
          <Settings2 size={27} />
        </div>
      </header>

      <div className="as-summary">
        <div className="as-summary-icon">
          <Palette size={20} />
        </div>

        <div className="as-summary-copy">
          <strong>Workspace preferences</strong>
          <span>
            Your current appearance is{" "}
            {activeTheme === "dark" ? "Dark" : "Light"} mode.
          </span>
        </div>

        <span className="as-theme-chip">
          {activeTheme === "dark" ? (
            <Moon size={14} />
          ) : (
            <Sun size={14} />
          )}
          {activeTheme === "dark" ? "Dark" : "Light"}
        </span>
      </div>

      {error && (
        <div className="as-feedback as-feedback-error" role="alert">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div
          className="as-feedback as-feedback-success"
          role="status"
        >
          <CheckCircle2 size={19} />
          <span>
            Settings saved successfully on this device.
            {lastSaved ? ` Last saved at ${lastSaved}.` : ""}
          </span>
        </div>
      )}

      {/* Appearance */}
      <section className="as-card">
        <div className="as-card-heading">
          <div className="as-heading-icon">
            <Monitor size={20} />
          </div>
          <div>
            <h2>Appearance</h2>
            <p>Choose the theme that works best for you.</p>
          </div>
        </div>

        <div className="as-theme-options">
          <button
            type="button"
            aria-pressed={activeTheme === "light"}
            className={`as-theme-option ${
              activeTheme === "light" ? "selected" : ""
            }`}
            onClick={() => updateSetting("theme", "light")}
          >
            <span className="as-theme-preview as-preview-light">
              <Sun size={23} />
              <span className="as-preview-lines">
                <i />
                <i />
                <i />
              </span>
            </span>

            <span className="as-theme-option-copy">
              <strong>Light mode</strong>
              <small>Clean, bright, and easy to read</small>
            </span>

            <span className="as-radio" />
          </button>

          <button
            type="button"
            aria-pressed={activeTheme === "dark"}
            className={`as-theme-option ${
              activeTheme === "dark" ? "selected" : ""
            }`}
            onClick={() => updateSetting("theme", "dark")}
          >
            <span className="as-theme-preview as-preview-dark">
              <Moon size={23} />
              <span className="as-preview-lines">
                <i />
                <i />
                <i />
              </span>
            </span>

            <span className="as-theme-option-copy">
              <strong>Dark mode</strong>
              <small>Low-light interface with clear contrast</small>
            </span>

            <span className="as-radio" />
          </button>
        </div>

        <p className="as-inline-note">
          <Info size={15} />
          Theme changes apply immediately. Save your settings to
          keep the selection across sessions.
        </p>
      </section>

      {/* Workspace */}
      <section className="as-card">
        <div className="as-card-heading">
          <div className="as-heading-icon">
            <Settings2 size={20} />
          </div>
          <div>
            <h2>Workspace</h2>
            <p>Adjust navigation and interface preferences.</p>
          </div>
        </div>

        <label className="as-setting-row">
          <span className="as-setting-icon">
            <Monitor size={19} />
          </span>
          <span className="as-setting-copy">
            <strong>Compact sidebar</strong>
            <small>
              Use a space-saving navigation layout where supported.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.compactSidebar}
            onChange={(event) =>
              updateSetting("compactSidebar", event.target.checked)
            }
          />
        </label>

        <label className="as-setting-row">
          <span className="as-setting-icon">
            <Bell size={19} />
          </span>
          <span className="as-setting-copy">
            <strong>Notification badges</strong>
            <small>Show unread indicators where supported.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.showNotificationBadges}
            onChange={(event) =>
              updateSetting(
                "showNotificationBadges",
                event.target.checked
              )
            }
          />
        </label>
      </section>

      {/* Notifications */}
      <section className="as-card">
        <div className="as-card-heading">
          <div className="as-heading-icon">
            <Bell size={20} />
          </div>
          <div>
            <h2>Notifications</h2>
            <p>Choose the update categories you prefer.</p>
          </div>
        </div>

        <label className="as-setting-row">
          <span className="as-setting-icon">
            <FileCheck2 size={19} />
          </span>
          <span className="as-setting-copy">
            <strong>Claim updates</strong>
            <small>Claim submissions, reviews, and decisions.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.claimNotifications}
            onChange={(event) =>
              updateSetting(
                "claimNotifications",
                event.target.checked
              )
            }
          />
        </label>

        <label className="as-setting-row">
          <span className="as-setting-icon">
            <UserCheck size={19} />
          </span>
          <span className="as-setting-copy">
            <strong>Registration requests</strong>
            <small>New administrator registration activity.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.registrationNotifications}
            onChange={(event) =>
              updateSetting(
                "registrationNotifications",
                event.target.checked
              )
            }
          />
        </label>

        <label className="as-setting-row">
          <span className="as-setting-icon">
            <ShieldCheck size={19} />
          </span>
          <span className="as-setting-copy">
            <strong>System alerts</strong>
            <small>Supported system and security notifications.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.systemNotifications}
            onChange={(event) =>
              updateSetting(
                "systemNotifications",
                event.target.checked
              )
            }
          />
        </label>

        <p className="as-inline-note">
          <Info size={15} />
          These preferences are saved locally. Your notification
          components must read them to filter actual notifications.
        </p>
      </section>

      {/* Accessibility */}
      <section className="as-card">
        <div className="as-card-heading">
          <div className="as-heading-icon">
            <Accessibility size={20} />
          </div>
          <div>
            <h2>Accessibility</h2>
            <p>Make the interface more comfortable to use.</p>
          </div>
        </div>

        <label className="as-setting-row">
          <span className="as-setting-icon">
            <Accessibility size={19} />
          </span>
          <span className="as-setting-copy">
            <strong>Reduce animations</strong>
            <small>
              Minimize decorative transitions and motion where supported.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) =>
              updateSetting("reducedMotion", event.target.checked)
            }
          />
        </label>
      </section>

      {/* Security */}
      <section className="as-card as-security-card">
        <div className="as-card-heading">
          <div className="as-heading-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2>Security and account access</h2>
            <p>Protect your administrator account.</p>
          </div>
        </div>

        <div className="as-security-note">
          <div className="as-security-tip">
            <ShieldCheck size={19} />
            <div>
              <strong>Keep your account secure</strong>
              <p>
                Never share your password or authentication token.
                Sign out when using a shared computer.
              </p>
            </div>
          </div>

          <div className="as-security-tip">
            <Clock3 size={19} />
            <div>
              <strong>Session and password management</strong>
              <p>
                Your current password is verified by the server before
                any password change is saved.
              </p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="as-password-section">
          <div className="as-password-heading">
            <div className="as-password-heading-icon">
              <KeyRound size={20} />
            </div>
            <div>
              <h3>Change Password</h3>
              <p>
                Enter your current password and choose a new,
                secure password for your administrator account.
              </p>
            </div>
          </div>

          {passwordError && (
            <div
              className="as-password-feedback as-password-feedback-error"
              role="alert"
            >
              <AlertCircle size={18} />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div
              className="as-password-feedback as-password-feedback-success"
              role="status"
            >
              <CheckCircle2 size={18} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form
            className="as-password-form"
            onSubmit={handleChangePassword}
            autoComplete="on"
          >
            {/* Current Password */}
            <div className="as-password-field">
              <label htmlFor="as-current-password">
                Current password
              </label>

              <div className="as-password-input-wrap">
                <LockKeyhole
                  size={18}
                  className="as-password-input-icon"
                  aria-hidden="true"
                />

                <input
                  id="as-current-password"
                  name="currentPassword"
                  type={
                    passwordVisibility.currentPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    updatePasswordField(
                      "currentPassword",
                      event.target.value
                    )
                  }
                  disabled={changingPassword}
                  required
                />

                <button
                  className="as-password-toggle"
                  type="button"
                  onClick={() =>
                    togglePasswordVisibility("currentPassword")
                  }
                  aria-label={
                    passwordVisibility.currentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  aria-pressed={passwordVisibility.currentPassword}
                  disabled={changingPassword}
                >
                  {passwordVisibility.currentPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="as-password-field">
              <label htmlFor="as-new-password">
                New password
              </label>

              <div className="as-password-input-wrap">
                <KeyRound
                  size={18}
                  className="as-password-input-icon"
                  aria-hidden="true"
                />

                <input
                  id="as-new-password"
                  name="newPassword"
                  type={
                    passwordVisibility.newPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    updatePasswordField(
                      "newPassword",
                      event.target.value
                    )
                  }
                  minLength={8}
                  maxLength={72}
                  disabled={changingPassword}
                  required
                />

                <button
                  className="as-password-toggle"
                  type="button"
                  onClick={() =>
                    togglePasswordVisibility("newPassword")
                  }
                  aria-label={
                    passwordVisibility.newPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  aria-pressed={passwordVisibility.newPassword}
                  disabled={changingPassword}
                >
                  {passwordVisibility.newPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <small className="as-password-hint">
                Use at least 8 characters. Avoid reusing your old password.
              </small>
            </div>

            {/* Confirm Password */}
            <div className="as-password-field">
              <label htmlFor="as-confirm-password">
                Confirm new password
              </label>

              <div className="as-password-input-wrap">
                <LockKeyhole
                  size={18}
                  className="as-password-input-icon"
                  aria-hidden="true"
                />

                <input
                  id="as-confirm-password"
                  name="confirmPassword"
                  type={
                    passwordVisibility.confirmPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    updatePasswordField(
                      "confirmPassword",
                      event.target.value
                    )
                  }
                  minLength={8}
                  maxLength={72}
                  disabled={changingPassword}
                  required
                />

                <button
                  className="as-password-toggle"
                  type="button"
                  onClick={() =>
                    togglePasswordVisibility("confirmPassword")
                  }
                  aria-label={
                    passwordVisibility.confirmPassword
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                  aria-pressed={passwordVisibility.confirmPassword}
                  disabled={changingPassword}
                >
                  {passwordVisibility.confirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="as-password-actions">
              <button
                className="as-btn as-btn-primary"
                type="submit"
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <>
                    <span className="as-password-spinner" />
                    Updating password...
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Update password
                  </>
                )}
              </button>

              <span className="as-password-secure-note">
                <ShieldCheck size={15} />
                Verified securely by the server
              </span>
            </div>
          </form>
        </div>
      </section>

      {/* Actions */}
      <footer className="as-actions">
        <div className="as-action-status">
          {saved ? (
            <span className="as-saved-message">
              <CheckCircle2 size={16} />
              Changes saved
            </span>
          ) : (
            <span className="as-unsaved-message">
              Remember to save your changes.
            </span>
          )}
        </div>

        <div className="as-action-buttons">
          {confirmReset ? (
            <>
              <span className="as-reset-confirm">
                Reset all preferences?
              </span>

              <button
                className="as-btn as-btn-secondary"
                type="button"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>

              <button
                className="as-btn as-btn-danger"
                type="button"
                onClick={resetSettings}
              >
                Confirm reset
              </button>
            </>
          ) : (
            <>
              <button
                className="as-btn as-btn-secondary"
                type="button"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw size={16} />
                Reset defaults
              </button>

              <button
                className="as-btn as-btn-primary"
                type="button"
                onClick={saveSettings}
              >
                <Save size={16} />
                Save settings
              </button>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}

export default AdminSettings;
