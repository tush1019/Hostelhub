import {
  LayoutDashboard, Users, BedDouble, CreditCard,
  MessageSquareWarning, Utensils, BarChart3, Bell,
  Settings, LogOut, Building2,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

type SidebarProps = {
  activePage: string;
  setActivePage: (page: string) => void;
  onLogout: () => void;
  role: "Admin" | "Student" | null;
};

function Sidebar({ activePage, setActivePage, onLogout, role }: SidebarProps) {
  const allItems = [
    { name: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Student"] },
    { name: "Students", icon: Users, roles: ["Admin"] },
    { name: "Rooms", icon: BedDouble, roles: ["Admin"] },
    { name: "Fees", icon: CreditCard, roles: ["Admin", "Student"] },
    { name: "Complaints", icon: MessageSquareWarning, roles: ["Admin", "Student"] },
    { name: "Mess", icon: Utensils, roles: ["Admin", "Student"] },
    { name: "Notices", icon: Bell, roles: ["Admin", "Student"] },
    { name: "Reports", icon: BarChart3, roles: ["Admin"] },
    { name: "Settings", icon: Settings, roles: ["Admin", "Student"] },
  ];

  const menuItems = allItems.filter((i) => !role || i.roles.includes(role));

  const logout = () => {
    // End the server session (stateless: client discards local session),
    // then clear local session and return to the public home page.
    fetch(`${API_BASE_URL}/auth/logout`, { method: "POST" }).catch(() => {});
    localStorage.removeItem("hostelRole");
    localStorage.removeItem("hostelUser");
    document.body.classList.remove("sidebar-open");
    onLogout();
  };

  const go = (page: string) => {
    setActivePage(page);
    document.body.classList.remove("sidebar-open");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">
          <Building2 size={22} />
        </span>
        <div>
          <h2>HostelHub</h2>
          <span>{role === "Student" ? "Student Panel" : "Admin Panel"}</span>
        </div>
      </div>
      <nav>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              type="button"
              className={`sidebar-menu ${activePage === item.name ? "active" : ""}`}
              onClick={() => go(item.name)}
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <button type="button" className="logout-btn" onClick={logout}>
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
