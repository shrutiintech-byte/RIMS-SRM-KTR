
import { useState } from "react";

import AdminLogin from "./pages/auth/AdminLogin";
import AdminRegister from "./pages/auth/AdminRegister";
import AdminDashboard from "./pages/dashboard/AdminDashboard";

function App() {
  const [activePage, setActivePage] = useState(() => {
    const token =
      localStorage.getItem("rimsAdminToken") ||
      sessionStorage.getItem("rimsAdminToken");

    return token ? "dashboard" : "login";
  });

  const handleLogout = () => {
    localStorage.removeItem("rimsAdminToken");
    localStorage.removeItem("rimsAdminUser");
    sessionStorage.removeItem("rimsAdminToken");
    sessionStorage.removeItem("rimsAdminUser");

    setActivePage("login");
  };

  if (activePage === "register") {
    return (
      <AdminRegister
        onSwitchToLogin={() => setActivePage("login")}
      />
    );
  }

  if (activePage === "dashboard") {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return (
    <AdminLogin
      onSwitchToRegister={() => setActivePage("register")}
      onLoginSuccess={() => setActivePage("dashboard")}
    />
  );
}

export default App;
