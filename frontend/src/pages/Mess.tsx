import { useEffect, useState } from "react";
import { Utensils, Pencil, Search } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";

type MenuDay = {
  id: number; day: string; breakfast: string | null;
  lunch: string | null; dinner: string | null;
  status: "Published" | "Pending";
};

function Mess({ search, role }: { search: string; role: "Admin" | "Student" | null }) {
  const { notify } = useToast();
  const [rows, setRows] = useState<MenuDay[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuDay | null>(null);
  const [form, setForm] = useState({ breakfast: "", lunch: "", dinner: "", status: "Published" });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setRows(await api<MenuDay[]>("/mess"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load mess menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (d: MenuDay) => {
    setEditing(d);
    setForm({
      breakfast: d.breakfast || "", lunch: d.lunch || "",
      dinner: d.dinner || "", status: d.status,
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/mess/${editing.day}`, { method: "PUT", body: form });
      notify(`${editing.day} menu updated`);
      setEditing(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (d: MenuDay) => {
    const next = d.status === "Published" ? "Pending" : "Published";
    try {
      await api(`/mess/${d.day}/status`, { method: "PATCH", body: { status: next } });
      notify(`${d.day} marked as ${next}`);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const combined = (search + " " + q).toLowerCase().trim();
  const filtered = combined
    ? rows.filter((d) =>
        [d.day, d.breakfast || "", d.lunch || "", d.dinner || ""].join(" ").toLowerCase().includes(combined))
    : rows;
  const published = rows.filter((d) => d.status === "Published").length;
  return (
    <section className="content">
      <div className="page-heading mess-heading">
        <div>
          <h2>Mess Menu</h2>
          <p>Weekly meal schedule for the hostel mess.</p>
        </div>
      </div>

      <div className="mess-summary-grid">
        <div className="mess-summary-card">
          <div className="summary-icon"><Utensils size={20} /></div>
          <div><span>Total days</span><h3>{rows.length}</h3><p>Weekly plan</p></div>
        </div>
        <div className="mess-summary-card">
          <div className="summary-icon"><Utensils size={20} /></div>
          <div><span>Published</span><h3>{published}</h3><p>Visible to students</p></div>
        </div>
        <div className="mess-summary-card">
          <div className="summary-icon"><Utensils size={20} /></div>
          <div><span>Pending</span><h3>{rows.length - published}</h3><p>Draft menus</p></div>
        </div>
      </div>

      <div className="mess-table-card">
        <div className="mess-table-header">
          <div><h3>Weekly Menu</h3><p>{filtered.length} day(s)</p></div>
          <div className="mess-search">
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
            <button type="button" onClick={load}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Utensils size={28} /><strong>No menu found</strong>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th><th>Status</th>
                {role === "Admin" && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.day}>
                    <td><div className="mess-day"><strong>{d.day}</strong></div></td>
                    <td>{d.breakfast || "—"}</td>
                    <td>{d.lunch || "—"}</td>
                    <td>{d.dinner || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={`mess-status ${d.status === "Published" ? "mess-published" : "mess-pending"}`}
                        onClick={() => role === "Admin" && toggleStatus(d)}
                        style={role === "Admin" ? { cursor: "pointer" } : undefined}
                      >
                        {d.status}
                      </button>
                    </td>
                    {role === "Admin" && (
                      <td style={{ textAlign: "right" }}>
                        <button type="button" className="action-btn" onClick={() => openEdit(d)} aria-label="Edit">
                          <Pencil size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={`Edit ${editing.day} Menu`} subtitle="Update meals for the day" onClose={() => setEditing(null)}>
          <div className="hub-form">
            <div className="hub-field"><label>Breakfast</label>
              <input value={form.breakfast} onChange={(e) => setForm({ ...form, breakfast: e.target.value })} placeholder="e.g. Poha & Tea" />
            </div>
            <div className="hub-field"><label>Lunch</label>
              <input value={form.lunch} onChange={(e) => setForm({ ...form, lunch: e.target.value })} placeholder="e.g. Dal, Rice, Roti" />
            </div>
            <div className="hub-field"><label>Dinner</label>
              <input value={form.dinner} onChange={(e) => setForm({ ...form, dinner: e.target.value })} placeholder="e.g. Paneer & Roti" />
            </div>
            <div className="hub-field"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Published</option><option>Pending</option>
              </select>
            </div>
            <div className="hub-form-actions">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save Menu"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Mess;
