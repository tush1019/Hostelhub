import { useEffect, useState } from "react";
import {
  Users, BedDouble, CreditCard, MessageSquareWarning, Megaphone,
  ArrowUpRight, CircleAlert, Clock3, BedSingle, Wrench, BadgeCheck, TrendingUp,
} from "lucide-react";
import { api } from "../lib/api";
import { formatINR } from "../lib/format";

type D = {
  students: { total: number; active: number };
  rooms: { total: number; occupied: number; available: number; maintenance: number; beds: number; bedsFilled: number; occupancyRate: number };
  fees: { paid: number; pending: number; paidCount: number; pendingCount: number };
  complaints: { total: number; pending: number; inProgress: number; resolved: number };
  monthlyFees: { month: string; amount: number }[];
  recentComplaints: { code: string; student: string; subject: string; status: string }[];
  recentFees: { code: string; student: string; amount: number; status: string }[];
  notices: { id: number; title: string; message: string; date: string }[];
};

function Dashboard({ role }: { role: "Admin" | "Student" }) {
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState("");
  const load = async () => {
    try { setD(await api<D>("/dashboard")); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };
  useEffect(() => { load(); }, []);
  if (err) return <section className="content"><div className="error-state">{err}<button onClick={load}>Retry</button></div></section>;
  if (!d) return <section className="content"><div className="skeleton-card"><div className="skeleton-line" style={{ width: "40%" }} /><div className="skeleton-line" style={{ width: "70%" }} /><div className="skeleton-line" style={{ width: "55%" }} /></div></section>;
  const max = Math.max(1, ...d.monthlyFees.map((m) => m.amount));
  const isAdmin = role === "Admin";
  const totalCollected = d.fees.paid + d.fees.pending;
  const collectRate = totalCollected > 0 ? Math.round((d.fees.paid / totalCollected) * 100) : 0;
  const resolution = d.complaints.total > 0
    ? Math.round((d.complaints.resolved / d.complaints.total) * 100)
    : 0;
  return (
    <section className="content">
      <div className="page-heading admin-heading">
        <div>
          <span className="admin-eyebrow">{isAdmin ? "Admin Panel" : "Student Panel"}</span>
          <h2>{isAdmin ? "Admin Dashboard" : "Student Dashboard"}</h2>
          <p>{isAdmin ? "Live overview of your whole hostel." : "Live overview from your database."}</p>
        </div>
        <div className="admin-heading-badges">
          <span className="admin-pill"><BadgeCheck size={14} /> {d.students.active} active students</span>
          <span className="admin-pill warn"><Clock3 size={14} /> {d.fees.pendingCount} fees pending</span>
        </div>
      </div>
      <div className="stats-grid admin-stats">
        <div className="stat-card stat-tint-indigo">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-body"><span>Total Students</span><h3>{d.students.total}</h3><p><TrendingUp size={13} /> {d.students.active} active right now</p></div>
        </div>
        <div className="stat-card stat-tint-blue">
          <div className="stat-icon rooms"><BedDouble size={22} /></div>
          <div className="stat-body"><span>Bed Occupancy</span><h3>{d.rooms.occupancyRate}%</h3><p>{d.rooms.bedsFilled}/{d.rooms.beds} beds filled</p></div>
        </div>
        <div className="stat-card stat-tint-green">
          <div className="stat-icon fees"><CreditCard size={22} /></div>
          <div className="stat-body"><span>Fees Collected</span><h3>{formatINR(d.fees.paid)}</h3><p>{formatINR(d.fees.pending)} still pending</p></div>
        </div>
        <div className="stat-card stat-tint-orange">
          <div className="stat-icon complaints"><MessageSquareWarning size={22} /></div>
          <div className="stat-body"><span>Complaints</span><h3>{d.complaints.total}</h3><p>{d.complaints.pending} need attention</p></div>
        </div>
      </div>
      {isAdmin && (
        <div className="admin-strip">
          <div className="admin-strip-card">
            <span className="mini-icon mini-blue"><BedSingle size={17} /></span>
            <div><span>Rooms available</span><strong>{d.rooms.available} / {d.rooms.total}</strong></div>
            <ArrowUpRight size={16} className="strip-arrow" />
          </div>
          <div className="admin-strip-card">
            <span className="mini-icon mini-amber"><Wrench size={17} /></span>
            <div><span>Under maintenance</span><strong>{d.rooms.maintenance} rooms</strong></div>
            <ArrowUpRight size={16} className="strip-arrow" />
          </div>
          <div className="admin-strip-card">
            <span className="mini-icon mini-green"><BadgeCheck size={17} /></span>
            <div><span>Fee collection rate</span><strong>{collectRate}% collected</strong></div>
            <div className="mini-meter"><i style={{ width: `${collectRate}%` }} /></div>
          </div>
          <div className="admin-strip-card">
            <span className="mini-icon mini-purple"><CircleAlert size={17} /></span>
            <div><span>Complaint resolution</span><strong>{resolution}% resolved</strong></div>
            <div className="mini-meter purple"><i style={{ width: `${resolution}%` }} /></div>
          </div>
        </div>
      )}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="table-header"><div><h3>Fee Collection</h3><p>Monthly trend</p></div></div>
          {d.monthlyFees.length === 0 ? <div className="empty-state"><strong>No fee data</strong><p>Record a payment first.</p></div> : (
          <div className="fee-chart">{d.monthlyFees.map((m) => (
            <div className="chart-item" key={m.month}><span>{formatINR(m.amount)}</span>
            <div className="chart-bar-bg"><div className="chart-bar" style={{ height: `${Math.max(6, (m.amount / max) * 100)}%` }} /></div>
            <small>{m.month}</small></div>))}</div>)}
        </div>
        <div className="dashboard-card">
          <div className="table-header"><div><h3>Recent Complaints</h3><p>Latest 5</p></div></div>
          {d.recentComplaints.length === 0 ? <div className="empty-state"><strong>All clear 🎉</strong></div> : (
          <div className="table-wrapper"><table><tbody>
            {d.recentComplaints.map((c) => (<tr key={c.code}><td><strong>{c.student}</strong><br /><small>{c.subject}</small></td><td style={{ textAlign: "right" }}><span className={c.status === "Resolved" ? "complaint-status complaint-resolved" : c.status === "In Progress" ? "complaint-status complaint-progress" : "complaint-status complaint-pending"}>{c.status}</span></td></tr>))}
          </tbody></table></div>)}
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="table-header"><div><h3>Recent Payments</h3><p>Latest 5</p></div></div>
          {d.recentFees.length === 0 ? <div className="empty-state"><strong>No payments yet</strong></div> : (
          <div className="table-wrapper"><table><tbody>
            {d.recentFees.map((f) => (<tr key={f.code}><td><strong>{f.student}</strong><br /><small>{f.code}</small></td><td style={{ textAlign: "right" }}><strong>{formatINR(f.amount)}</strong><br /><small>{f.status}</small></td></tr>))}
          </tbody></table></div>)}
        </div>
        <div className="dashboard-card">
          <div className="table-header"><div><h3>Notice Board</h3><p>Latest announcements</p></div></div>
          {d.notices.length === 0 ? <div className="empty-state"><Megaphone size={26} /><strong>No notices</strong></div> :
            d.notices.slice(0, 3).map((n) => (<div key={n.id} className="notice-card" style={{ boxShadow: "none" }}><div className="notice-icon"><Megaphone size={18} /></div><div><h4>{n.title}</h4><p>{n.message}</p><span className="notice-date">{n.date}</span></div></div>))}
        </div>
      </div>
    </section>
  );
}
export default Dashboard;
