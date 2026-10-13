import { useEffect, useState } from "react";
import {
  Building2,
  LogIn,
  UserPlus,
  BedDouble,
  Users,
  CreditCard,
  MessageSquareWarning,
  ArrowRight,
  ShieldCheck,
  Utensils,
  Sparkles,
  Star,
  Zap,
  BedSingle,
  BadgeCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { formatINR } from "../lib/format";

type HomeProps = {
  onLogin: () => void;
  onSignup: () => void;
};

type LiveStats = {
  students: { total: number; active: number };
  rooms: { total: number; available: number; beds: number; bedsFilled: number; occupancyRate: number };
  fees: { paid: number; pending: number };
  complaints: { total: number; resolved: number };
};

function Home({ onLogin, onSignup }: HomeProps) {
  const [live, setLive] = useState<LiveStats | null>(null);

  useEffect(() => {
    api<LiveStats>("/dashboard").then(setLive).catch(() => {});
  }, []);

  const resolution = live && live.complaints.total > 0
    ? Math.round((live.complaints.resolved / live.complaints.total) * 100)
    : 0;

  return (
    <div className="public-home extreme-home">

      {/* NAVBAR */}
      <header className="public-navbar extreme-nav">
        <div className="public-brand">
          <div className="public-brand-icon extreme-brand-icon">
            <Building2 size={25} />
          </div>

          <div>
            <h2>HostelHub</h2>
            <span>Management System</span>
          </div>
        </div>

        <nav className="public-nav">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>

        <div className="public-nav-actions">
          <button
            className="public-login-btn"
            onClick={onLogin}
          >
            <LogIn size={17} />
            Login
          </button>

          <button
            className="public-signup-btn extreme-cta"
            onClick={onSignup}
          >
            <UserPlus size={17} />
            Sign Up
          </button>
        </div>
      </header>

      {/* HERO */}
      <main id="home">

        <section className="public-hero extreme-hero">
          <div className="extreme-orb orb-1" />
          <div className="extreme-orb orb-2" />
          <div className="extreme-orb orb-3" />
          <div className="hero-content">

            <div className="hero-badge extreme-badge">
              <Sparkles size={15} />
              Smart Hostel Management
              <span className="extreme-badge-dot" />
              v2.0 Live
            </div>

            <h1>
              Manage Your Hostel
              <span className="extreme-gradient-text"> Smarter & Easier.</span>
            </h1>

            <p>
              A modern hostel management system designed to simplify
              student records, rooms, fees, complaints and mess
              management — all in one place.
            </p>

            <div className="hero-buttons">
              <button
                className="hero-primary-btn extreme-primary"
                onClick={onLogin}
              >
                Get Started
                <ArrowRight size={18} />
              </button>

              <button
                className="hero-secondary-btn extreme-secondary"
                onClick={onSignup}
              >
                Create Account
                <UserPlus size={18} />
              </button>
            </div>

            <div className="hero-trust extreme-trust">
              <span className="extreme-trust-item"><ShieldCheck size={17} /> Simple</span>
              <span className="extreme-trust-sep">•</span>
              <span className="extreme-trust-item"><Zap size={16} /> Secure</span>
              <span className="extreme-trust-sep">•</span>
              <span className="extreme-trust-item"><Star size={16} /> Efficient</span>
            </div>

            {live && (
              <div className="extreme-live-strip">
                <div className="extreme-live-item">
                  <Users size={17} />
                  <div><strong>{live.students.total}</strong><span>Students</span></div>
                </div>
                <div className="extreme-live-item">
                  <BedSingle size={17} />
                  <div><strong>{live.rooms.occupancyRate}%</strong><span>Occupancy</span></div>
                </div>
                <div className="extreme-live-item">
                  <CreditCard size={17} />
                  <div><strong>{formatINR(live.fees.paid)}</strong><span>Collected</span></div>
                </div>
                <div className="extreme-live-item">
                  <BadgeCheck size={17} />
                  <div><strong>{resolution}%</strong><span>Resolved</span></div>
                </div>
              </div>
            )}

          </div>

          {/* DASHBOARD PREVIEW */}
          <div className="hero-dashboard extreme-preview">
            <div className="extreme-preview-glow" />

            <div className="preview-topbar">
              <div className="preview-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="preview-title">
                Hostel Dashboard
              </div>

              <div className="preview-user extreme-preview-user">
                <span className="extreme-live-dot" /> Admin
              </div>
            </div>

            <div className="preview-body">

              <div className="preview-sidebar">
                <div className="preview-logo">
                  <Building2 size={17} />
                </div>

                <div className="preview-menu active">Dashboard</div>

                <div className="preview-menu">Students</div>

                <div className="preview-menu">Rooms</div>

                <div className="preview-menu">Fees</div>

                <div className="preview-menu">Complaints</div>
              </div>

              <div className="preview-content">

                <div className="preview-heading">
                  <div>
                    <h3>Dashboard</h3>
                    <p>Welcome back, Admin 👋</p>
                  </div>
                </div>

                <div className="preview-stats">

                  <div className="preview-stat">
                    <div className="preview-stat-icon">
                      <Users size={16} />
                    </div>
                    <div>
                      <small>Total Students</small>
                      <strong>{live ? live.students.total : "\u2014"}</strong>
                    </div>
                  </div>

                  <div className="preview-stat">
                    <div className="preview-stat-icon">
                      <BedDouble size={16} />
                    </div>
                    <div>
                      <small>Bed Occupancy</small>
                      <strong>{live ? `${live.rooms.occupancyRate}%` : "\u2014"}</strong>
                    </div>
                  </div>

                  <div className="preview-stat">
                    <div className="preview-stat-icon">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <small>Fee Collection</small>
                      <strong>₹20.4L</strong>
                    </div>
                  </div>

                </div>

                <div className="preview-lower">

                  <div className="preview-chart">
                    <div className="preview-card-title">
                      <strong>Fee Collection</strong>
                      <span className="extreme-chart-badge"><span className="extreme-live-dot" /> Live</span>
                    </div>

                    <div className="fake-chart">
                      <div style={{ height: "35%" }}></div>
                      <div style={{ height: "48%" }}></div>
                      <div style={{ height: "42%" }}></div>
                      <div style={{ height: "65%" }}></div>
                      <div style={{ height: "58%" }}></div>
                      <div style={{ height: "80%" }}></div>
                    </div>
                  </div>

                  <div className="preview-occupancy">
                    <div className="preview-card-title">
                      <strong>Occupancy</strong>
                    </div>

                    <div className="preview-circle">
                      <strong>{live ? `${live.rooms.occupancyRate}%` : "\u2014"}</strong>
                    </div>

                    <small>{live ? `${live.rooms.bedsFilled} of ${live.rooms.beds} beds filled` : "Live occupancy"}</small>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="public-stats extreme-stats">

          <div>
            <strong>{live ? `${live.students.total}+` : "\u2014"}</strong>
            <span>Students</span>
          </div>

          <div>
            <strong>{live ? live.rooms.total : "\u2014"}</strong>
            <span>Rooms</span>
          </div>

          <div>
            <strong>{live ? `${resolution}%` : "\u2014"}</strong>
            <span>Complaints Resolved</span>
          </div>

          <div>
            <strong>{live ? formatINR(live.fees.paid) : "\u2014"}</strong>
            <span>Fees Collected</span>
          </div>

        </section>

        {/* FEATURES */}
        <section className="public-features extreme-features" id="features">
          <div className="public-section-heading">

            <span>POWERFUL FEATURES</span>

            <h2>
              Everything You Need
              <br />
              <span>To Manage Your Hostel</span>
            </h2>

            <p>
              Manage your complete hostel operations from one
              simple and modern dashboard.
            </p>

          </div>

          <div className="feature-grid">

            <div className="feature-card extreme-fc-1">
              <div className="feature-icon">
                <Users size={23} />
              </div>

              <h3>Student Management</h3>

              <p>
                Easily manage student registrations,
                profiles and room information.
              </p>
            </div>

            <div className="feature-card extreme-fc-2">
              <div className="feature-icon">
                <BedDouble size={23} />
              </div>

              <h3>Room Management</h3>

              <p>
                Track rooms, beds, occupancy and
                availability in real time.
              </p>
            </div>

            <div className="feature-card extreme-fc-3">
              <div className="feature-icon">
                <CreditCard size={23} />
              </div>

              <h3>Fees & Payments</h3>

              <p>
                Keep track of hostel fees, payments
                and pending amounts.
              </p>
            </div>

            <div className="feature-card extreme-fc-4">
              <div className="feature-icon">
                <MessageSquareWarning size={23} />
              </div>

              <h3>Complaints</h3>

              <p>
                Manage complaints and track their
                resolution status easily.
              </p>
            </div>

            <div className="feature-card extreme-fc-5">
              <div className="feature-icon">
                <Utensils size={23} />
              </div>

              <h3>Mess Management</h3>

              <p>
                Organize weekly menus and daily
                hostel meal schedules.
              </p>
            </div>

            <div className="feature-card extreme-fc-6">
              <div className="feature-icon">
                <Building2 size={23} />
              </div>

              <h3>Reports & Analytics</h3>

              <p>
                View hostel performance through
                simple reports and analytics.
              </p>
            </div>

          </div>
        </section>

        {/* ABOUT */}
        <section
          className="public-about"
          id="about"
        >
          <div className="about-card">

            <div className="about-icon">
              <Building2 size={35} />
            </div>

            <div>
              <span>ABOUT HOSTELHUB</span>

              <h2>
                A Better Way To Manage
                <br />
                Your Hostel
              </h2>

              <p>
                HostelHub brings essential hostel management
                activities together into one clean and easy-to-use
                platform. From student registration to rooms,
                payments, complaints and mess schedules,
                everything can be managed from a single dashboard.
              </p>

              <button
                className="about-btn"
                onClick={onLogin}
              >
                Explore Dashboard
                <ArrowRight size={17} />
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="public-footer">

        <div className="footer-brand">
          <div className="public-brand-icon">
            <Building2 size={22} />
          </div>

          <div>
            <strong>HostelHub</strong>
            <span>Management System</span>
          </div>
        </div>

        <p>
          © 2026 HostelHub. All rights reserved.
        </p>

        <div className="footer-links">
          <button onClick={onLogin}>Login</button>
          <button onClick={onSignup}>Sign Up</button>
        </div>

      </footer>

    </div>
  );
}

export default Home;