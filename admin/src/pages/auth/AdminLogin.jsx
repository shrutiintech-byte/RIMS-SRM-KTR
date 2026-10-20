
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  IdCard,
  Lock,
  ShieldCheck,
} from "lucide-react";
import "./AdminLogin.css";
function AdminLogin({ onSwitchToRegister, onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
    rememberMe: false,
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setLoginData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!loginData.identifier.trim()) {
      alert("Email or Employee ID is required.");
      return;
    }

    if (!loginData.password) {
      alert("Password is required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: loginData.identifier.trim(),
            password: loginData.password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Login failed.");
        return;
      }

      const user = result.data?.user;
      const token = result.data?.token;

      if (!token || !user) {
        alert("Invalid login response from the server.");
        return;
      }

      if (user.role !== "ADMIN") {
        alert(
          "You are not authorized to access the Admin Portal."
        );
        return;
      }

      // Clear previous credentials from both storage locations.
      localStorage.removeItem("rimsAdminToken");
      localStorage.removeItem("rimsAdminUser");
      sessionStorage.removeItem("rimsAdminToken");
      sessionStorage.removeItem("rimsAdminUser");

      // Remember the session according to the user's choice.
      const storage = loginData.rememberMe
        ? localStorage
        : sessionStorage;

      storage.setItem("rimsAdminToken", token);
      storage.setItem("rimsAdminUser", JSON.stringify(user));

      alert(`Welcome, ${user.fullName || "Administrator"}`);

      // Navigate to the dashboard after successful authentication.
      if (typeof onLoginSuccess === "function") {
        onLoginSuccess();
      }
    } catch (error) {
      console.error("Admin login error:", error);

      alert(
        "Unable to connect to the RIMS server. Please check that the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* BRAND PANEL */}
      <section className="auth-brand-panel">
        <div className="auth-brand-header">
          <div className="auth-brand-mark">
            <ShieldCheck size={25} />
          </div>

          <div className="auth-brand-name">
            <strong>SRM RIMS</strong>
            <span>ADMINISTRATION</span>
          </div>
        </div>

        <div className="auth-brand-content">
          <span className="auth-eyebrow">
            SECURE ADMINISTRATIVE PORTAL
          </span>

          <h1>
            Research Incentive
            <br />
            Management System
          </h1>

          <p>
            Centralized administration for faculty
            accounts, incentive claims, policy
            management, institutional workflows and
            reporting.
          </p>
        </div>

        <div className="auth-brand-footer">
          <span>
            SRM Institute of Science and Technology
          </span>

          <span>Kattankulathur Campus</span>
        </div>
      </section>

      {/* LOGIN FORM PANEL */}
      <section className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-heading">
            <span className="auth-section-label">
              RIMS ADMIN PORTAL
            </span>

            <h2>Administrator Sign In</h2>

            <p>
              Sign in with your authorized
              administrative credentials.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="identifier">
                Email / Employee ID
              </label>

              <div className="input-container">
                <IdCard size={18} aria-hidden="true" />

                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={loginData.identifier}
                  onChange={handleChange}
                  placeholder="Enter email or employee ID"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    alert(
                      "Password recovery will be implemented later."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>

              <div className="input-container">
                <Lock size={18} aria-hidden="true" />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <label className="remember-option">
              <input
                type="checkbox"
                name="rememberMe"
                checked={loginData.rememberMe}
                onChange={handleChange}
              />

              <span>Remember this device</span>
            </label>

            <button
              type="submit"
              className="primary-auth-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="button-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="switch-auth">
            <span>Need administrator access?</span>

            <button
              type="button"
              className="switch-button"
              onClick={onSwitchToRegister}
            >
              Register Administrator
            </button>
          </div>

          <div className="security-note">
            <ShieldCheck size={16} />

            <span>
              Authorized administrative access only
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminLogin;
