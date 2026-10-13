import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

type Notice = {
  id: number; title: string; message: string;
  audience: string; date: string;
};

function Notices({ role }: { role: "Admin" | "Student" | null }) {
  const { notify } = useToast();
  const [rows, setRows] = useState<Notice[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", message: "", audience: "All" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setRows(await api<Notice[]>("/notices"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const publish = async () => {
    if (!form.title.trim()) { notify("Title is required", "error"); return; }
    if (!form.message.trim()) { notify("Message is required", "error"); return; }
    setSaving(true);
    try {
      await api("/notices", { method: "POST", body: form });
      notify("Notice published");
      setForm({ title: "", message: "", audience: "All" });
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Publish failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n: Notice) => {
    if (!window.confirm(`Remove notice "${n.title}"?`)) return;
    try {
      await api(`/notices/${n.id}`, { method: "DELETE" });
      notify("Notice removed");
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const visible = rows.filter(
    (n) => role === "Admin" || n.audience === "All" || n.audience === "Students"
  );

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <h2>Notice Board</h2>
          <p>Announcements for hostel residents.</p>
        </div>
      </div>

      {role === "Admin" && (
        <div className="notice-form-card">
          <h3>Publish a notice</h3>
          <div className="hub-form">
            <div className="hub-field"><label>Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mess timing change" />
            </div>
            <div className="hub-field"><label>Message *</label>
              <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write the announcement..." />
            </div>
            <div className="hub-form-grid">
              <div className="hub-field"><label>Audience</label>
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                  <option>All</option><option>Students</option><option>Admins</option>
                </select>
              </div>
            </div>
            <div className="hub-form-actions">
              <button type="button" className="primary-btn" onClick={publish} disabled={saving}>
                <Plus size={16} /> {saving ? "Publishing..." : "Publish Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton-card">
          <div className="skeleton-line" style={{ width: "60%" }} />
          <div className="skeleton-line" style={{ width: "80%" }} />
        </div>
      ) : err ? (
        <div className="error-state">{err}
          <button type="button" onClick={load}>Retry</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <Megaphone size={28} /><strong>No notices yet</strong>
          <p>Published announcements will appear here.</p>
        </div>
      ) : (
        visible.map((n) => (
          <div key={n.id} className="notice-card">
            <div className="notice-icon"><Megaphone size={18} /></div>
            <div style={{ flex: 1 }}>
              <h4>{n.title}</h4>
              <p>{n.message}</p>
              <span className="notice-date">{n.date} • {n.audience}</span>
            </div>
            {role === "Admin" && (
              <button type="button" className="action-btn" onClick={() => remove(n)} aria-label="Delete">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))
      )}
    </section>
  );
}

export default Notices;
