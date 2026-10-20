
import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  FileText,
  UserCheck,
  ShieldCheck,
  Clock3,
  RefreshCw,
} from "lucide-react";

import "./AdminNotifications.css";

const API_BASE_URL = "http://localhost:5000";

function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingIds, setProcessingIds] = useState([]);

  const token =
    localStorage.getItem("rimsAdminToken") ||
    sessionStorage.getItem("rimsAdminToken");

  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  // Safeguard: the notification state must always be an array.
  const safeNotifications = Array.isArray(notifications)
    ? notifications
    : [];

  const getId = (notification) =>
    notification?._id || notification?.id;

  const isRead = (notification) =>
    Boolean(notification?.read || notification?.isRead);

  // Extract an array from common backend response formats.
  function extractNotifications(result) {
    if (Array.isArray(result)) {
      return result;
    }

    if (!result || typeof result !== "object") {
      throw new Error(
        "The backend returned an invalid notifications response."
      );
    }

    const possibleArrays = [
      result.notifications,
      result.data,
      result.results,
      result.data?.notifications,
      result.data?.results,
      result.data?.data,
    ];

    const items = possibleArrays.find(Array.isArray);

    if (items) {
      return items;
    }

    console.error(
      "Unexpected notifications API response:",
      result
    );

    throw new Error(
      "The notifications response format is unexpected. Check the backend API."
    );
  }

  // Fetch notifications.
  async function fetchNotifications() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? "Your session may have expired. Please log in again."
            : "Could not load notifications. Check the backend endpoint."
        );
      }

      const result = await response.json();
      const items = extractNotifications(result);

      setNotifications(items);
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setNotifications([]);
      setError(
        err.message || "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark one notification as read.
  async function markAsRead(notification) {
    const id = getId(notification);

    if (!id || isRead(notification)) return;

    setError("");
    setProcessingIds((previous) =>
      previous.includes(id) ? previous : [...previous, id]
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Notification not found."
            : "Could not update notification."
        );
      }

      setNotifications((previous) =>
        (Array.isArray(previous) ? previous : []).map((item) =>
          getId(item) === id
            ? { ...item, read: true, isRead: true }
            : item
        )
      );
    } catch (err) {
      console.error("Mark notification as read error:", err);
      setError(err.message || "Unable to mark as read.");
    } finally {
      setProcessingIds((previous) =>
        previous.filter((itemId) => itemId !== id)
      );
    }
  }

  // Mark all unread notifications as read.
  async function markAllAsRead() {
    const unread = safeNotifications.filter(
      (item) => !isRead(item)
    );

    if (unread.length === 0) return;

    for (const notification of unread) {
      await markAsRead(notification);
    }
  }

  // Delete a notification.
  async function deleteNotification(notification) {
    const id = getId(notification);

    if (!id) {
      setError("This notification does not have a valid ID.");
      return;
    }

    setError("");
    setProcessingIds((previous) =>
      previous.includes(id) ? previous : [...previous, id]
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Notification not found."
            : "Could not delete notification."
        );
      }

      setNotifications((previous) =>
        (Array.isArray(previous) ? previous : []).filter(
          (item) => getId(item) !== id
        )
      );
    } catch (err) {
      console.error("Delete notification error:", err);
      setError(err.message || "Unable to delete notification.");
    } finally {
      setProcessingIds((previous) =>
        previous.filter((itemId) => itemId !== id)
      );
    }
  }

  // Choose an icon based on notification type.
  function getIcon(notification) {
    const type = String(
      notification?.type || ""
    ).toLowerCase();

    if (type.includes("claim")) {
      return <FileText size={19} />;
    }

    if (
      type.includes("user") ||
      type.includes("registration")
    ) {
      return <UserCheck size={19} />;
    }

    if (
      type.includes("audit") ||
      type.includes("security")
    ) {
      return <ShieldCheck size={19} />;
    }

    return <Bell size={19} />;
  }

  // Format the notification date.
  function getDate(notification) {
    const value =
      notification?.createdAt ||
      notification?.timestamp ||
      notification?.date;

    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString();
  }

  const unreadCount = safeNotifications.filter(
    (item) => !isRead(item)
  ).length;

  return (
    <section className="admin-notifications-page">
      {/* Page heading */}
      <div className="an-page-heading">
        <div>
          <span className="an-eyebrow">
            ADMIN WORKSPACE
          </span>

          <h1>Notifications</h1>

          <p>
            Review important updates and administrative activity.
          </p>
        </div>

        <div className="an-heading-actions">
          <button
            className="an-btn an-btn-secondary"
            onClick={fetchNotifications}
            disabled={loading}
            type="button"
          >
            <RefreshCw
              size={16}
              className={loading ? "an-spin" : ""}
            />
            Refresh
          </button>

          <button
            className="an-btn an-btn-primary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || loading}
            type="button"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>
      </div>

      {/* Unread summary */}
      <div className="an-summary-card">
        <div className="an-summary-icon">
          <Bell size={23} />
        </div>

        <div>
          <span>Unread notifications</span>
          <strong>{unreadCount}</strong>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="an-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Notification list */}
      <div className="an-list-card">
        <div className="an-list-heading">
          <div>
            <h2>Recent activity</h2>
            <p>Your latest notifications</p>
          </div>

          <span className="an-count">
            {safeNotifications.length} total
          </span>
        </div>

        {loading ? (
          <div className="an-state">
            <RefreshCw
              className="an-spin"
              size={24}
            />
            <p>Loading notifications...</p>
          </div>
        ) : safeNotifications.length === 0 ? (
          <div className="an-state">
            <div className="an-empty-icon">
              <Bell size={27} />
            </div>

            <h3>You're all caught up</h3>

            <p>
              New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="an-notification-list">
            {safeNotifications.map((notification, index) => {
              const id = getId(notification) || `notification-${index}`;
              const read = isRead(notification);
              const processing = processingIds.includes(
                getId(notification)
              );

              return (
                <article
                  className={`an-notification ${
                    read ? "is-read" : "is-unread"
                  }`}
                  key={id}
                >
                  <div className="an-notification-icon">
                    {getIcon(notification)}
                  </div>

                  <div className="an-notification-content">
                    <div className="an-notification-title-row">
                      <h3>
                        {notification?.title ||
                          notification?.subject ||
                          "Administrative update"}
                      </h3>

                      {!read && (
                        <span
                          className="an-unread-dot"
                          aria-label="Unread"
                        />
                      )}
                    </div>

                    <p>
                      {notification?.message ||
                        notification?.description ||
                        "There are no additional details for this notification."}
                    </p>

                    <span className="an-notification-date">
                      <Clock3 size={13} />
                      {getDate(notification)}
                    </span>
                  </div>

                  <div className="an-notification-actions">
                    {!read && (
                      <button
                        className="an-icon-btn"
                        title="Mark as read"
                        aria-label="Mark as read"
                        disabled={processing}
                        onClick={() =>
                          markAsRead(notification)
                        }
                        type="button"
                      >
                        <CheckCheck size={17} />
                      </button>
                    )}

                    <button
                      className="an-icon-btn an-delete-btn"
                      title="Delete notification"
                      aria-label="Delete notification"
                      disabled={processing}
                      onClick={() =>
                        deleteNotification(notification)
                      }
                      type="button"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminNotifications;
