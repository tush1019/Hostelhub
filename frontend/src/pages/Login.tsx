import { useState, type FormEvent } from "react";
import {
  Building2,
  Lock,
  Mail,
  LogIn,
  UserRound,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

type LoginProps = {
  onLogin: (role: "Admin" | "Student") => void;
};

function Login({ onLogin }: LoginProps) {
  const [role, setRole] =
    useState<"Admin" | "Student">("Admin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
     `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Login failed.");
        setLoading(false);
        return;
      }

      const loggedInRole = data.user.role;

      // Make sure selected role matches database role
      if (loggedInRole !== role) {
        setError(
          `This account is registered as ${loggedInRole}. Please select ${loggedInRole}.`
        );
        setLoading(false);
        return;
      }

      // Save logged-in user (id/name/email/role only — never the password)
      const safeUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: loggedInRole,
      };

      localStorage.setItem(
        "hostelUser",
        JSON.stringify(safeUser)
      );

      localStorage.setItem(
        "hostelRole",
        loggedInRole
      );

      onLogin(loggedInRole);

    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to HostelHub server. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="login-page">

      {/* ================= LEFT SIDE ================= */}

      <div className="login-left">

        <div className="login-brand">

          <div className="login-logo">
            <Building2 size={30} />
          </div>

          <div>
            <h1>HostelHub</h1>
            <span>Management System</span>
          </div>

        </div>

        <div className="login-welcome">

          <h2>
            Manage your hostel
            <br />
            smarter & easier.
          </h2>

          <p>
            A modern hostel management system for students,
            rooms, fees, complaints and mess management.
          </p>

          <div className="login-features">
            <div>✓ Student Management</div>
            <div>✓ Room & Bed Management</div>
            <div>✓ Fee & Payment Tracking</div>
            <div>✓ Complaints & Mess Management</div>
          </div>

        </div>

      </div>

      {/* ================= RIGHT SIDE ================= */}

      <div className="login-right">

        <div className="login-card">

          <div className="login-icon">
            <Lock size={22} />
          </div>

          <h2>Welcome back</h2>

          <p>
            Login to access your hostel dashboard.
          </p>

          {/* ================= ROLE ================= */}

          <div className="role-tabs">

            <button
              type="button"
              className={
                role === "Admin"
                  ? "role-active"
                  : ""
              }
              onClick={() => {
                setRole("Admin");
                setError("");
              }}
            >
              <UserRound size={17} />
              Admin
            </button>

            <button
              type="button"
              className={
                role === "Student"
                  ? "role-active"
                  : ""
              }
              onClick={() => {
                setRole("Student");
                setError("");
              }}
            >
              <UserRound size={17} />
              Student
            </button>

          </div>

          {/* ================= FORM ================= */}

          <form onSubmit={handleLogin}>

            {/* EMAIL */}

            <div className="login-field">

              <label>Email Address</label>

              <div className="input-wrapper">

                <Mail size={17} />

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="login-field">

              <label>Password</label>

              <div className="input-wrapper">

                <Lock size={17} />

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                />

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* LOGIN BUTTON */}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              <LogIn size={18} />

              {loading
                ? "Logging in..."
                : `Login as ${role}`}
            </button>

          </form>

          {/* ================= BACKEND INFO ================= */}

          <div className="demo-login">

            <strong>Secure Login</strong>

            <p>
              Your account is verified using the
              HostelHub database.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;