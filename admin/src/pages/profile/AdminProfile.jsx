
import { useEffect, useRef, useState } from "react";
import {
  UserRound,
  Mail,
  ShieldCheck,
  RefreshCw,
  Camera,
  Pencil,
  Save,
  X,
  CalendarDays,
  Fingerprint,
  ImagePlus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import "./AdminProfile.css";

const PROFILE_KEYS = [
  "rimsAdminUser",
  "rimsAdmin",
  "adminUser",
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const EMPTY_FORM = {
  name: "",
  email: "",
  profileImage: "",
};

function getStorage() {
  return [sessionStorage, localStorage];
}

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function findProfile() {
  for (const storage of getStorage()) {
    for (const key of PROFILE_KEYS) {
      const raw = storage.getItem(key);

      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);

        if (!isObject(parsed)) continue;

        let profile = parsed;
        let wrapperKey = null;

        // Support common authentication response wrappers.
        for (const candidate of ["admin", "user", "data"]) {
          if (isObject(parsed[candidate])) {
            profile = parsed[candidate];
            wrapperKey = candidate;
            break;
          }
        }

        // Avoid treating an unrelated object as an admin profile.
        const hasProfileFields = [
          "name",
          "fullName",
          "username",
          "email",
          "employeeId",
          "_id",
          "id",
          "userId",
        ].some((field) => profile[field] != null);

        if (hasProfileFields) {
          return {
            profile,
            storage,
            key,
            wrapperKey,
          };
        }
      } catch (err) {
        console.warn(
          `Unable to parse ${key} from browser storage.`,
          err
        );
      }
    }
  }

  return null;
}

function getProfileName(profile) {
  const candidates = [
    profile?.name,
    profile?.fullName,
    profile?.username,
    profile?.employeeName,
    profile?.displayName,
  ];

  const validName = candidates.find(
    (value) => typeof value === "string" && value.trim()
  );

  if (validName) return validName.trim();

  if (
    typeof profile?.email === "string" &&
    profile.email.includes("@")
  ) {
    return profile.email.split("@")[0];
  }

  // Some existing admin records identify the account by employeeId.
  if (
    typeof profile?.employeeId === "string" &&
    profile.employeeId.trim()
  ) {
    return profile.employeeId.trim();
  }

  return "";
}

function getProfileEmail(profile) {
  return typeof profile?.email === "string"
    ? profile.email
    : "";
}

function getProfileImage(profile) {
  const candidates = [
    profile?.profileImage,
    profile?.profilePhoto,
    profile?.avatar,
    profile?.photo,
    profile?.image,
  ];

  return (
    candidates.find(
      (value) => typeof value === "string" && value.trim()
    ) || ""
  );
}

function getRole(profile) {
  const role = profile?.role ?? profile?.userRole;

  return typeof role === "string" && role.trim()
    ? role.trim().toUpperCase()
    : "ADMIN";
}

function getAccountId(profile) {
  const id =
    profile?._id ??
    profile?.id ??
    profile?.userId ??
    profile?.employeeId;

  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : "Not available";
}

function getRegisteredDate(profile) {
  const createdAt =
    profile?.createdAt ??
    profile?.created_at ??
    profile?.registeredAt ??
    profile?.registrationDate;

  if (
    typeof createdAt !== "string" &&
    typeof createdAt !== "number"
  ) {
    return "Not available";
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function createForm(profile) {
  return {
    name: getProfileName(profile),
    email: getProfileEmail(profile),
    profileImage: getProfileImage(profile),
  };
}

function AdminProfile() {
  const fileInputRef = useRef(null);

  const [admin, setAdmin] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function loadProfile() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = findProfile();

      if (!result) {
        setAdmin(null);
        setForm(EMPTY_FORM);
        setError(
          "Admin profile details were not found in browser storage. Please sign in again."
        );
        return;
      }

      setAdmin(result);
      setForm(createForm(result.profile));
      setImageError(false);
      setEditing(false);
    } catch (err) {
      console.error("Profile loading error:", err);
      setAdmin(null);
      setError("Unable to load your administrator profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again.
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Please select an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Unable to read the selected image.");
        return;
      }

      setForm((previous) => ({
        ...previous,
        profileImage: reader.result,
      }));

      setImageError(false);
      setError("");
      setMessage(
        "Image preview updated. Save your changes to keep it."
      );
    };

    reader.onerror = () => {
      setError(
        "Unable to read the selected image. Please try again."
      );
    };

    reader.readAsDataURL(file);
  }

  function handleCancel() {
    if (!admin) return;

    setForm(createForm(admin.profile));
    setImageError(false);
    setEditing(false);
    setError("");
    setMessage("");
  }

  function handleSave(event) {
    event.preventDefault();

    if (!admin || saving) return;

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        storage,
        key,
        wrapperKey,
      } = admin;

      const raw = storage.getItem(key);

      if (!raw) {
        throw new Error(
          "The saved profile no longer exists. Please reload the profile."
        );
      }

      const currentStoredValue = JSON.parse(raw);

      if (!isObject(currentStoredValue)) {
        throw new Error(
          "The stored profile format is invalid. Please reload the profile."
        );
      }

      // Preserve the latest record and all unrelated fields.
      const currentProfile = wrapperKey
        ? currentStoredValue[wrapperKey]
        : currentStoredValue;

      if (!isObject(currentProfile)) {
        throw new Error(
          "The administrator record could not be found. Please reload the profile."
        );
      }

      const updatedProfile = {
        ...currentProfile,
        name,
        fullName: name,
        email,
        profileImage: form.profileImage,
        profilePhoto: form.profileImage,
      };

      const updatedStoredValue = wrapperKey
        ? {
            ...currentStoredValue,
            [wrapperKey]: updatedProfile,
          }
        : updatedProfile;

      // Save to the same storage and key used by authentication.
      storage.setItem(key, JSON.stringify(updatedStoredValue));

      setAdmin({
        ...admin,
        profile: updatedProfile,
      });

      setForm(createForm(updatedProfile));
      setImageError(false);
      setEditing(false);
      setMessage(
        "Profile changes saved in this browser."
      );
    } catch (err) {
      console.error("Profile save error:", err);

      setError(
        err?.message ||
          "Unable to save your profile. Try a smaller image or free up browser storage."
      );
    } finally {
      setSaving(false);
    }
  }

  const profile = admin?.profile;

  const name =
    form.name.trim() ||
    getProfileName(profile) ||
    "Administrator";

  const email = form.email || "Email not available";
  const role = getRole(profile);
  const accountId = getAccountId(profile);
  const registeredDate = profile
    ? getRegisteredDate(profile)
    : "Not available";

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "A";

  if (loading) {
    return (
      <section className="admin-profile-page">
        <div className="ap-state">
          <RefreshCw className="ap-spin" size={25} />
          <h2>Loading profile</h2>
          <p>
            Retrieving your administrator information...
          </p>
        </div>
      </section>
    );
  }

  if (!admin) {
    return (
      <section className="admin-profile-page">
        <header className="ap-page-heading">
          <div>
            <span className="ap-eyebrow">
              ADMIN WORKSPACE
            </span>
            <h1>Administrator Profile</h1>
            <p>
              View and update your account information.
            </p>
          </div>
        </header>

        <div
          className="ap-notice ap-notice-error"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>
            {error ||
              "No administrator profile is available."}
          </span>
        </div>

        <button
          className="ap-refresh-button"
          type="button"
          onClick={loadProfile}
        >
          <RefreshCw size={16} />
          Reload profile
        </button>
      </section>
    );
  }

  return (
    <section className="admin-profile-page">
      <header className="ap-page-heading">
        <div>
          <span className="ap-eyebrow">
            ADMIN WORKSPACE
          </span>
          <h1>Administrator Profile</h1>
          <p>
            View and update your administrator account
            information.
          </p>
        </div>

        {!editing && (
          <button
            className="ap-refresh-button"
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setEditing(true);
            }}
          >
            <Pencil size={16} />
            Edit profile
          </button>
        )}
      </header>

      {error && (
        <div
          className="ap-notice ap-notice-error"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div
          className="ap-notice ap-notice-success"
          role="status"
        >
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      <article className="ap-profile-card">
        <div className="ap-banner">
          <div className="ap-banner-decoration ap-decoration-one" />
          <div className="ap-banner-decoration ap-decoration-two" />

          <div className="ap-banner-label">
            <ShieldCheck size={15} />
            Administrator account
          </div>
        </div>

        <div className="ap-profile-main">
          <div className="ap-avatar-wrapper">
            <div className="ap-avatar">
              {form.profileImage && !imageError ? (
                <img
                  src={form.profileImage}
                  alt="Administrator profile"
                  onError={() => setImageError(true)}
                />
              ) : (
                initials
              )}
            </div>

            {editing && (
              <>
                <button
                  type="button"
                  className="ap-camera-button"
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <Camera size={17} />
                </button>

                <input
                  ref={fileInputRef}
                  className="ap-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </>
            )}
          </div>

          <div className="ap-identity">
            <h2>{name}</h2>

            <p className="ap-identity-email">
              <Mail size={15} />
              <span>{email}</span>
            </p>

            <div className="ap-identity-badges">
              <span className="ap-role">
                <ShieldCheck size={14} />
                {role}
              </span>

              <span className="ap-account-status">
                <span className="ap-status-dot" />
                {profile?.accountStatus || "Administrator account"}
              </span>
            </div>
          </div>
        </div>

        {editing ? (
          <form
            className="ap-edit-form"
            onSubmit={handleSave}
          >
            <div className="ap-section-heading">
              <div>
                <h3>Edit account details</h3>
                <p>
                  Update your name, email, and profile picture.
                </p>
              </div>
            </div>

            <div className="ap-form-grid">
              <label className="ap-field">
                <span>Full name</span>

                <div className="ap-input-wrap">
                  <UserRound size={17} />

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </div>
              </label>

              <label className="ap-field">
                <span>Email address</span>

                <div className="ap-input-wrap">
                  <Mail size={17} />

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    maxLength={254}
                    autoComplete="email"
                    required
                  />
                </div>
              </label>
            </div>

            <div className="ap-upload-hint">
              <ImagePlus size={17} />
              <span>
                Select an image up to 2 MB. Your selected
                picture appears immediately; save to keep it
                in this browser.
              </span>
            </div>

            <div className="ap-form-actions">
              <button
                className="ap-cancel-button"
                type="button"
                onClick={handleCancel}
                disabled={saving}
              >
                <X size={16} />
                Cancel
              </button>

              <button
                className="ap-save-button"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw
                    className="ap-spin"
                    size={16}
                  />
                ) : (
                  <Save size={16} />
                )}

                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="ap-divider" />

            <div className="ap-section-heading">
              <div>
                <h3>Account information</h3>
                <p>Your saved account details</p>
              </div>
            </div>

            <div className="ap-details">
              <div className="ap-detail-item">
                <div className="ap-detail-icon">
                  <UserRound size={19} />
                </div>
                <div className="ap-detail-copy">
                  <span>Full name</span>
                  <strong>{name}</strong>
                </div>
              </div>

              <div className="ap-detail-item">
                <div className="ap-detail-icon">
                  <Mail size={19} />
                </div>
                <div className="ap-detail-copy">
                  <span>Email address</span>
                  <strong>{email}</strong>
                </div>
              </div>

              <div className="ap-detail-item">
                <div className="ap-detail-icon">
                  <ShieldCheck size={19} />
                </div>
                <div className="ap-detail-copy">
                  <span>Account role</span>
                  <strong>{role}</strong>
                </div>
              </div>

              <div className="ap-detail-item">
                <div className="ap-detail-icon">
                  <Fingerprint size={19} />
                </div>
                <div className="ap-detail-copy">
                  <span>Account ID</span>
                  <strong className="ap-account-id">
                    {accountId}
                  </strong>
                </div>
              </div>

              <div className="ap-detail-item">
                <div className="ap-detail-icon">
                  <CalendarDays size={19} />
                </div>
                <div className="ap-detail-copy">
                  <span>Registered on</span>
                  <strong>{registeredDate}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </article>

      <aside className="ap-security-card">
        <div className="ap-security-icon">
          <ShieldCheck size={22} />
        </div>

        <div>
          <h3>Administrator access</h3>
          <p>
            Your permissions are managed by your administrator
            account. The profile editor does not allow changes
            to your assigned role.
          </p>
        </div>
      </aside>
    </section>
  );
}

export default AdminProfile;
