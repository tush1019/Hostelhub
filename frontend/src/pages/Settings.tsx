import { useState } from "react";
import { Settings as SettingsIcon, Palette, Bell, ShieldCheck, Database } from "lucide-react";
import { apiRaw } from "../lib/api";
import { useToast } from "../components/Toast";

function Settings() {
  const { notify } = useToast();
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  );
  const [dbStatus, setDbStatus] = useState("");
  const [checking, setChecking] = useState(false);

  const applyTheme = (next: "light" | "dark") => {
    setTheme(next);
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("hostelTheme", next);
    notify(`${next === "dark" ? "Dark" : "Light"} theme applied`);
  };

  const checkDb = async () => {
    setChecking(true);
    setDbStatus("");
    try {
      const data = await apiRaw<{ message: string }>("/db-test");
      setDbStatus(data.message || "Connected");
      notify("Database connected", "success");
    } catch (e) {
      setDbStatus(e instanceof Error ? e.message : "Connection failed");
      notify(e instanceof Error ? e.message : "Connection failed", "error");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="content">
      <div className="page-heading settings-heading">
        <div>
          <h2>Settings</h2>
          <p>Preferences and system information.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-title">
            <Palette size={20} />
            <div><h3>Appearance</h3><p>Choose your theme</p></div>
          </div>
          <div className="theme-options">
            <button
              type="button"
              className={`theme-option ${theme === "light" ? "active-theme" : ""}`}
              onClick={() => applyTheme("light")}
            >
              <div className="theme-preview light-preview" />
              <span>Light</span>
            </button>
            <button
              type="button"
              className={`theme-option ${theme === "dark" ? "active-theme" : ""}`}
              onClick={() => applyTheme("dark")}
            >
              <div className="theme-preview dark-preview" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-title">
            <Bell size={20} />
            <div><h3>Notifications</h3><p>Stay updated</p></div>
          </div>
          <label className="setting-option">
            <input type="checkbox" defaultChecked />
            <div><strong>Notice alerts</strong><span>Show latest notices in the navbar</span></div>
          </label>
          <label className="setting-option">
            <input type="checkbox" defaultChecked />
            <div><strong>Toast messages</strong><span>Confirm every action instantly</span></div>
          </label>
        </div>

        <div className="settings-card">
          <div className="settings-card-title">
            <ShieldCheck size={20} />
            <div><h3>Account &amp; Security</h3><p>Session preferences</p></div>
          </div>
          <div className="security-row">
            <div><strong>Stay signed in</strong><span>Remember role on this device</span></div>
          </div>
          <div className="security-row">
            <div><strong>OTP verification</strong><span>Email verification on signup</span></div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              localStorage.removeItem("hostelRole");
              localStorage.removeItem("hostelUser");
              notify("Signed out on this device", "info");
              window.location.reload();
            }}
          >
            Sign out everywhere
          </button>
        </div>

        <div className="settings-card">
          <div className="settings-card-title">
            <Database size={20} />
            <div><h3>System</h3><p>Backend &amp; database</p></div>
          </div>
          <div className="security-row">
            <div><strong>API server</strong><span>http://localhost:5000</span></div>
          </div>
          {dbStatus && (
            <div className="security-row">
              <div><strong>Last check</strong><span>{dbStatus}</span></div>
            </div>
          )}
          <button type="button" className="primary-btn" onClick={checkDb} disabled={checking}>
            <SettingsIcon size={16} /> {checking ? "Checking..." : "Test Database Connection"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default Settings;
