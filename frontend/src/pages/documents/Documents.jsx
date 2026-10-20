
import { useEffect, useMemo, useState } from "react";

import {
  Download,
  Eye,
  File,
  FileText,
  Filter,
  Search,
  Upload,
} from "lucide-react";

import "./Documents.css";

const API_BASE_URL = "http://localhost:5000";

const CATEGORIES = [
  "All Categories",
  "Research Project",
  "Patent",
  "Journal Publication",
  "Research Award",
  "Undergraduate Research",
  "Postgraduate Research",
  "Book / Book Chapter",
  "Conference Proceedings",
  "PhD Supervision",
  "E-Content",
  "Professional Development",
];

const FINANCIAL_YEARS = [
  "All Years",
  "2026-27",
  "2025-26",
  "2024-25",
];

const STATUS_OPTIONS = [
  "All Status",
  "Pending",
  "Under Review",
  "Verified",
  "Rejected",
];

/*
 * Read a useful error message from an API response.
 */
async function getResponseError(response, fallbackMessage) {
  try {
    const result = await response.json();
    return result.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

/*
 * Convert a file size into a readable format.
 */
function formatFileSize(size) {
  if (size === undefined || size === null || size === "") {
    return "—";
  }

  const bytes = Number(size);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return String(size);
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/*
 * Format a date for display.
 */
function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Documents() {
  const [documents, setDocuments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [financialYear, setFinancialYear] = useState("All Years");
  const [status, setStatus] = useState("All Status");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * Fetch real documents from the authenticated backend.
   */
  useEffect(() => {
    const controller = new AbortController();

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("rimsToken");

        if (!token) {
          setError(
            "Your session has expired. Please log in again."
          );
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/documents`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            await getResponseError(
              response,
              "Unable to retrieve documents."
            )
          );
        }

        const result = await response.json();

        const documentList = result.data?.documents;

        setDocuments(
          Array.isArray(documentList) ? documentList : []
        );
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Fetch documents error:", err);

        setError(
          err.message || "Unable to load documents."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDocuments();

    return () => {
      controller.abort();
    };
  }, []);

  /*
   * Filter documents.
   *
   * The backend document model uses originalName,
   * claim, and fileSize, so these are supported too.
   */
  const filteredDocuments = useMemo(() => {
    return documents.filter((documentItem) => {
      const search = searchTerm.trim().toLowerCase();

      const claim =
        documentItem.claim &&
        typeof documentItem.claim === "object"
          ? documentItem.claim
          : null;

      const documentName =
        documentItem.originalName ||
        documentItem.name ||
        documentItem.fileName ||
        documentItem.storedName ||
        "";

      const claimId =
        documentItem.claimId ||
        claim?._id ||
        claim?.claimId ||
        "";

      const documentCategory =
        documentItem.category ||
        documentItem.documentType ||
        "";

      const documentFinancialYear =
        documentItem.financialYear ||
        claim?.financialYear ||
        "";

      const rawStatus = documentItem.status || "Pending";

      const documentStatus =
        String(rawStatus).toLowerCase() === "uploaded"
          ? "Pending"
          : rawStatus;

      const matchesSearch =
        !search ||
        String(documentName).toLowerCase().includes(search) ||
        String(claimId).toLowerCase().includes(search) ||
        String(documentCategory).toLowerCase().includes(search);

      const matchesCategory =
        category === "All Categories" ||
        documentCategory === category;

      const matchesYear =
        financialYear === "All Years" ||
        documentFinancialYear === financialYear;

      const matchesStatus =
        status === "All Status" ||
        documentStatus === status;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesYear &&
        matchesStatus
      );
    });
  }, [
    documents,
    searchTerm,
    category,
    financialYear,
    status,
  ]);

  /*
   * Summary counts.
   */
  const totalDocuments = documents.length;

  const verifiedDocuments = documents.filter(
    (documentItem) =>
      String(documentItem.status || "").toLowerCase() === "verified"
  ).length;

  const underReviewDocuments = documents.filter(
    (documentItem) =>
      String(documentItem.status || "").toLowerCase() ===
      "under review"
  ).length;

  const pendingDocuments = documents.filter((documentItem) => {
    const currentStatus = String(
      documentItem.status || ""
    ).toLowerCase();

    return (
      currentStatus === "pending" ||
      currentStatus === "uploaded"
    );
  }).length;

  const clearFilters = () => {
    setSearchTerm("");
    setCategory("All Categories");
    setFinancialYear("All Years");
    setStatus("All Status");
  };

  /*
   * Retrieve the backend document ID.
   */
  const getDocumentId = (documentItem) => {
    return documentItem._id || documentItem.id;
  };

  /*
   * Fetch a document using the protected backend route.
   * The route requires the user's Bearer token.
   */
  const fetchDocumentFile = async (documentItem) => {
    const documentId = getDocumentId(documentItem);

    if (!documentId) {
      throw new Error("Unable to identify this document.");
    }

    const token = localStorage.getItem("rimsToken");

    if (!token) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/documents/${encodeURIComponent(
        documentId
      )}/file`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        await getResponseError(
          response,
          "Unable to retrieve the document file."
        )
      );
    }

    return response.blob();
  };

  /*
   * Preview a document.
   *
   * Open a blank tab immediately to avoid popup blocking,
   * then load the authenticated document as a Blob URL.
   */
  const handleView = async (documentItem) => {
    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      alert(
        "Please allow pop-ups for this site to preview documents."
      );
      return;
    }

    try {
      previewWindow.document.title = "Loading document...";

      const blob = await fetchDocumentFile(documentItem);
      const fileUrl = URL.createObjectURL(blob);

      previewWindow.location.replace(fileUrl);

      /*
       * Keep the object URL available while the preview is open.
       * Revoke it when the preview tab closes.
       */
      const cleanupInterval = window.setInterval(() => {
        if (previewWindow.closed) {
          window.clearInterval(cleanupInterval);
          URL.revokeObjectURL(fileUrl);
        }
      }, 1000);
    } catch (err) {
      console.error("Document preview error:", err);

      previewWindow.close();

      alert(
        err.message || "Unable to preview this document."
      );
    }
  };

  /*
   * Download a document through the authenticated endpoint.
   */
  const handleDownload = async (documentItem) => {
    try {
      const blob = await fetchDocumentFile(documentItem);

      const fileUrl = URL.createObjectURL(blob);

      const fileName =
        documentItem.originalName ||
        documentItem.name ||
        documentItem.fileName ||
        documentItem.storedName ||
        "document";

      const link = window.document.createElement("a");

      link.href = fileUrl;
      link.download = fileName;
      link.style.display = "none";

      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      window.setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 1000);
    } catch (err) {
      console.error("Document download error:", err);

      alert(
        err.message || "Unable to download this document."
      );
    }
  };

  /*
   * Upload remains connected to the existing claim workflow.
   */
  const handleUpload = () => {
    alert(
      "Document upload is available through the incentive claim workflow."
    );
  };

  return (
    <main className="documents-page">
      {/* Page Header */}
      <section className="documents-header">
        <div className="documents-title-row">
          <div className="documents-title-icon">
            <FileText size={25} />
          </div>

          <div>
            <h1>Documents</h1>

            <p>
              View and manage documents submitted
              with your incentive claims.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="documents-upload-button"
          onClick={handleUpload}
        >
          <Upload size={17} />
          Upload Document
        </button>
      </section>

      {/* Summary */}
      <section className="documents-summary">
        <div className="documents-summary-card">
          <div className="documents-summary-icon">
            <FileText size={19} />
          </div>

          <div>
            <span>Total Documents</span>
            <strong>{loading ? "—" : totalDocuments}</strong>
          </div>
        </div>

        <div className="documents-summary-card">
          <div className="documents-summary-icon verified">
            <FileText size={19} />
          </div>

          <div>
            <span>Verified</span>
            <strong>
              {loading ? "—" : verifiedDocuments}
            </strong>
          </div>
        </div>

        <div className="documents-summary-card">
          <div className="documents-summary-icon review">
            <FileText size={19} />
          </div>

          <div>
            <span>Under Review</span>
            <strong>
              {loading ? "—" : underReviewDocuments}
            </strong>
          </div>
        </div>

        <div className="documents-summary-card">
          <div className="documents-summary-icon pending">
            <FileText size={19} />
          </div>

          <div>
            <span>Pending</span>
            <strong>
              {loading ? "—" : pendingDocuments}
            </strong>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="documents-filter-card">
        <div className="documents-filter-title">
          <Filter size={18} />
          <span>Filter Documents</span>
        </div>

        <div className="documents-filter-row">
          <div className="documents-search">
            <Search size={17} />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by document, claim ID or category..."
            />
          </div>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={financialYear}
            onChange={(event) =>
              setFinancialYear(event.target.value)
            }
          >
            {FINANCIAL_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="documents-clear-button"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>
      </section>

      {/* Document List */}
      <section className="documents-list-card">
        <div className="documents-list-header">
          <div>
            <h2>Submitted Documents</h2>

            {!loading && !error && (
              <p>
                {filteredDocuments.length} document
                {filteredDocuments.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="documents-empty">
            <div className="documents-empty-icon">
              <FileText size={28} />
            </div>

            <h3>Loading documents...</h3>

            <p>
              Please wait while your documents are retrieved.
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="documents-empty">
            <div className="documents-empty-icon">
              <FileText size={28} />
            </div>

            <h3>Unable to load documents</h3>
            <p>{error}</p>
          </div>
        )}

        {/* No documents */}
        {!loading &&
          !error &&
          filteredDocuments.length === 0 && (
            <div className="documents-empty">
              <div className="documents-empty-icon">
                <File size={28} />
              </div>

              <h3>No documents found</h3>

              <p>
                {documents.length === 0
                  ? "You have not submitted any documents yet."
                  : "Try changing your search or filter criteria."}
              </p>

              {documents.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

        {/* Real documents */}
        {!loading &&
          !error &&
          filteredDocuments.length > 0 && (
            <div className="documents-table-wrapper">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Claim ID</th>
                    <th>Financial Year</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDocuments.map((documentItem) => {
                    const claim =
                      documentItem.claim &&
                      typeof documentItem.claim === "object"
                        ? documentItem.claim
                        : null;

                    const documentName =
                      documentItem.originalName ||
                      documentItem.name ||
                      documentItem.fileName ||
                      documentItem.storedName ||
                      "Unnamed document";

                    const documentType =
                      documentItem.mimeType ||
                      documentItem.type ||
                      documentItem.fileType ||
                      documentItem.documentType ||
                      "File";

                    const documentSize = formatFileSize(
                      documentItem.fileSize ??
                        documentItem.size
                    );

                    const rawStatus =
                      documentItem.status || "Pending";

                    const documentStatus =
                      String(rawStatus).toLowerCase() === "uploaded"
                        ? "Pending"
                        : rawStatus;

                    const documentCategory =
                      documentItem.category ||
                      documentItem.documentType ||
                      "—";

                    const claimId =
                      documentItem.claimId ||
                      claim?.claimNumber ||
                      claim?.claimId ||
                      claim?._id ||
                      "—";

                    const year =
                      documentItem.financialYear ||
                      claim?.financialYear ||
                      "—";

                    const uploadedDate = formatDate(
                      documentItem.uploadedDate ||
                        documentItem.createdAt
                    );

                    return (
                      <tr
                        key={
                          documentItem._id ||
                          documentItem.id
                        }
                      >
                        <td>
                          <div className="documents-name">
                            <div className="documents-file-icon">
                              <FileText size={18} />
                            </div>

                            <div>
                              <strong>{documentName}</strong>

                              <span>
                                {documentType}
                                {" · "}
                                {documentSize}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="documents-category">
                            {documentCategory}
                          </span>
                        </td>

                        <td>
                          <span className="documents-claim-id">
                            {claimId}
                          </span>
                        </td>

                        <td>{year}</td>

                        <td>{uploadedDate}</td>

                        <td>
                          <span
                            className={`documents-status ${String(
                              documentStatus
                            )
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {documentStatus}
                          </span>
                        </td>

                        <td>
                          <div className="documents-actions">
                            <button
                              type="button"
                              title="View document"
                              aria-label={`View ${documentName}`}
                              onClick={() =>
                                handleView(documentItem)
                              }
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              title="Download document"
                              aria-label={`Download ${documentName}`}
                              onClick={() =>
                                handleDownload(documentItem)
                              }
                            >
                              <Download size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </main>
  );
}

export default Documents;
