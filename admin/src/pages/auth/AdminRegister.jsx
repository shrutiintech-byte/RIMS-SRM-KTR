import { useState } from "react";
import {
  ShieldCheck,
  User,
  Mail,
  Building2,
  BriefcaseBusiness,
  LockKeyhole,
  Eye,
  EyeOff,
  Hash,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import "./AdminRegister.css";

function AdminRegister({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    fullName: "",
    employeeId: "",
    email: "",
    department: "",
    designation: "",
    password: "",
    confirmPassword: "",
    setupCode: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = ({ target }) => {
    setFormData((prev) => ({
      ...prev,
      [target.name]: target.value,
    }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="auth-page register-page">
      {/* LEFT PANEL */}

      <section className="auth-brand-panel">
        <div className="auth-brand-header">
          <div className="auth-brand-mark">
            <img src="/images/srm-logo.png" alt="SRM Logo" />
          </div>

          <div className="auth-brand-name">
            <strong>SRM INSTITUTE OF SCIENCE AND TECHNOLOGY</strong>
            <span>KATTANKULATHUR CAMPUS</span>
          </div>
        </div>

        <div className="auth-brand-content">
          <span className="auth-eyebrow">ADMIN PORTAL</span>

          <h1>Create your administrator account</h1>

          <p>
            Register an authorized administrator account to manage research
            registrations, review submissions and oversee portal activities.
          </p>
        </div>

        <div className="auth-brand-footer">
          <span>SRM Institute of Science and Technology</span>
          <span>Secure Administration</span>
        </div>
      </section>

      {/* RIGHT PANEL */}

      <section className="auth-form-panel">
        <div className="auth-form-container register-container">
          <div className="auth-heading">
            <span className="auth-section-label">
              <User size={15} />
              ADMIN REGISTRATION
            </span>

            <h2>Create account</h2>

            <p>
              Enter your official details to register for administrator access.
            </p>
          </div>

          {error && (
            <div className="auth-message auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Full Name */}

            <div className="form-field">
              <label>Full Name</label>

              <div className="input-container">
                <User size={18} />
                <input
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Employee + Designation */}

            <div className="form-grid">
              <div className="form-field">
                <label>Employee ID</label>

                <div className="input-container">
                  <Hash size={18} />
                  <input
                    name="employeeId"
                    placeholder="Employee ID"
                    value={formData.employeeId}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Designation</label>

                <div className="input-container">
                  <BriefcaseBusiness size={18} />
                  <input
                    name="designation"
                    placeholder="Designation"
                    value={formData.designation}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Email */}

            <div className="form-field">
              <label>Official Email Address</label>

              <div className="input-container">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="name@srmist.edu.in"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Department */}

            <div className="form-field">
              <label>Department</label>

              <div className="input-container">
                <Building2 size={18} />

                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                >
                  <option value="">Select your department</option>
                  <option>Computer Science</option>
                  <option>Information Technology</option>
                  <option>Research and Development</option>
                  <option>Administration</option>
                  <option>Finance</option>
                </select>
              </div>
            </div>

            {/* Passwords */}

            <div className="form-grid">
              <div className="form-field">
                <label>Password</label>

                <div className="input-container">
                  <LockKeyhole size={18} />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>Confirm Password</label>

                <div className="input-container">
                  <LockKeyhole size={18} />

                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
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
            </div>

            {/* Setup Code */}

            <div className="form-field">
              <label>Administrator Setup Code</label>

              <div className="input-container">
                <ShieldCheck size={18} />
                <input
                  type="password"
                  name="setupCode"
                  placeholder="Authorized setup code"
                  value={formData.setupCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button className="auth-submit" disabled={loading}>
              Create Administrator Account
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-switch">
            <span>Already have an account?</span>

            <button onClick={onSwitchToLogin}>Sign in</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminRegister;