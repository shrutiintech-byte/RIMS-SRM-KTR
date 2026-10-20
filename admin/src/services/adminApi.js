
const API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_URL ||
  "http://localhost:5000/api/admin"
).replace(/\/+$/, "");

const API_ROOT = API_BASE_URL.replace(/\/api\/admin$/, "");

function getAdminToken() {
  return (
    localStorage.getItem("rimsAdminToken") ||
    sessionStorage.getItem("rimsAdminToken")
  );
}

export class AdminApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const search = query.toString();
  return search ? `?${search}` : "";
}

async function requestFromBase(baseUrl, endpoint, options = {}) {
  const token = getAdminToken();

  if (!token) {
    throw new AdminApiError(
      "Your admin session has expired. Please log in again.",
      401
    );
  }

  let response;

  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new AdminApiError(
        "Unable to connect to the server. Check that your backend is running and the API URL is correct."
      );
    }

    throw error;
  }

  let result;

  try {
    const responseText = await response.text();
    result = responseText.trim() ? JSON.parse(responseText) : null;
  } catch {
    throw new AdminApiError(
      "The server returned an invalid response. Please try again.",
      response.status
    );
  }

  if (response.status === 401) {
    throw new AdminApiError(
      result?.message ||
        "Your session has expired. Please log in again.",
      401
    );
  }

  if (response.status === 403) {
    throw new AdminApiError(
      result?.message ||
        "You are not authorized to perform this action.",
      403
    );
  }

  if (!response.ok || result?.success === false) {
    throw new AdminApiError(
      result?.message || "The request failed. Please try again.",
      response.status
    );
  }

  if (result === null) {
    throw new AdminApiError(
      "The server returned an empty response.",
      response.status
    );
  }

  return result;
}

function adminRequest(endpoint, options = {}) {
  return requestFromBase(API_BASE_URL, endpoint, options);
}

function adminRequestFromAuth(endpoint, options = {}) {
  return requestFromBase(`${API_ROOT}/api/auth`, endpoint, options);
}

function adminRequestFromSettings(endpoint, options = {}) {
  return requestFromBase(`${API_ROOT}/api/settings`, endpoint, options);
}

function adminRequestFromNotifications(endpoint, options = {}) {
  return requestFromBase(
    `${API_ROOT}/api/notifications`,
    endpoint,
    options
  );
}

async function adminFileRequest(endpoint) {
  const token = getAdminToken();

  if (!token) {
    throw new AdminApiError(
      "Your admin session has expired. Please log in again.",
      401
    );
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept:
          "application/pdf, image/png, image/jpeg, image/gif, image/webp, application/octet-stream",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new AdminApiError(
        "Unable to connect to the server. Check that your backend is running and the API URL is correct."
      );
    }

    throw error;
  }

  if (response.status === 401) {
    throw new AdminApiError(
      "Your session has expired. Please log in again.",
      401
    );
  }

  if (response.status === 403) {
    throw new AdminApiError(
      "You are not authorized to view this document.",
      403
    );
  }

  if (!response.ok) {
    let message = "Unable to open the claim document.";

    try {
      const result = await response.json();
      message = result?.message || message;
    } catch {
      // Keep the default error message.
    }

    throw new AdminApiError(message, response.status);
  }

  const blob = await response.blob();

  if (!blob.size) {
    throw new AdminApiError(
      "The server returned an empty document.",
      response.status
    );
  }

  return blob;
}

export const adminApi = {
  // Dashboard
  getDashboard: () => adminRequest("/dashboard"),

  // Faculty registrations
  getRegistrations: (params = {}) =>
    adminRequest(`/registrations${buildQuery(params)}`),

  getRegistration: (id) =>
    adminRequest(`/registrations/${encodeURIComponent(id)}`),

  approveRegistration: (id) =>
    adminRequest(`/registrations/${encodeURIComponent(id)}/approve`, {
      method: "PATCH",
    }),

  rejectRegistration: (id, rejectionReason) =>
    adminRequest(`/registrations/${encodeURIComponent(id)}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason }),
    }),

  // Claims management
  getClaims: (params = {}) =>
    adminRequest(`/claims${buildQuery(params)}`),

  getClaim: (claimId) =>
    adminRequest(`/claims/${encodeURIComponent(claimId)}`),

  // Claim documents
  getClaimDocumentFile: (claimId, documentId) =>
    adminFileRequest(
      `/claims/${encodeURIComponent(claimId)}/documents/${encodeURIComponent(documentId)}/file`
    ),

  // Claim actions
  approveClaim: (claimId, remarks = "") =>
    adminRequest(`/claims/${encodeURIComponent(claimId)}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ remarks }),
    }),

  rejectClaim: (claimId, remarks) =>
    adminRequest(`/claims/${encodeURIComponent(claimId)}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ remarks }),
    }),

  returnClaimForCorrection: (claimId, remarks) =>
    adminRequest(`/claims/${encodeURIComponent(claimId)}/return`, {
      method: "PATCH",
      body: JSON.stringify({ remarks }),
    }),

  // Audit history
  getAuditHistory: (params = {}) =>
    adminRequest(`/audit${buildQuery(params)}`),

  verifyAuditChain: () => adminRequest("/audit/verify"),

  // Administrator profile
  getMyProfile: () => adminRequestFromAuth("/me"),

  // Settings
  getSettings: () => adminRequestFromSettings("/"),

  updateSettings: (notificationPreferences) =>
    adminRequestFromSettings("/", {
      method: "PATCH",
      body: JSON.stringify({ notificationPreferences }),
    }),

  changePassword: ({
    currentPassword,
    newPassword,
    confirmPassword,
  }) =>
    adminRequestFromSettings("/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    }),

  // In-app notifications
  getNotifications: (params = {}) =>
    adminRequestFromNotifications(buildQuery(params)),

  getUnreadNotificationCount: () =>
    adminRequestFromNotifications("/unread-count"),

  markNotificationAsRead: (notificationId) =>
    adminRequestFromNotifications(
      `/${encodeURIComponent(notificationId)}/read`,
      { method: "PATCH" }
    ),

  markAllNotificationsAsRead: () =>
    adminRequestFromNotifications("/read-all", {
      method: "PATCH",
    }),

  deleteNotification: (notificationId) =>
    adminRequestFromNotifications(
      `/${encodeURIComponent(notificationId)}`,
      { method: "DELETE" }
    ),
};
