import { useEffect, useRef, useState } from "react";
import { Bell, Search, UserCircle, Sun, Moon, Menu } from "lucide-react";
import { api, getStoredUser } from "../lib/api";

type Notice = { id: number; title: string; message: string; date: string };

type NavbarProps = {
  activePage: string;
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
};

function Navbar({ activePage, onSearch, onNavigate }: NavbarProps) {
  const user = getStoredUser();
  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  );
  const [notices, setNotices] = useState<Notice[]>([]);
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Notice[]>("/notices").then(setNotices).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => onSearch(query), 300);
    return () => window.clearTimeout(t);
  }, [query, onSearch]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("hostelTheme", next);
  };

  return (
    <header className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="hamburger-btn"
          aria-label="Open menu"
          onClick={() => document.body.classList.toggle("sidebar-open")}
        >
          <Menu size={20} />
        </button>
        <div>
          <h1>{activePage}</h1>
          <p>Welcome back, {user?.name || "Admin"} 👋</p>
        </div>
      </div>
      <div className="navbar-right">
        <div className="search-box">
          <Search size={18} />
          <input
            placeholder="Search this page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="navbar-icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <div className="navbar-actions-wrap" ref={ref}>
          <button
            type="button"
            className="navbar-icon-btn"
            aria-label="Notifications"
            onClick={() => setShow((s) => !s)}
          >
            <Bell size={20} />
            {notices.length > 0 && <span className="dot"></span>}
          </button>
          {show && (
            <div className="navbar-dropdown">
              <header>Latest Notices</header>
              <ul>
                {notices.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <strong>{n.title}</strong>
                    <span>{n.message.slice(0, 80)}{n.message.length > 80 ? "…" : ""}</span>
                  </li>
                ))}
                {notices.length === 0 && <li><span>No notices yet.</span></li>}
              </ul>
              <div style={{ padding: 10, borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: "100%" }}
                  onClick={() => { setShow(false); onNavigate("Notices"); }}
                >
                  View all notices
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="profile">
          <UserCircle size={38} />
          <div>
            <strong>{user?.name || "Admin"}</strong>
            <small>{user?.role === "Student" ? "Student" : "Administrator"}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
