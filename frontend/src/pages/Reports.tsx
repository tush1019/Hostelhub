import { useEffect, useState } from "react";
import { BarChart3, Users, BedDouble, CreditCard, MessageSquareWarning } from "lucide-react";
import { api } from "../lib/api";
import { formatINR } from "../lib/format";

type D = {
  students: { total: number; active: number };
  rooms: { total: number; occupied: number; available: number; maintenance: number; beds: number; bedsFilled: number; occupancyRate: number };
  fees: { paid: number; pending: number; paidCount: number; pendingCount: number };
  complaints: { total: number; pending: number; inProgress: number; resolved: number };
  monthlyFees: { month: string; amount: number }[];
};

function Reports() {
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      setD(await api<D>("/dashboard"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load reports");
    }
  };

  useEffect(() => { load(); }, []);

  if (err) {
    return (
      <section className="content">
        <div className="error-state">{err}
          <button type="button" onClick={load}>Retry</button>
        </div>
      </section>
    );
  }

  if (!d) {
    return (
      <section className="content">
        <div className="skeleton-card">
          <div className="skeleton-line" style={{ width: "40%" }} />
          <div className="skeleton-line" style={{ width: "70%" }} />
          <div className="skeleton-line" style={{ width: "55%" }} />
        </div>
      </section>
    );
  }

  const max = Math.max(1, ...d.monthlyFees.map((m) => m.amount));
  const resolution = d.complaints.total > 0
    ? Math.round((d.complaints.resolved / d.complaints.total) * 100)
    : 0;

  return (
    <section className="content">
      <div className="page-heading reports-heading">
        <div>
          <h2>Reports</h2>
          <p>Hostel performance at a glance.</p>
        </div>
        <span className="report-period">Last 6 months</span>
      </div>

      <div className="report-summary-grid">
        <div className="report-card">
          <div className="report-icon"><Users size={20} /></div>
          <div><span>Students</span><h3>{d.students.total}</h3>
          <p>{d.students.active} active</p></div>
        </div>
        <div className="report-card">
          <div className="report-icon"><BedDouble size={20} /></div>
          <div><span>Occupancy</span><h3>{d.rooms.occupancyRate}%</h3>
          <p>{d.rooms.bedsFilled}/{d.rooms.beds} beds filled</p></div>
        </div>
        <div className="report-card">
          <div className="report-icon"><CreditCard size={20} /></div>
          <div><span>Fee collection</span><h3>{formatINR(d.fees.paid)}</h3>
          <p>{formatINR(d.fees.pending)} pending</p></div>
        </div>
        <div className="report-card">
          <div className="report-icon"><MessageSquareWarning size={20} /></div>
          <div><span>Resolution rate</span><h3>{resolution}%</h3>
          <p>{d.complaints.resolved}/{d.complaints.total} resolved</p></div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-chart-card">
          <div className="report-card-header">
            <div><h3>Fee Collection Trend</h3><p>Monthly paid fees</p></div>
            <BarChart3 size={20} />
          </div>
          {d.monthlyFees.length === 0 ? (
            <div className="empty-state"><strong>No fee data</strong></div>
          ) : (
            <div className="fee-chart">
              {d.monthlyFees.map((m) => (
                <div className="chart-item" key={m.month}>
                  <span>{formatINR(m.amount)}</span>
                  <div className="chart-bar-bg">
                    <div className="chart-bar" style={{ height: `${Math.max(6, (m.amount / max) * 100)}%` }} />
                  </div>
                  <small>{m.month}</small>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="report-bottom-card">
          <div>
            <h3>Room Status</h3>
            <p>Availability breakdown</p>
            <div className="summary-list">
              <div><span>Available</span><strong>{d.rooms.available}</strong></div>
              <div><span>Occupied</span><strong>{d.rooms.occupied}</strong></div>
              <div><span>Maintenance</span><strong>{d.rooms.maintenance}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Reports;
