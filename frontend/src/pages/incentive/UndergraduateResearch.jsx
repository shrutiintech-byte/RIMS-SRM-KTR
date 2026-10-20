import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  FileText,
  IndianRupee,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import "./UndergraduateResearch.css";

const API_BASE_URL = "http://localhost:5000";

const CURRENT_FINANCIAL_YEAR = "2026-27";

const FINANCIAL_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
];

const RESEARCH_LEVELS = [
  "Department Level",
  "Institution Level",
  "Inter-Institutional",
  "National",
  "International",
];

const FACULTY_ROLES = [
  "Project Supervisor",
  "Co-Supervisor",
  "Research Mentor",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const initialFormData = {
  researchTitle: "",
  studentName: "",
  studentRegisterNumber: "",
  studentProgram: "",
  department: "",
  researchLevel: "",
  projectStartDate: "",
  projectEndDate: "",
  financialYear: CURRENT_FINANCIAL_YEAR,
  facultyName: "",
  facultyRole: "Project Supervisor",
  researchDescription: "",
  outcome: "",
  incentiveAmount: "",
};

const initialDocuments = {
  projectApproval: null,
  completionCertificate: null,
  researchReport: null,
  supportingEvidence: null,
};

const getToken = () => localStorage.getItem("rimsToken");

const clearSessionAndRedirect = (navigate) => {
  localStorage.removeItem("rimsToken");
  localStorage.removeItem("rimsUser");
  navigate("/");
};

const normalizeDateForInput = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

function UndergraduateResearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const draftClaim = location.state?.draftClaim || null;
  const draftFormData = draftClaim?.formData || {};

  const [claimId, setClaimId] = useState(draftClaim?._id || null);
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    ...draftFormData,
    financialYear: draftClaim?.financialYear || draftFormData.financialYear || CURRENT_FINANCIAL_YEAR,
    incentiveAmount: draftClaim?.incentiveAmount ?? draftFormData.incentiveAmount ?? initialFormData.incentiveAmount,
    projectStartDate: normalizeDateForInput(draftFormData.projectStartDate),
    projectEndDate: normalizeDateForInput(draftFormData.projectEndDate),
  }));
  const [students, setStudents] = useState(() =>
    Array.isArray(draftFormData.students)
      ? draftFormData.students.map((student, index) => ({
          ...student,
          id: student.id || `${Date.now()}-${index}`,
        }))
      : []
  );
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [declarationAccepted, setDeclarationAccepted] =
    useState(Boolean(draftClaim?.declarationAccepted));
  const [errors, setErrors] = useState({});
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!claimId) {
        setUploadedDocuments([]);
        return;
      }

      const token = getToken();
      if (!token) {
        clearSessionAndRedirect(navigate);
        return;
      }

      try {
        setLoadingDocuments(true);
        const response = await fetch(
          `${API_BASE_URL}/api/documents?claimId=${claimId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.status === 401) {
          clearSessionAndRedirect(navigate);
          return;
        }

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.message || "Unable to load claim documents.");
        }
        setUploadedDocuments(
          Array.isArray(result?.data?.documents) ? result.data.documents : []
        );
      } catch (error) {
        console.error("Load undergraduate research documents error:", error);
        setErrors((previous) => ({
          ...previous,
          _form: error.message || "Unable to load existing documents.",
        }));
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [claimId, navigate]);

  const hasDocument = (documentType) =>
    Boolean(documents[documentType]) ||
    uploadedDocuments.some((document) => document.documentType === documentType);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setSavedMessage("");
  };

  const handleFileChange = (event, documentName) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((previous) => ({
        ...previous,
        [documentName]:
          "File size must not exceed 10 MB.",
      }));

      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors((previous) => ({
        ...previous,
        [documentName]:
          "Only PDF, JPG and PNG files are allowed.",
      }));

      return;
    }

    setDocuments((previous) => ({
      ...previous,
      [documentName]: file,
    }));

    setErrors((previous) => ({
      ...previous,
      [documentName]: "",
    }));

    setSavedMessage("");
  };

  const addStudent = () => {
    setStudents((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: "",
        registerNumber: "",
        program: "",
      },
    ]);
  };

  const updateStudent = (id, field, value) => {
    setStudents((previous) =>
      previous.map((student) =>
        student.id === id
          ? {
              ...student,
              [field]: value,
            }
          : student
      )
    );

    setErrors((previous) => ({
      ...previous,
      [`student-${id}`]: "",
    }));

    setSavedMessage("");
  };

  const removeStudent = (id) => {
    setStudents((previous) =>
      previous.filter((student) => student.id !== id)
    );

    setErrors((previous) => {
      const updatedErrors = { ...previous };
      delete updatedErrors[`student-${id}`];
      return updatedErrors;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.researchTitle.trim()) {
      newErrors.researchTitle =
        "Research title is required.";
    }

    if (!formData.studentName.trim()) {
      newErrors.studentName =
        "Student name is required.";
    }

    if (!formData.studentRegisterNumber.trim()) {
      newErrors.studentRegisterNumber =
        "Student registration number is required.";
    }

    if (!formData.studentProgram.trim()) {
      newErrors.studentProgram =
        "Student program is required.";
    }

    if (!formData.department.trim()) {
      newErrors.department =
        "Department is required.";
    }

    if (!formData.researchLevel) {
      newErrors.researchLevel =
        "Please select the research level.";
    }

    if (!formData.projectStartDate) {
      newErrors.projectStartDate =
        "Project start date is required.";
    }

    if (!formData.projectEndDate) {
      newErrors.projectEndDate =
        "Project end date is required.";
    }

    if (
      formData.projectStartDate &&
      formData.projectEndDate &&
      formData.projectEndDate <
        formData.projectStartDate
    ) {
      newErrors.projectEndDate =
        "End date cannot be earlier than start date.";
    }

    if (!formData.facultyName.trim()) {
      newErrors.facultyName =
        "Faculty name is required.";
    }

    if (!formData.researchDescription.trim()) {
      newErrors.researchDescription =
        "Please provide a research description.";
    }

    if (!formData.outcome.trim()) {
      newErrors.outcome =
        "Please provide the research outcome.";
    }

    if (
      formData.incentiveAmount === "" ||
      Number(formData.incentiveAmount) < 0
    ) {
      newErrors.incentiveAmount =
        "Please enter a valid incentive amount.";
    }

    if (!hasDocument("projectApproval")) {
      newErrors.projectApproval =
        "Project approval document is required.";
    }

    if (!hasDocument("researchReport")) {
      newErrors.researchReport =
        "Research report is required.";
    }

    if (!declarationAccepted) {
      newErrors.declaration =
        "You must accept the declaration before submitting.";
    }

    students.forEach((student, index) => {
      if (!student.name.trim()) {
        newErrors[`student-${student.id}`] =
          `Please enter the name of student ${index + 1}.`;
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const buildClaimPayload = () => ({
    claimType: "UNDERGRADUATE_RESEARCH",
    financialYear: formData.financialYear,
    incentiveAmount: Number(formData.incentiveAmount || 0),
    declarationAccepted,
    formData: {
      ...formData,
      students,
    },
  });

  const saveClaim = async () => {
    const token = getToken();
    if (!token) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired. Please log in again.");
    }

    const updating = Boolean(claimId);
    const response = await fetch(
      updating
        ? `${API_BASE_URL}/api/claims/${claimId}`
        : `${API_BASE_URL}/api/claims`,
      {
        method: updating ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildClaimPayload()),
      }
    );

    if (response.status === 401) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired. Please log in again.");
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.message || "Unable to save the claim.");
    }

    const savedClaim = result?.data?.claim;
    const savedClaimId = savedClaim?._id || result?.data?._id || claimId;
    if (!savedClaimId) {
      throw new Error("The server did not return a claim ID.");
    }

    setClaimId(savedClaimId);
    return savedClaim || { _id: savedClaimId };
  };

  const uploadDocument = async (currentClaimId, documentType, file) => {
    const token = getToken();
    if (!token) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired. Please log in again.");
    }

    const uploadData = new FormData();
    uploadData.append("claimId", currentClaimId);
    uploadData.append("documentType", documentType);
    uploadData.append("document", file);

    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadData,
    });

    if (response.status === 401) {
      clearSessionAndRedirect(navigate);
      throw new Error("Your session has expired. Please log in again.");
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.message || `Unable to upload ${file.name}.`);
    }
    return result?.data?.document;
  };

  const uploadSelectedDocuments = async (currentClaimId) => {
    const selected = Object.entries(documents).filter(([, file]) => file);
    const uploaded = [];

    for (const [documentType, file] of selected) {
      const document = await uploadDocument(currentClaimId, documentType, file);
      if (document) uploaded.push(document);
    }

    if (uploaded.length) {
      setUploadedDocuments((previous) => [...uploaded, ...previous]);
      setDocuments(initialDocuments);
    }
    return uploaded;
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setErrors({});
      setSavedMessage("");

      const savedClaim = await saveClaim();
      await uploadSelectedDocuments(savedClaim._id || claimId);
      setSavedMessage("Draft saved successfully.");
    } catch (error) {
      console.error("Save undergraduate research draft error:", error);
      setErrors({ _form: error.message || "Unable to save the draft." });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavedMessage("");

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const savedClaim = await saveClaim();
      const savedClaimId = savedClaim._id || claimId;
      await uploadSelectedDocuments(savedClaimId);

      const token = getToken();
      if (!token) {
        clearSessionAndRedirect(navigate);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/claims/${savedClaimId}/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 401) {
        clearSessionAndRedirect(navigate);
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Unable to submit the claim.");
      }

      setSavedMessage("Undergraduate research claim submitted successfully.");
      setTimeout(() => navigate("/claims"), 900);
    } catch (error) {
      console.error("Submit undergraduate research claim error:", error);
      setErrors({ _form: error.message || "Unable to submit the claim." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="undergraduate-research-page">
      {/* Header */}

      <div className="undergraduate-research-header">
        <button
          type="button"
          className="undergraduate-research-back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={16} />
          <span>Back to Claims</span>
        </button>

        <div className="undergraduate-research-heading">
          <span className="undergraduate-research-eyebrow">
            Research Incentive
          </span>

          <h1 className="undergraduate-research-page-title">
            Undergraduate Research
          </h1>

          <p className="undergraduate-research-page-description">
            Submit details of research activities and
            projects involving undergraduate students.
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="undergraduate-research-message">
          <CheckCircle2 size={17} />
          <span>{savedMessage}</span>
        </div>
      )}

      {errors._form && (
        <div className="undergraduate-research-error" role="alert">
          {errors._form}
        </div>
      )}

      <form
        className="undergraduate-research-form"
        onSubmit={handleSubmit}
      >
        {/* Research Information */}

        <section className="undergraduate-research-card">
          <div className="undergraduate-research-section-header">
            <div className="undergraduate-research-section-icon">
              <BookOpen size={18} />
            </div>

            <div>
              <h2>Research Information</h2>

              <p>
                Provide the details of the undergraduate
                research project.
              </p>
            </div>
          </div>

          <div className="undergraduate-research-form-body">
            <div className="undergraduate-research-form-grid">
              <div className="undergraduate-research-field undergraduate-research-field-full">
                <label htmlFor="researchTitle">
                  Research Title <span>*</span>
                </label>

                <input
                  id="researchTitle"
                  name="researchTitle"
                  type="text"
                  value={formData.researchTitle}
                  onChange={handleChange}
                  placeholder="Enter the research project title"
                />

                {errors.researchTitle && (
                  <p className="undergraduate-research-error">
                    {errors.researchTitle}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field">
                <label htmlFor="researchLevel">
                  Research Level <span>*</span>
                </label>

                <select
                  id="researchLevel"
                  name="researchLevel"
                  value={formData.researchLevel}
                  onChange={handleChange}
                >
                  <option value="">
                    Select research level
                  </option>

                  {RESEARCH_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>

                {errors.researchLevel && (
                  <p className="undergraduate-research-error">
                    {errors.researchLevel}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field">
                <label htmlFor="department">
                  Department <span>*</span>
                </label>

                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Enter department"
                />

                {errors.department && (
                  <p className="undergraduate-research-error">
                    {errors.department}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field">
                <label htmlFor="projectStartDate">
                  Project Start Date <span>*</span>
                </label>

                <input
                  id="projectStartDate"
                  name="projectStartDate"
                  type="date"
                  value={formData.projectStartDate}
                  onChange={handleChange}
                />

                {errors.projectStartDate && (
                  <p className="undergraduate-research-error">
                    {errors.projectStartDate}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field">
                <label htmlFor="projectEndDate">
                  Project End Date <span>*</span>
                </label>

                <input
                  id="projectEndDate"
                  name="projectEndDate"
                  type="date"
                  value={formData.projectEndDate}
                  onChange={handleChange}
                />

                {errors.projectEndDate && (
                  <p className="undergraduate-research-error">
                    {errors.projectEndDate}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field">
                <label htmlFor="financialYear">
                  Financial Year <span>*</span>
                </label>

                <select
                  id="financialYear"
                  name="financialYear"
                  value={formData.financialYear}
                  onChange={handleChange}
                >
                  {FINANCIAL_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="undergraduate-research-field undergraduate-research-field-full">
                <label htmlFor="researchDescription">
                  Research Description <span>*</span>
                </label>

                <textarea
                  id="researchDescription"
                  name="researchDescription"
                  rows="4"
                  value={formData.researchDescription}
                  onChange={handleChange}
                  placeholder="Briefly describe the research problem, objectives and methodology"
                />

                {errors.researchDescription && (
                  <p className="undergraduate-research-error">
                    {errors.researchDescription}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field undergraduate-research-field-full">
                <label htmlFor="outcome">
                  Research Outcome <span>*</span>
                </label>

                <textarea
                  id="outcome"
                  name="outcome"
                  rows="4"
                  value={formData.outcome}
                  onChange={handleChange}
                  placeholder="Describe the outcome, findings, publication, prototype or other research output"
                />

                {errors.outcome && (
                  <p className="undergraduate-research-error">
                    {errors.outcome}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Student Information */}

        <section className="undergraduate-research-card">
          <div className="undergraduate-research-section-header">
            <div className="undergraduate-research-section-icon">
              <Users size={18} />
            </div>

            <div>
              <h2>Student Information</h2>

              <p>
                Enter the undergraduate student associated
                with the research project.
              </p>
            </div>
          </div>

          <div className="undergraduate-research-form-body">
            <div className="undergraduate-research-form-grid">
              <div className="undergraduate-research-field">
                <label htmlFor="studentName">
                  Student Name <span>*</span>
                </label>

                <input
                  id="studentName"
                  name="studentName"
                  type="text"
                  value={formData.studentName}
                  onChange={handleChange}
                  placeholder="Enter student name"
                />

                {errors.studentName && (
                  <p className="undergraduate-research-error">
                    {errors.studentName}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field">
                <label htmlFor="studentRegisterNumber">
                  Registration Number <span>*</span>
                </label>

                <input
                  id="studentRegisterNumber"
                  name="studentRegisterNumber"
                  type="text"
                  value={formData.studentRegisterNumber}
                  onChange={handleChange}
                  placeholder="Enter registration number"
                />

                {errors.studentRegisterNumber && (
                  <p className="undergraduate-research-error">
                    {errors.studentRegisterNumber}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field undergraduate-research-field-full">
                <label htmlFor="studentProgram">
                  Program / Course <span>*</span>
                </label>

                <input
                  id="studentProgram"
                  name="studentProgram"
                  type="text"
                  value={formData.studentProgram}
                  onChange={handleChange}
                  placeholder="Enter program or course"
                />

                {errors.studentProgram && (
                  <p className="undergraduate-research-error">
                    {errors.studentProgram}
                  </p>
                )}
              </div>
            </div>

            <div className="undergraduate-research-subsection">
              <div className="undergraduate-research-subsection-header">
                <div>
                  <h3>Additional Students</h3>

                  <p>
                    Add other undergraduate students involved
                    in the research project.
                  </p>
                </div>

                <button
                  type="button"
                  className="undergraduate-research-add-button"
                  onClick={addStudent}
                >
                  <Plus size={15} />
                  Add Student
                </button>
              </div>

              {students.length === 0 ? (
                <div className="undergraduate-research-empty-inline">
                  <Users size={15} />
                  <span>
                    No additional students have been added.
                  </span>
                </div>
              ) : (
                <div className="undergraduate-research-student-list">
                  {students.map((student, index) => (
                    <div
                      className="undergraduate-research-student-row"
                      key={student.id}
                    >
                      <div className="undergraduate-research-student-number">
                        {index + 1}
                      </div>

                      <div className="undergraduate-research-student-fields">
                        <div className="undergraduate-research-field">
                          <label>
                            Student Name <span>*</span>
                          </label>

                          <input
                            type="text"
                            value={student.name}
                            onChange={(event) =>
                              updateStudent(
                                student.id,
                                "name",
                                event.target.value
                              )
                            }
                            placeholder="Student name"
                          />
                        </div>

                        <div className="undergraduate-research-field">
                          <label>
                            Registration Number
                          </label>

                          <input
                            type="text"
                            value={student.registerNumber}
                            onChange={(event) =>
                              updateStudent(
                                student.id,
                                "registerNumber",
                                event.target.value
                              )
                            }
                            placeholder="Registration number"
                          />
                        </div>

                        <div className="undergraduate-research-field">
                          <label>
                            Program / Course
                          </label>

                          <input
                            type="text"
                            value={student.program}
                            onChange={(event) =>
                              updateStudent(
                                student.id,
                                "program",
                                event.target.value
                              )
                            }
                            placeholder="Program / course"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="undergraduate-research-remove-button"
                        onClick={() =>
                          removeStudent(student.id)
                        }
                        aria-label="Remove student"
                      >
                        <Trash2 size={15} />
                      </button>

                      {errors[
                        `student-${student.id}`
                      ] && (
                        <p className="undergraduate-research-error undergraduate-research-student-error">
                          {
                            errors[
                              `student-${student.id}`
                            ]
                          }
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Faculty Information */}

        <section className="undergraduate-research-card">
          <div className="undergraduate-research-section-header">
            <div className="undergraduate-research-section-icon">
              <Users size={18} />
            </div>

            <div>
              <h2>Faculty Information</h2>

              <p>
                Provide the faculty member's role in the
                research project.
              </p>
            </div>
          </div>

          <div className="undergraduate-research-form-body">
            <div className="undergraduate-research-form-grid">
              <div className="undergraduate-research-field">
                <label htmlFor="facultyName">
                  Faculty Name <span>*</span>
                </label>

                <input
                  id="facultyName"
                  name="facultyName"
                  type="text"
                  value={formData.facultyName}
                  onChange={handleChange}
                  placeholder="Enter faculty name"
                />

                {errors.facultyName && (
                  <p className="undergraduate-research-error">
                    {errors.facultyName}
                  </p>
                )}
              </div>

              <div className="undergraduate-research-field">
                <label htmlFor="facultyRole">
                  Faculty Role <span>*</span>
                </label>

                <select
                  id="facultyRole"
                  name="facultyRole"
                  value={formData.facultyRole}
                  onChange={handleChange}
                >
                  {FACULTY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Incentive Information */}

        <section className="undergraduate-research-card">
          <div className="undergraduate-research-section-header">
            <div className="undergraduate-research-section-icon">
              <IndianRupee size={18} />
            </div>

            <div>
              <h2>Incentive Information</h2>

              <p>
                Enter the incentive amount associated with
                this claim.
              </p>
            </div>
          </div>

          <div className="undergraduate-research-form-body">
            <div className="undergraduate-research-form-grid">
              <div className="undergraduate-research-field">
                <label htmlFor="incentiveAmount">
                  Claimed Incentive Amount <span>*</span>
                </label>

                <div className="undergraduate-research-input-prefix">
                  <span>₹</span>

                  <input
                    id="incentiveAmount"
                    name="incentiveAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.incentiveAmount}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                {errors.incentiveAmount && (
                  <p className="undergraduate-research-error">
                    {errors.incentiveAmount}
                  </p>
                )}

                <small>
                  The final eligible amount will be verified
                  during claim review.
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* Supporting Documents */}

        <section className="undergraduate-research-card">
          <div className="undergraduate-research-section-header">
            <div className="undergraduate-research-section-icon">
              <FileCheck2 size={18} />
            </div>

            <div>
              <h2>Supporting Documents</h2>

              <p>
                Attach the documents required to support the
                undergraduate research incentive claim.
              </p>
            </div>
          </div>

          <div className="undergraduate-research-form-body">
            <div className="undergraduate-research-document-list">
              <DocumentUpload
                label="Project Approval"
                description="Approval or sanction document for the undergraduate research project."
                documentName="projectApproval"
                required
                file={documents.projectApproval}
                uploadedDocument={uploadedDocuments.find((document) => document.documentType === "projectApproval")}
                error={errors.projectApproval}
                onChange={handleFileChange}
              />

              <DocumentUpload
                label="Completion Certificate"
                description="Official certificate confirming completion of the research project."
                documentName="completionCertificate"
                file={documents.completionCertificate}
                uploadedDocument={uploadedDocuments.find((document) => document.documentType === "completionCertificate")}
                error={errors.completionCertificate}
                onChange={handleFileChange}
              />

              <DocumentUpload
                label="Research Report"
                description="Final research report or project documentation."
                documentName="researchReport"
                required
                file={documents.researchReport}
                uploadedDocument={uploadedDocuments.find((document) => document.documentType === "researchReport")}
                error={errors.researchReport}
                onChange={handleFileChange}
              />

              <DocumentUpload
                label="Supporting Evidence"
                description="Additional evidence related to the research outcome."
                documentName="supportingEvidence"
                file={documents.supportingEvidence}
                uploadedDocument={uploadedDocuments.find((document) => document.documentType === "supportingEvidence")}
                error={errors.supportingEvidence}
                onChange={handleFileChange}
              />
            </div>

            {loadingDocuments && (
              <p className="undergraduate-research-document-note-text">Loading previously uploaded documents...</p>
            )}

            {loadingDocuments && (
              <p className="undergraduate-research-selected-file">
                Loading previously uploaded documents...
              </p>
            )}

            <div className="undergraduate-research-document-note">
              <FileText size={17} />

              <p>
                Accepted formats: PDF, JPG, JPEG, and PNG.
                Maximum file size 10 MB per document.
              </p>
            </div>
          </div>
        </section>

        {/* Declaration */}

        <section className="undergraduate-research-card undergraduate-research-declaration-card">
          <div className="undergraduate-research-checkbox-wrapper">
            <input
              id="declarationAccepted"
              type="checkbox"
              checked={declarationAccepted}
              onChange={(event) => {
                setDeclarationAccepted(
                  event.target.checked
                );

                setErrors((previous) => ({
                  ...previous,
                  declaration: "",
                }));
              }}
            />

            <label htmlFor="declarationAccepted">
              I declare that the information provided in
              this claim is true and accurate to the best of
              my knowledge. I understand that the submitted
              documents may be verified during the review
              process.
            </label>
          </div>

          {errors.declaration && (
            <p className="undergraduate-research-error">
              {errors.declaration}
            </p>
          )}
        </section>

        {/* Submission */}

        <section className="undergraduate-research-submission-card">
          <div className="undergraduate-research-submission-content">
            <div>
              <h2>Submission</h2>

              <p>
                Save this claim as a draft or submit it for
                review after completing all required fields
                and documents.
              </p>
            </div>

            <div className="undergraduate-research-submission-meta">
              <span>Financial Year</span>
              <strong>{formData.financialYear}</strong>
            </div>
          </div>

          <div className="undergraduate-research-actions">
            <button
              type="button"
              className="undergraduate-research-secondary-button"
              onClick={handleSaveDraft}
              disabled={saving || submitting || loadingDocuments}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="submit"
              className="undergraduate-research-primary-button"
              disabled={saving || submitting || loadingDocuments}
            >
              <CheckCircle2 size={15} />
              {submitting ? "Submitting..." : "Submit Claim"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function DocumentUpload({
  label,
  description,
  documentName,
  required = false,
  file,
  uploadedDocument,
  error,
  onChange,
}) {
  return (
    <div className="undergraduate-research-document-item">
      <div className="undergraduate-research-document-information">
        <div className="undergraduate-research-document-icon">
          <FileText size={18} />
        </div>

        <div>
          <div className="undergraduate-research-document-title">
            <strong>{label}</strong>

            {required && (
              <span className="undergraduate-research-document-required">
                Required
              </span>
            )}
          </div>

          <p>{description}</p>
        </div>
      </div>

      <label className="undergraduate-research-upload-button">
        <Upload size={15} />

        <span>
          {file || uploadedDocument ? "Replace File" : "Choose File"}
        </span>

        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(event) =>
            onChange(event, documentName)
          }
        />
      </label>

      {error && (
        <p className="undergraduate-research-error">{error}</p>
      )}

      {file ? (
        <span className="undergraduate-research-selected-file">
          {file.name}
        </span>
      ) : uploadedDocument ? (
        <span className="undergraduate-research-selected-file">
          Uploaded: {uploadedDocument.originalName || uploadedDocument.fileName || "Document attached"}
        </span>
      ) : null}
    </div>
  );
}

export default UndergraduateResearch;