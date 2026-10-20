import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserPlus,
  ShieldCheck,
  Camera,
} from "lucide-react";

import "./Login.css";

// =========================================================
// DEPARTMENTS
// =========================================================

const departments = [
  "Biochemistry",
  "Biotechnology",
  "Career Guidance",
  "Commerce",
  "Computer Applications",
  "Computer Science",
  "CS and AF",
  "Defence and Strategic Studies",
  "Directorate of Sports",
  "Economics",
  "English",
  "Fashion Designing",
  "French",
  "Hindi",
  "Journalism and Mass Communication",
  "Psychology",
  "Social Work",
  "Teacher Education",
  "Visual Communication",
];

// =========================================================
// DESIGNATIONS
// =========================================================

const designations = [
  "Professor",
  "Research Professor",
  "Associate Professor",
  "Assistant Professor Grade 1",
  "Assistant Professor",
  "Teaching Associate",
  "Research Scholar",
  "Other",
];

// =========================================================
// LOGIN COMPONENT
// =========================================================

function Login() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("signin");

  // =========================================================
  // PASSWORD VISIBILITY
  // =========================================================

  const [showPassword, setShowPassword] = useState(false);

  const [showRegisterPassword, setShowRegisterPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // =========================================================
  // LOGIN DATA
  // =========================================================

  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
    rememberMe: false,
  });

  // =========================================================
  // REGISTRATION DATA
  // =========================================================

  const [registerData, setRegisterData] = useState({
    fullName: "",
    employeeId: "",
    email: "",
    department: "",
    designation: "",
    otherDesignation: "",
    password: "",
    confirmPassword: "",
    declaration: false,
  });

  // =========================================================
  // PROFILE PHOTO
  // =========================================================

  const [profilePhoto, setProfilePhoto] = useState(null);

  const [profilePhotoPreview, setProfilePhotoPreview] =
    useState("");

  // =========================================================
  // CLEANUP PHOTO PREVIEW
  // =========================================================

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  // =========================================================
  // PROFILE PHOTO CHANGE
  // =========================================================

  const handleProfilePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      alert(
        "Please select a JPG, PNG, or WebP image."
      );

      event.target.value = "";
      return;
    }

    // Maximum 2 MB
    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "Profile photograph must be 2 MB or smaller."
      );

      event.target.value = "";
      return;
    }

    // Remove previous preview URL
    if (profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
    }

    setProfilePhoto(file);

    setProfilePhotoPreview(
      URL.createObjectURL(file)
    );
  };

  // =========================================================
  // LOGIN INPUT CHANGE
  // =========================================================

  const handleLoginChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setLoginData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =========================================================
  // REGISTRATION INPUT CHANGE
  // =========================================================

  const handleRegisterChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setRegisterData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =========================================================
  // LOGIN SUBMIT
  // =========================================================

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            identifier:
              loginData.identifier.trim(),

            password:
              loginData.password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.message ||
            "Login failed"
        );

        return;
      }

      // Store authentication token
      localStorage.setItem(
        "rimsToken",
        result.data.token
      );

      // Store authenticated user
      localStorage.setItem(
        "rimsUser",
        JSON.stringify(
          result.data.user
        )
      );

      console.log(
        "Login successful:",
        result.data.user
      );

      // Go to Faculty Dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      alert(
        "Unable to connect to RIMS server. Please try again."
      );
    }
  };

  // =========================================================
  // REQUEST ACCESS SUBMIT
  // =========================================================

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();

    // =======================================================
    // PASSWORD CONFIRMATION
    // =======================================================

    if (
      registerData.password !==
      registerData.confirmPassword
    ) {
      alert(
        "Passwords do not match."
      );

      return;
    }

    // =======================================================
    // VALIDATE OTHER DESIGNATION
    // =======================================================

    if (
      registerData.designation === "Other" &&
      !registerData.otherDesignation.trim()
    ) {
      alert(
        "Please specify your designation."
      );

      return;
    }

    try {
      // =====================================================
      // FORM DATA
      // =====================================================

      const formData = new FormData();

      formData.append(
        "fullName",
        registerData.fullName.trim()
      );

      formData.append(
        "employeeId",
        registerData.employeeId.trim()
      );

      formData.append(
        "department",
        registerData.department
      );

      // =====================================================
      // FINAL DESIGNATION
      // =====================================================
      // If user selects Other, send the custom designation.
      // Otherwise send the selected designation.

      const finalDesignation =
        registerData.designation === "Other"
          ? registerData.otherDesignation.trim()
          : registerData.designation;

      formData.append(
        "designation",
        finalDesignation
      );

      formData.append(
        "email",
        registerData.email.trim()
      );

      formData.append(
        "password",
        registerData.password
      );

      formData.append(
        "confirmPassword",
        registerData.confirmPassword
      );

      formData.append(
        "declarationAccepted",
        String(
          registerData.declaration
        )
      );

      // =====================================================
      // OPTIONAL PROFILE PHOTO
      // =====================================================

      if (profilePhoto) {
        formData.append(
          "profilePhoto",
          profilePhoto
        );
      }

      // =====================================================
      // API REQUEST
      // =====================================================

      const response = await fetch(
        "http://localhost:5000/api/auth/request-access",
        {
          method: "POST",

          // IMPORTANT:
          // Do not manually set Content-Type.
          // Browser automatically creates multipart boundary.

          body: formData,
        }
      );

      const result =
        await response.json();

      // =====================================================
      // ERROR RESPONSE
      // =====================================================

      if (!response.ok) {
        alert(
          result.message ||
            "Unable to submit access request"
        );

        return;
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      alert(
        result.message
      );

      // =====================================================
      // RESET REGISTRATION DATA
      // =====================================================

      setRegisterData({
        fullName: "",
        employeeId: "",
        email: "",
        department: "",
        designation: "",
        otherDesignation: "",
        password: "",
        confirmPassword: "",
        declaration: false,
      });

      // =====================================================
      // RESET PROFILE PHOTO
      // =====================================================

      if (profilePhotoPreview) {
        URL.revokeObjectURL(
          profilePhotoPreview
        );
      }

      setProfilePhoto(null);
      setProfilePhotoPreview("");

      // =====================================================
      // RETURN TO SIGN IN
      // =====================================================

      setActiveTab("signin");

    } catch (error) {
      console.error(
        "Request access error:",
        error
      );

      alert(
        "Unable to connect to RIMS server. Please try again."
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="login-page">

      {/* =====================================================
          CAMPUS BACKGROUND
      ===================================================== */}

      <div
        className="campus-background"
        aria-hidden="true"
      >
        <div className="campus-background-image" />
      </div>

      <div
        className="campus-overlay"
        aria-hidden="true"
      />

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="login-content">

        {/* ===================================================
            LEFT BRANDING
        =================================================== */}

        <section className="rims-branding">

          <div className="university-brand">

            <div className="srm-logo-wrapper">

              <img
                src="/images/srm-logo.png"
                alt="SRM Institute of Science and Technology"
                className="srm-logo"
              />

            </div>

            <div className="university-details">

              <p className="university-name">
                SRM INSTITUTE OF SCIENCE AND TECHNOLOGY
              </p>

              <p className="campus-name">
                KATTANKULUR CAMPUS
              </p>

            </div>

          </div>

          <div className="branding-main">

            <span className="rims-small-title">
              RIMS
            </span>

            <h1>
              Research Incentive
              <br />
              Management System
            </h1>

            <div className="gold-line" />

            <p className="faculty-name">
              FSH – Faculty of Science and Humanities
            </p>

          </div>

        </section>

        {/* ===================================================
            AUTHENTICATION CARD
        =================================================== */}

        <section className="authentication-card">

          <div className="authentication-inner">

            {/* =================================================
                HEADING
            ================================================= */}

            <div className="auth-heading">

              <span>
                FSH • RIMS PORTAL
              </span>

              <h2>
                {activeTab === "signin"
                  ? "Welcome to RIMS"
                  : "Request RIMS Access"}
              </h2>

              <p>
                {activeTab === "signin"
                  ? "Access your research incentive workspace."
                  : "Create your faculty account to access the portal."}
              </p>

            </div>

            {/* =================================================
                AUTH TABS
            ================================================= */}

            <div className="auth-tabs">

              <button
                type="button"
                className={`auth-tab ${
                  activeTab === "signin"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("signin")
                }
              >

                <LockKeyhole size={18} />

                <span>
                  Sign In
                </span>

              </button>

              <button
                type="button"
                className={`auth-tab ${
                  activeTab === "register"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("register")
                }
              >

                <UserPlus size={18} />

                <span>
                  Request Access
                </span>

              </button>

            </div>

            {/* =================================================
                SIGN IN FORM
            ================================================= */}

            {activeTab === "signin" && (

              <form
                className="auth-form"
                onSubmit={
                  handleLoginSubmit
                }
              >

                {/* EMAIL / EMPLOYEE ID */}

                <div className="form-group">

                  <label htmlFor="identifier">
                    Email / Employee ID
                  </label>

                  <div className="input-wrapper">

                    <Mail size={19} />

                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      placeholder="Enter your email or employee ID"
                      value={
                        loginData.identifier
                      }
                      onChange={
                        handleLoginChange
                      }
                      autoComplete="username"
                      required
                    />

                  </div>

                </div>

                {/* PASSWORD */}

                <div className="form-group">

                  <div className="form-label-row">

                    <label htmlFor="login-password">
                      Password
                    </label>

                    <button
                      type="button"
                      className="forgot-password"
                      onClick={() =>
                        console.log(
                          "Forgot password"
                        )
                      }
                    >
                      Forgot password?
                    </button>

                  </div>

                  <div className="input-wrapper">

                    <LockKeyhole size={19} />

                    <input
                      id="login-password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Enter your password"
                      value={
                        loginData.password
                      }
                      onChange={
                        handleLoginChange
                      }
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >

                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}

                    </button>

                  </div>

                </div>

                {/* REMEMBER ME */}

                <label className="checkbox-row">

                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={
                      loginData.rememberMe
                    }
                    onChange={
                      handleLoginChange
                    }
                  />

                  <span>
                    Remember me
                  </span>

                </label>

                {/* SIGN IN BUTTON */}

                <button
                  type="submit"
                  className="primary-button"
                >

                  <span>
                    Sign In
                  </span>

                  <ArrowRight size={19} />

                </button>

                {/* SECURITY NOTE */}

                <div className="security-note">

                  <ShieldCheck size={17} />

                  <span>
                    Your information is secure and
                    protected.
                  </span>

                </div>

                {/* REQUEST ACCESS */}

                <div className="switch-message">

                  New to RIMS?

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "register"
                      )
                    }
                  >
                    Request Access
                  </button>

                </div>

              </form>

            )}

            {/* =================================================
                REQUEST ACCESS FORM
            ================================================= */}

            {activeTab === "register" && (

              <form
                className="auth-form registration-form"
                onSubmit={
                  handleRegisterSubmit
                }
              >

                {/* =================================================
                    1. BASIC INFORMATION
                ================================================= */}

                <div className="form-row">

                  {/* FULL NAME */}

                  <div className="form-group">

                    <label htmlFor="fullName">
                      Full Name
                    </label>

                    <div className="input-wrapper">

                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={
                          registerData.fullName
                        }
                        onChange={
                          handleRegisterChange
                        }
                        autoComplete="name"
                        required
                      />

                    </div>

                  </div>

                  {/* EMPLOYEE ID */}

                  <div className="form-group">

                    <label htmlFor="employeeId">
                      Employee ID
                    </label>

                    <div className="input-wrapper">

                      <input
                        id="employeeId"
                        name="employeeId"
                        type="text"
                        placeholder="Enter employee ID"
                        value={
                          registerData.employeeId
                        }
                        onChange={
                          handleRegisterChange
                        }
                        required
                      />

                    </div>

                  </div>

                </div>

                {/* =================================================
                    2. DEPARTMENT + DESIGNATION
                ================================================= */}

                <div className="form-row">

                  {/* DEPARTMENT */}

                  <div className="form-group">

                    <label htmlFor="department">
                      Department
                    </label>

                    <div className="input-wrapper">

                      <select
                        id="department"
                        name="department"
                        value={
                          registerData.department
                        }
                        onChange={
                          handleRegisterChange
                        }
                        required
                      >

                        <option value="">
                          Select your department
                        </option>

                        {departments.map(
                          (department) => (

                            <option
                              key={department}
                              value={department}
                            >
                              {department}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                  </div>

                  {/* DESIGNATION */}

                  <div className="form-group">

                    <label htmlFor="designation">
                      Designation
                    </label>

                    <div className="input-wrapper">

                      <select
                        id="designation"
                        name="designation"
                        value={
                          registerData.designation
                        }
                        onChange={
                          handleRegisterChange
                        }
                        required
                      >

                        <option value="">
                          Select your designation
                        </option>

                        {designations.map(
                          (designation) => (

                            <option
                              key={designation}
                              value={designation}
                            >
                              {designation}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    OTHER DESIGNATION
                ================================================= */}

                {registerData.designation === "Other" && (

                  <div className="form-group">

                    <label htmlFor="otherDesignation">
                      Please specify designation
                    </label>

                    <div className="input-wrapper">

                      <input
                        id="otherDesignation"
                        name="otherDesignation"
                        type="text"
                        placeholder="Enter your designation"
                        value={
                          registerData.otherDesignation
                        }
                        onChange={
                          handleRegisterChange
                        }
                        required
                      />

                    </div>

                  </div>

                )}

                {/* =================================================
                    3. INSTITUTIONAL EMAIL
                ================================================= */}

                <div className="form-group">

                  <label htmlFor="email">
                    Institutional Email
                  </label>

                  <div className="input-wrapper">

                    <Mail size={19} />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your institutional email"
                      value={
                        registerData.email
                      }
                      onChange={
                        handleRegisterChange
                      }
                      autoComplete="email"
                      required
                    />

                  </div>

                </div>

                {/* =================================================
                    4. PROFILE PHOTOGRAPH
                ================================================= */}

                <div className="form-group profile-photo-group">

                  <label htmlFor="profilePhoto">

                    Profile Photograph

                    <span className="optional-label">
                      {" "}Optional
                    </span>

                  </label>

                  <div className="profile-photo-upload">

                    {/* PHOTO PREVIEW */}

                    <div className="profile-photo-preview">

                      {profilePhotoPreview ? (

                        <img
                          src={
                            profilePhotoPreview
                          }
                          alt="Selected profile"
                        />

                      ) : (

                        <Camera size={28} />

                      )}

                    </div>

                    {/* PHOTO CONTROLS */}

                    <div className="profile-photo-details">

                      <label
                        htmlFor="profilePhoto"
                        className="photo-select-button"
                      >
                        Choose Photograph
                      </label>

                      <input
                        id="profilePhoto"
                        name="profilePhoto"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={
                          handleProfilePhotoChange
                        }
                      />

                      <p>
                        JPG, PNG or WebP · Maximum 2 MB
                      </p>

                      {profilePhoto && (

                        <span className="selected-photo-name">
                          {profilePhoto.name}
                        </span>

                      )}

                    </div>

                  </div>

                </div>

                {/* =================================================
                    5. PASSWORD + CONFIRM PASSWORD
                ================================================= */}

                <div className="form-row">

                  {/* PASSWORD */}

                  <div className="form-group">

                    <label htmlFor="register-password">
                      Password
                    </label>

                    <div className="input-wrapper">

                      <LockKeyhole size={19} />

                      <input
                        id="register-password"
                        name="password"
                        type={
                          showRegisterPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Create a password"
                        value={
                          registerData.password
                        }
                        onChange={
                          handleRegisterChange
                        }
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowRegisterPassword(
                            (previous) =>
                              !previous
                          )
                        }
                        aria-label={
                          showRegisterPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >

                        {showRegisterPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}

                      </button>

                    </div>

                  </div>

                  {/* CONFIRM PASSWORD */}

                  <div className="form-group">

                    <label htmlFor="confirmPassword">
                      Confirm Password
                    </label>

                    <div className="input-wrapper">

                      <LockKeyhole size={19} />

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        placeholder="Confirm your password"
                        value={
                          registerData.confirmPassword
                        }
                        onChange={
                          handleRegisterChange
                        }
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(
                            (previous) =>
                              !previous
                          )
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >

                        {showConfirmPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}

                      </button>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    6. DECLARATION
                ================================================= */}

                <label className="checkbox-row declaration-row">

                  <input
                    type="checkbox"
                    name="declaration"
                    checked={
                      registerData.declaration
                    }
                    onChange={
                      handleRegisterChange
                    }
                    required
                  />

                  <span>
                    I confirm that the information
                    provided is accurate and belongs
                    to my institutional profile.
                  </span>

                </label>

                {/* =================================================
                    7. SUBMIT
                ================================================= */}

                <button
                  type="submit"
                  className="primary-button"
                >

                  <span>
                    Submit Access Request
                  </span>

                  <ArrowRight size={19} />

                </button>

                {/* SECURITY NOTE */}

                <div className="security-note">

                  <ShieldCheck size={17} />

                  <span>
                    Access requests are subject to
                    verification.
                  </span>

                </div>

                {/* SIGN IN */}

                <div className="switch-message">

                  Already registered?

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "signin"
                      )
                    }
                  >
                    Sign In
                  </button>

                </div>

              </form>

            )}

          </div>

        </section>

      </div>

    </main>
  );
}

export default Login;