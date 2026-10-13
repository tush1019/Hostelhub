import { useCallback, useState } from "react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/students";
import Rooms from "./pages/Room";
import Fees from "./pages/Fees";
import Complaints from "./pages/Complaints";
import Mess from "./pages/Mess";
import Notices from "./pages/Notices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

type Role = "Admin" | "Student" | null;
type PublicPage = "Home" | "Login" | "Signup";

function App() {
  const storedRole = localStorage.getItem("hostelRole");

  const [role, setRole] = useState<Role>(
    storedRole === "Admin" || storedRole === "Student" ? storedRole : null
  );

  const [publicPage, setPublicPage] = useState<PublicPage>("Home");
  const [activePage, setActivePage] = useState("Dashboard");
  const [globalSearch, setGlobalSearch] = useState("");

  const handleSearch = useCallback((q: string) => setGlobalSearch(q), []);

  const goPage = useCallback((page: string) => {
    setGlobalSearch("");
    setActivePage(page);
  }, []);

  const handleLogin = (loginRole: "Admin" | "Student") => {
    localStorage.setItem("hostelRole", loginRole);
    setRole(loginRole);
    setActivePage("Dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("hostelRole");
    setRole(null);
    setActivePage("Dashboard");
    setPublicPage("Home");
  };

  if (!role && publicPage === "Home") {
    return <Home onLogin={() => setPublicPage("Login")} onSignup={() => setPublicPage("Signup")} />;
  }

  if (!role && publicPage === "Login") {
    return <Login onLogin={handleLogin} />;
  }

  if (!role && publicPage === "Signup") {
    return (
      <Signup
        onSignup={() => setPublicPage("Login")}
        onLogin={() => setPublicPage("Login")}
        onBackHome={() => setPublicPage("Home")}
      />
    );
  }

  return (
    <div className="app">
      <button
        type="button"
        className="sidebar-overlay"
        aria-label="Close menu"
        onClick={() => document.body.classList.remove("sidebar-open")}
      />
      <Sidebar
        activePage={activePage}
        setActivePage={goPage}
        onLogout={handleLogout}
        role={role}
      />
      <main className="main-content">
        <Navbar activePage={activePage} onSearch={handleSearch} onNavigate={goPage} />
        {activePage === "Dashboard" && <Dashboard role={role!} />}
        {activePage === "Students" && <Students search={globalSearch} role={role} />}
        {activePage === "Rooms" && <Rooms search={globalSearch} />}
        {activePage === "Fees" && <Fees search={globalSearch} role={role} />}
        {activePage === "Complaints" && <Complaints search={globalSearch} role={role} />}
        {activePage === "Mess" && <Mess search={globalSearch} role={role} />}
        {activePage === "Notices" && <Notices role={role} />}
        {activePage === "Reports" && <Reports />}
        {activePage === "Settings" && <Settings />}
      </main>
    </div>
  );
}

export default App;
