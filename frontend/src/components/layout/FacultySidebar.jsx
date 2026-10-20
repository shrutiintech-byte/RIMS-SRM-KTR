import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  FileArchive,
  FileCheck2,
  FileText,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Microscope,
  Presentation,
  Settings,
  ShieldCheck,
  Stamp,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./FacultySidebar.css";

/* =========================================================
   WORKSPACE
========================================================= */

const workspaceItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "All Claims",
    icon: FileCheck2,
    path: "/claims",
  },
  {
    label: "Pending Actions",
    icon: FileText,
    path: "/pending-actions",
  },
  {
    label: "Drafts",
    icon: FileArchive,
    path: "/drafts",
  },
];

/* =========================================================
   INCENTIVE CATEGORIES
========================================================= */

const incentiveItems = [
  {
    label: "Research Project",
    icon: FlaskConical,
    path: "/incentive/research-project",
  },
  {
    label: "Patent",
    icon: Lightbulb,
    path: "/incentive/patent",
  },
  {
    label: "Journal Publication",
    icon: BookOpen,
    path: "/incentive/journal-publication",
  },
  {
    label: "Research Award",
    icon: Stamp,
    path: "/incentive/research-award",
  },
  {
    label: "Undergraduate Research",
    icon: GraduationCap,
    path: "/incentive/undergraduate-research",
  },
  {
    label: "Postgraduate Research",
    icon: Microscope,
    path: "/incentive/postgraduate-research",
  },
  {
    label: "Book / Book Chapter",
    icon: BookOpen,
    path: "/incentive/book-chapter",
  },
  {
    label: "Conference Proceedings",
    icon: Presentation,
    path: "/incentive/conference-proceedings",
  },
  {
    label: "PhD Supervision",
    icon: UsersRound,
    path: "/incentive/phd-supervision",
  },
  {
    label: "E-Content",
    icon: Presentation,
    path: "/incentive/e-content",
  },
  {
    label: "Professional Development",
    icon: BriefcaseBusiness,
    path: "/incentive/professional-development",
  },
];

/* =========================================================
   SYSTEM
========================================================= */

const systemItems = [
  {
    label: "Documents",
    icon: ShieldCheck,
    path: "/documents",
  },
  {
    label: "Reports",
    icon: BarChart3,
    path: "/reports",
  },
  {
    label: "Notifications",
    icon: Bell,
    path: "/notifications",
  },
  {
    label: "Profile",
    icon: UserRound,
    path: "/profile",
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

/* =========================================================
   SIDEBAR
========================================================= */

function FacultySidebar({
  activePath = "/dashboard",
  onNavigate,
  collapsed = false,
}) {
  const navigate = useNavigate();

  /* =======================================================
     NAVIGATION HANDLER
  ======================================================= */

  const handleNavigation = (path) => {
    navigate(path);

    if (onNavigate) {
      onNavigate(path);
    }
  };

  /* =======================================================
     RENDER NAVIGATION ITEMS
  ======================================================= */

  const renderItems = (items) =>
    items.map((item) => {
      const Icon = item.icon;

      const isActive = activePath === item.path;

      return (
        <button
          key={item.path}
          type="button"
          className={`sidebar-nav-item ${
            isActive ? "active" : ""
          }`}
          onClick={() => handleNavigation(item.path)}
          title={collapsed ? item.label : undefined}
          aria-current={isActive ? "page" : undefined}
        >
          <span className="sidebar-nav-icon">
            <Icon
              size={19}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>

          <span className="sidebar-nav-label">
            {item.label}
          </span>
        </button>
      );
    });

  /* =======================================================
     COMPONENT
  ======================================================= */

  return (
    <aside
      className={`faculty-sidebar ${
        collapsed ? "collapsed" : ""
      }`}
    >
      {/* ===================================================
          BRAND
      =================================================== */}

      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <span>R</span>
        </div>

        <div className="sidebar-brand-text">
          <strong>RIMS</strong>

          <span>
            Research Incentive Management
          </span>
        </div>
      </div>

      {/* ===================================================
          NAVIGATION
      =================================================== */}

      <div className="sidebar-content">
        <nav
          className="sidebar-navigation"
          aria-label="Faculty portal navigation"
        >
          {/* WORKSPACE */}

          <section className="sidebar-section">
            <h2 className="sidebar-section-title">
              Workspace
            </h2>

            <div className="sidebar-nav-list">
              {renderItems(workspaceItems)}
            </div>
          </section>

          {/* INCENTIVE CATEGORIES */}

          <section className="sidebar-section">
            <h2 className="sidebar-section-title">
              Incentive Categories
            </h2>

            <div className="sidebar-nav-list">
              {renderItems(incentiveItems)}
            </div>
          </section>

          {/* SYSTEM */}

          <section className="sidebar-section">
            <h2 className="sidebar-section-title">
              System
            </h2>

            <div className="sidebar-nav-list">
              {renderItems(systemItems)}
            </div>
          </section>
        </nav>
      </div>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="sidebar-footer">
        <div className="sidebar-footer-icon">
          <span>SRM</span>
        </div>

        <div className="sidebar-footer-text">
          <strong>
            SRM Institute of Science
          </strong>

          <span>
            Kattankulathur Campus
          </span>
        </div>
      </div>
    </aside>
  );
}

export default FacultySidebar;