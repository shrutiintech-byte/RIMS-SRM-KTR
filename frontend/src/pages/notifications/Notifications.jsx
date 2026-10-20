import { useMemo, useState } from "react";

import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  Search,
  Trash2,
} from "lucide-react";

import "./Notifications.css";

const NOTIFICATION_TYPES = [
  "All Notifications",
  "Claim",
  "Approval",
  "Document",
  "System",
];

const NOTIFICATION_STATUSES = [
  "All",
  "Unread",
  "Read",
];

function Notifications() {
  /*
   * Keep this empty during frontend development.
   *
   * Real notification data will come from the backend
   * after the API is implemented.
   */
  const [notifications, setNotifications] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [type, setType] =
    useState("All Notifications");

  const [status, setStatus] =
    useState("All");

  const filteredNotifications = useMemo(() => {
    return notifications.filter(
      (notification) => {
        const search = searchTerm
          .trim()
          .toLowerCase();

        const title =
          notification.title || "";

        const message =
          notification.message || "";

        const notificationType =
          notification.type || "";

        const isRead =
          notification.isRead === true;

        const matchesSearch =
          !search ||
          title
            .toLowerCase()
            .includes(search) ||
          message
            .toLowerCase()
            .includes(search);

        const matchesType =
          type === "All Notifications" ||
          notificationType === type;

        const matchesStatus =
          status === "All" ||
          (status === "Unread" && !isRead) ||
          (status === "Read" && isRead);

        return (
          matchesSearch &&
          matchesType &&
          matchesStatus
        );
      }
    );
  }, [
    notifications,
    searchTerm,
    type,
    status,
  ]);

  const unreadCount =
    notifications.filter(
      (notification) =>
        notification.isRead !== true
    ).length;

  const clearFilters = () => {
    setSearchTerm("");
    setType("All Notifications");
    setStatus("All");
  };

  const handleMarkAsRead = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === id ||
        notification.id === id
          ? {
              ...notification,
              isRead: true,
            }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
      }))
    );
  };

  const handleDelete = (id) => {
    setNotifications((current) =>
      current.filter(
        (notification) =>
          notification._id !== id &&
          notification.id !== id
      )
    );
  };

  return (
    <main className="notifications-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <section className="notifications-header">

        <div className="notifications-title-row">

          <div className="notifications-title-icon">
            <Bell size={25} />
          </div>

          <div>
            <h1>Notifications</h1>

            <p>
              View updates related to your
              RIMS account, claims and
              documents.
            </p>
          </div>

        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="notifications-mark-all"
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck size={17} />
            Mark all as read
          </button>
        )}

      </section>

      {/* =========================
          SUMMARY
      ========================= */}

      <section className="notifications-summary">

        <div className="notifications-summary-card">

          <div className="notifications-summary-icon">
            <Bell size={19} />
          </div>

          <div>
            <span>Total Notifications</span>

            <strong>
              {notifications.length}
            </strong>
          </div>

        </div>

        <div className="notifications-summary-card">

          <div className="notifications-summary-icon unread">
            <Bell size={19} />
          </div>

          <div>
            <span>Unread</span>

            <strong>
              {unreadCount}
            </strong>
          </div>

        </div>

        <div className="notifications-summary-card">

          <div className="notifications-summary-icon read">
            <Check size={19} />
          </div>

          <div>
            <span>Read</span>

            <strong>
              {notifications.length -
                unreadCount}
            </strong>
          </div>

        </div>

      </section>

      {/* =========================
          FILTERS
      ========================= */}

      <section className="notifications-filter-card">

        <div className="notifications-filter-title">

          <Filter size={18} />

          <span>
            Filter Notifications
          </span>

        </div>

        <div className="notifications-filter-row">

          <div className="notifications-search">

            <Search size={17} />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search notifications..."
            />

          </div>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
          >
            {NOTIFICATION_TYPES.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
          >
            {NOTIFICATION_STATUSES.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            className="notifications-clear-button"
            onClick={clearFilters}
          >
            Clear
          </button>

        </div>

      </section>

      {/* =========================
          NOTIFICATION LIST
      ========================= */}

      <section className="notifications-list-card">

        <div className="notifications-list-header">

          <div>
            <h2>
              Your Notifications
            </h2>

            <p>
              {filteredNotifications.length}{" "}
              notification
              {filteredNotifications.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>

        </div>

        {filteredNotifications.length ===
        0 ? (
          <div className="notifications-empty">

            <div className="notifications-empty-icon">
              <Bell size={28} />
            </div>

            <h3>
              No notifications yet
            </h3>

            <p>
              You will see account, claim,
              document and system updates
              here when they become
              available.
            </p>

          </div>
        ) : (
          <div className="notifications-list">

            {filteredNotifications.map(
              (notification) => {

                const notificationId =
                  notification._id ||
                  notification.id;

                const isRead =
                  notification.isRead ===
                  true;

                return (
                  <article
                    key={notificationId}
                    className={`notification-item ${
                      isRead
                        ? "read"
                        : "unread"
                    }`}
                  >

                    <div className="notification-icon">
                      <Bell size={18} />
                    </div>

                    <div className="notification-content">

                      <div className="notification-top">

                        <h3>
                          {notification.title}
                        </h3>

                        {!isRead && (
                          <span className="notification-unread-dot" />
                        )}

                      </div>

                      <p>
                        {notification.message}
                      </p>

                      <div className="notification-meta">

                        <span>
                          {notification.type ||
                            "System"}
                        </span>

                        <span>
                          {notification.createdAt ||
                            "—"}
                        </span>

                      </div>

                    </div>

                    <div className="notification-actions">

                      {!isRead && (
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={() =>
                            handleMarkAsRead(
                              notificationId
                            )
                          }
                        >
                          <Check size={17} />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Delete notification"
                        onClick={() =>
                          handleDelete(
                            notificationId
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </section>

    </main>
  );
}

export default Notifications;