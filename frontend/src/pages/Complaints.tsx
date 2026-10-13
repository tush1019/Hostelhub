import { useEffect, useState } from "react";
import { MessageSquareWarning, Plus, Trash2, Search } from "lucide-react";
import { api, apiRaw } from "../lib/api";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";

type Complaint = {
  id: number; complaintCode: string | null; student: string;
  room: string | null; subject: string; description: string | null;
  date: string; priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Resolved";
};

function statusClass(s: string) {
  if (s === "Resolved") return "complaint-status complaint-resolved";
  if (s === "In Progress") return "complaint-status complaint-progress";
  return "complaint-status complaint-pending";
}

function prioClass(p: string) {
  if (p === "High") return "priority priority-high";
  if (p === "Low") return "priority priority-low";
  return "priority priority-medium";
}

const EMPTY = { student: "", room: "", subject: "", description: "", priority: "Medium", status: "Pending" };

function Complaints({ search, role }: { search: string; role: "Admin" | "Student" | null }) {
  const { notify } = useToast();
  const [rows, setRows] = useState<Complaint[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const load = async (query?: string) => {
    setLoading(true);
    setErr("");
    try {
      const term = query ?? search;
      const suffix = term ? `?search=${encodeURIComponent(term)}` : "";
      const data = await apiRaw<{ data: Complaint[]; summary: typeof summary }>(`/complaints${suffix}`);
      setRows(data.data || []);
      if (data.summary) setSummary(data.summary);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => load(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const save = async () => {
    if (!form.student.trim()) { notify("Student name is required", "error"); return; }
    if (!form.subject.trim()) { notify("Subject is required", "error"); return; }
    setSaving(true);
    try {
      await api("/complaints", { method: "POST", body: form });
      notify("Complaint submitted");
      setShowModal(false);
      setForm(EMPTY);
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (c: Complaint) => {
    const order: Complaint["status"][] = ["Pending", "In Progress", "Resolved"];
    const next = order[(order.indexOf(c.status) + 1) % order.length];
    try {
      await api(`/complaints/${c.id}/status`, { method: "PATCH", body: { status: next } });
      notify(`Marked as ${next}`);
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const remove = async (c: Complaint) => {
    if (!window.confirm(`Remove complaint ${c.complaintCode || `#${c.id}`}?`)) return;
    try {
      await api(`/complaints/${c.id}`, { method: "DELETE" });
      notify("Complaint removed");
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const term = q.toLowerCase();
  const filtered = term
    ? rows.filter((c) =>
        [c.student, c.complaintCode || "", c.subject, c.room || ""].join(" ").toLowerCase().includes(term))
    : rows;
  return (
    <section className="content">
      <div className="page-heading complaints-heading">
        <div>
          <h2>Complaints</h2>
          <p>Track and resolve student complaints.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowModal(true)}>
          <Plus size={17} /> New Complaint
        </button>
      </div>

      <div className="complaint-summary-grid">
        <div className="complaint-summary-card">
          <div className="summary-icon"><MessageSquareWarning size={20} /></div>
          <div><span>Total</span><h3>{summary.total}</h3><p>All complaints</p></div>
        </div>
        <div className="complaint-summary-card">
          <div className="summary-icon"><MessageSquareWarning size={20} /></div>
          <div><span>Pending</span><h3>{summary.pending}</h3><p>Need attention</p></div>
        </div>
        <div className="complaint-summary-card">
          <div className="summary-icon"><MessageSquareWarning size={20} /></div>
          <div><span>In Progress</span><h3>{summary.inProgress}</h3><p>Being handled</p></div>
        </div>
        <div className="complaint-summary-card">
          <div className="summary-icon"><MessageSquareWarning size={20} /></div>
          <div><span>Resolved</span><h3>{summary.resolved}</h3><p>Completed</p></div>
        </div>
      </div>

      <div className="complaints-table-card">
        <div className="complaints-table-header">
          <div><h3>All Complaints</h3><p>{filtered.length} record(s)</p></div>
          <div className="complaint-search">
            <Search size={16} />
            <input placeholder="Filter..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <div className="skeleton-card">
            <div className="skeleton-line" style={{ width: "60%" }} />
            <div className="skeleton-line" style={{ width: "80%" }} />
          </div>
        ) : err ? (
          <div className="error-state">{err}
            <button type="button" onClick={() => load(search)}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <MessageSquareWarning size={28} /><strong>All clear 🎉</strong>
            <p>No complaints found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Complaint</th><th>Priority</th><th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="complaint-student"><strong>{c.subject}</strong><br />
                      <small>{c.complaintCode || `#${c.id}`} • {c.student}{c.room ? ` • Room ${c.room}` : ""} • {c.date}</small>
                      {c.description && (<><br /><small>{c.description}</small></>)}
                      </div>
                    </td>
                    <td><span className={prioClass(c.priority)}>{c.priority}</span></td>
                    <td>
                      <button type="button" className={statusClass(c.status)}
                        onClick={() => role === "Admin" && cycleStatus(c)}
                        style={role === "Admin" ? { cursor: "pointer" } : undefined}>
                        {c.status}
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {role === "Admin" && (
                        <button type="button" className="action-btn" onClick={() => remove(c)} aria-label="Delete">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <Modal title="New Complaint" subtitle="Describe the issue" onClose={() => setShowModal(false)}>
          <div className="hub-form">
            <div className="hub-form-grid">
              <div className="hub-field"><label>Student name *</label>
                <input value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} placeholder="Your name" />
              </div>
              <div className="hub-field"><label>Room</label>
                <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="101" />
              </div>
            </div>
            <div className="hub-field"><label>Subject *</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Water leakage" />
            </div>
            <div className="hub-field"><label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain the problem..." />
            </div>
            <div className="hub-form-grid">
              <div className="hub-field"><label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div className="hub-field"><label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Pending</option><option>In Progress</option><option>Resolved</option>
                </select>
              </div>
            </div>
            <div className="hub-form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={save} disabled={saving}>
                {saving ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Complaints;
