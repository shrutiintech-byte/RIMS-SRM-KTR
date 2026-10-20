import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/auth/Login";

import FacultyLayout from "./pages/faculty/FacultyLayout";
import Dashboard from "./pages/faculty/Dashboard";
import Profile from "./pages/faculty/Profile";
import Settings from "./pages/faculty/Settings";

import AllClaims from "./pages/claims/AllClaims";
import PendingActions from "./pages/claims/PendingActions";
import Drafts from "./pages/claims/Drafts";
import ClaimDetails from "./pages/claims/ClaimDetails";

import ResearchProject from "./pages/incentive/ResearchProject";
import Patent from "./pages/incentive/Patent";
import JournalPublication from "./pages/incentive/JournalPublication";
import ResearchAward from "./pages/incentive/ResearchAward";
import UndergraduateResearch from "./pages/incentive/UndergraduateResearch";
import PostgraduateResearch from "./pages/incentive/PostgraduateResearch";
import BookChapter from "./pages/incentive/BookChapter";
import ConferenceProceedings from "./pages/incentive/ConferenceProceedings";
import PhDSupervision from "./pages/incentive/PhDSupervision";
import EContent from "./pages/incentive/EContent";
import ProfessionalDevelopment from "./pages/incentive/ProfessionalDevelopment";

import Documents from "./pages/documents/Documents";
import Reports from "./pages/reports/Reports";
import Notifications from "./pages/notifications/Notifications";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            AUTHENTICATION
        ========================= */}

        <Route
          path="/"
          element={<Login />}
        />

        {/* =========================
            DASHBOARD
        ========================= */}

        <Route
          path="/dashboard"
          element={
            <FacultyLayout activePath="/dashboard">
              <Dashboard />
            </FacultyLayout>
          }
        />

        {/* =========================
            CLAIMS
        ========================= */}

        <Route
          path="/claims"
          element={
            <FacultyLayout activePath="/claims">
              <AllClaims />
            </FacultyLayout>
          }
        />

        <Route
          path="/pending-actions"
          element={
            <FacultyLayout activePath="/pending-actions">
              <PendingActions />
            </FacultyLayout>
          }
        />

        <Route
          path="/drafts"
          element={
            <FacultyLayout activePath="/drafts">
              <Drafts />
            </FacultyLayout>
          }
        />

        <Route
          path="/claims/:claimId"
          element={
            <FacultyLayout activePath="/claims">
              <ClaimDetails />
            </FacultyLayout>
          }
        />

        {/* =========================
            INCENTIVE CATEGORIES
        ========================= */}

        <Route
          path="/incentive/research-project"
          element={
            <FacultyLayout
              activePath="/incentive/research-project"
            >
              <ResearchProject />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/patent"
          element={
            <FacultyLayout
              activePath="/incentive/patent"
            >
              <Patent />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/journal-publication"
          element={
            <FacultyLayout
              activePath="/incentive/journal-publication"
            >
              <JournalPublication />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/research-award"
          element={
            <FacultyLayout
              activePath="/incentive/research-award"
            >
              <ResearchAward />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/undergraduate-research"
          element={
            <FacultyLayout
              activePath="/incentive/undergraduate-research"
            >
              <UndergraduateResearch />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/postgraduate-research"
          element={
            <FacultyLayout
              activePath="/incentive/postgraduate-research"
            >
              <PostgraduateResearch />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/book-chapter"
          element={
            <FacultyLayout
              activePath="/incentive/book-chapter"
            >
              <BookChapter />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/conference-proceedings"
          element={
            <FacultyLayout
              activePath="/incentive/conference-proceedings"
            >
              <ConferenceProceedings />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/phd-supervision"
          element={
            <FacultyLayout
              activePath="/incentive/phd-supervision"
            >
              <PhDSupervision />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/e-content"
          element={
            <FacultyLayout
              activePath="/incentive/e-content"
            >
              <EContent />
            </FacultyLayout>
          }
        />

        <Route
          path="/incentive/professional-development"
          element={
            <FacultyLayout
              activePath="/incentive/professional-development"
            >
              <ProfessionalDevelopment />
            </FacultyLayout>
          }
        />

        {/* =========================
            DOCUMENTS
        ========================= */}

        <Route
          path="/documents"
          element={
            <FacultyLayout
              activePath="/documents"
            >
              <Documents />
            </FacultyLayout>
          }
        />

        {/* =========================
            REPORTS
        ========================= */}

        <Route
          path="/reports"
          element={
            <FacultyLayout
              activePath="/reports"
            >
              <Reports />
            </FacultyLayout>
          }
        />

        {/* =========================
            NOTIFICATIONS
        ========================= */}

        <Route
          path="/notifications"
          element={
            <FacultyLayout
              activePath="/notifications"
            >
              <Notifications />
            </FacultyLayout>
          }
        />

        {/* =========================
            PROFILE
        ========================= */}

        <Route
          path="/profile"
          element={
            <FacultyLayout
              activePath="/profile"
            >
              <Profile />
            </FacultyLayout>
          }
        />

        {/* =========================
            SETTINGS
        ========================= */}

        <Route
          path="/settings"
          element={
            <FacultyLayout
              activePath="/settings"
            >
              <Settings />
            </FacultyLayout>
          }
        />

        {/* =========================
            FALLBACK
        ========================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;