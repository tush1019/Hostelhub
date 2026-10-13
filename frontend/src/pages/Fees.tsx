import { useEffect, useState } from "react";
import { CreditCard, Plus, Trash2, Search, Receipt } from "lucide-react";
import { api, apiRaw } from "../lib/api";
import { formatINR, formatINRFull, todayISO } from "../lib/format";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";

type Fee = {
  id: number; paymentCode: string | null; student: string;
  room: string | null; amount: number | string; date: string;
  rawDate?: string; method: string; status: "Paid" | "Pending";
};

type FeeSummary = {
  total: number; paidAmount: number | string; pendingAmount: number | string;
  paidCount: number; pendingCount: number;
};

const EMPTY = { student: "", room: "", amount: "", date: todayISO(), method: "UPI", status: "Paid" };

function Fees({ search, role }: { search: string; role: "Admin" | "Student" | null }) {
  const { notify } = useToast();
  const [rows, setRows] = useState<Fee[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [receipt, setReceipt] = useState<Fee | null>(null);

  const load = async (query?: string) => {
    setLoading(true);
    setErr("");
    try {
      const term = query ?? search;
      const suffix = term ? `?search=${encodeURIComponent(term)}` : "";
      const data = await apiRaw<{ data: Fee[]; summary: FeeSummary }>(`/fees${suffix}`);
      setRows(data.data || []);
      setSummary(data.summary || null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load fees");
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
    if (!Number(form.amount) || Number(form.amount) <= 0) { notify("Enter a valid amount", "error"); return; }
    setSaving(true);
    try {
      await api("/fees", { method: "POST", body: form });
      notify("Payment recorded");
      setShowModal(false);
      setForm({ ...EMPTY, date: todayISO() });
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (f: Fee) => {
    const next = f.status === "Paid" ? "Pending" : "Paid";
    try {
      await api(`/fees/${f.id}/status`, { method: "PATCH", body: { status: next } });
      notify(`Marked as ${next}`);
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const remove = async (f: Fee) => {
    if (!window.confirm(`Remove payment ${f.paymentCode || `#${f.id}`}?`)) return;
    try {
      await api(`/fees/${f.id}`, { method: "DELETE" });
      notify("Payment record removed");
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const term = q.toLowerCase();
  const filtered = term
    ? rows.filter((f) =>
        [f.student, f.paymentCode || "", f.room || ""].join(" ").toLowerCase().includes(term))
    : rows;
  return (
    <section className="content">
      <div className="page-heading fees-heading">
        <div>
          <h2>Fees &amp; Payments</h2>
          <p>Track hostel fee collection and pending dues.</p>
        </div>
        {role === "Admin" && (
          <button type="button" className="primary-btn" onClick={() => setShowModal(true)}>
            <Plus size={17} /> Record Payment
          </button>
        )}
      </div>

      <div className="fee-summary-grid">
        <div className="fee-summary-card">
          <div className="summary-icon"><CreditCard size={20} /></div>
          <div><span>Collected</span><h3>{formatINR(summary?.paidAmount ?? 0)}</h3>
          <p>{summary?.paidCount ?? 0} payment(s)</p></div>
        </div>
        <div className="fee-summary-card">
          <div className="summary-icon"><CreditCard size={20} /></div>
          <div><span>Pending</span><h3>{formatINR(summary?.pendingAmount ?? 0)}</h3>
          <p>{summary?.pendingCount ?? 0} due(s)</p></div>
        </div>
        <div className="fee-summary-card">
          <div className="summary-icon"><CreditCard size={20} /></div>
          <div><span>Total records</span><h3>{summary?.total ?? rows.length}</h3>
          <p>All time</p></div>
        </div>
      </div>

      <div className="fees-table-card">
        <div className="fees-table-header">
          <div><h3>Payment Records</h3><p>{filtered.length} record(s)</p></div>
          <div className="fee-search">
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
            <CreditCard size={28} /><strong>No payments found</strong>
            <p>Record your first payment to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Student</th><th>Amount</th><th>Date</th><th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div className="fee-student"><strong>{f.student}</strong><br />
                      <small>{f.paymentCode || `#${f.id}`} • {f.room || "—"} • {f.method}</small></div>
                    </td>
                    <td><strong>{formatINRFull(f.amount)}</strong></td>
                    <td>{f.date}</td>
                    <td>
                      <button
                        type="button"
                        className={`fee-status ${f.status === "Paid" ? "fee-paid" : "fee-pending"}`}
                        onClick={() => role === "Admin" && toggleStatus(f)}
                        title={role === "Admin" ? "Click to toggle status" : undefined}
                        style={role === "Admin" ? { cursor: "pointer" } : undefined}
                      >
                        {f.status}
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="action-btn" onClick={() => setReceipt(f)} aria-label="Receipt">
                        <Receipt size={16} />
                      </button>
                      {role === "Admin" && (
                        <button type="button" className="action-btn" onClick={() => remove(f)} aria-label="Delete">
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
        <Modal title="Record Payment" subtitle="Add a new fee payment" onClose={() => setShowModal(false)}>
          <div className="hub-form">
            <div className="hub-form-grid">
              <div className="hub-field"><label>Student name *</label>
                <input value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} placeholder="e.g. Rahul Sharma" />
              </div>
              <div className="hub-field"><label>Room</label>
                <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="101" />
              </div>
              <div className="hub-field"><label>Amount (₹) *</label>
                <input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" />
              </div>
              <div className="hub-field"><label>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="hub-field"><label>Method</label>
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option>UPI</option><option>Cash</option><option>Card</option><option>Bank Transfer</option>
                </select>
              </div>
              <div className="hub-field"><label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Paid</option><option>Pending</option>
                </select>
              </div>
            </div>
            <div className="hub-form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {receipt && (
        <Modal title={`Receipt ${receipt.paymentCode || `#${receipt.id}`}`} subtitle={receipt.date} onClose={() => setReceipt(null)}>
          <div className="summary-list">
            <div><span>Student</span><strong>{receipt.student}</strong></div>
            <div><span>Room</span><strong>{receipt.room || "—"}</strong></div>
            <div><span>Method</span><strong>{receipt.method}</strong></div>
            <div><span>Status</span><strong>{receipt.status}</strong></div>
            <div><span>Amount</span><strong>{formatINRFull(receipt.amount)}</strong></div>
          </div>
          <div className="hub-form-actions">
            <button type="button" className="btn-ghost" onClick={() => window.print()}>Print</button>
            <button type="button" className="primary-btn" onClick={() => setReceipt(null)}>Close</button>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Fees;
