import { useEffect, useState } from "react";
import { Users, Plus, Pencil, Trash2, Search } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";

type Student = {
  id: number; studentCode: string | null; name: string;
  email: string | null; phone: string | null; course: string | null;
  room: string | null; status: "Active" | "Pending" | "Inactive";
};

const EMPTY = { name: "", email: "", phone: "", course: "", room: "", status: "Active" };

function Students({ search, role }: { search: string; role: "Admin" | "Student" | null }) {
  const { notify } = useToast();
  const [rows, setRows] = useState<Student[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const load = async (query?: string) => {
    setLoading(true);
    setErr("");
    try {
      const term = query ?? search;
      const suffix = term ? `?search=${encodeURIComponent(term)}` : "";
      setRows(await api<Student[]>(`/students${suffix}`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => load(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      name: s.name, email: s.email || "", phone: s.phone || "",
      course: s.course || "", room: s.room || "", status: s.status,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { notify("Student name is required", "error"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api(`/students/${editing.id}`, { method: "PUT", body: form });
        notify("Student updated");
      } else {
        await api("/students", { method: "POST", body: form });
        notify("Student added");
      }
      setShowModal(false);
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Student) => {
    if (!window.confirm(`Remove ${s.name}?`)) return;
    try {
      await api(`/students/${s.id}`, { method: "DELETE" });
      notify("Student removed");
      load(search);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const term = q.toLowerCase();
  const filtered = term
    ? rows.filter((s) =>
        [s.name, s.studentCode || "", s.room || "", s.course || ""]
          .join(" ").toLowerCase().includes(term))
    : rows;
  const active = rows.filter((s) => s.status === "Active").length;
  return (
    <section className="content">
      <div className="page-heading students-heading">
        <div>
          <h2>Students</h2>
          <p>Manage student records and room allocation.</p>
        </div>
        {role === "Admin" && (
          <button type="button" className="primary-btn" onClick={openAdd}>
            <Plus size={17} /> Add Student
          </button>
        )}
      </div>

      <div className="students-top">
        <div className="student-summary">
          <div className="summary-icon"><Users size={20} /></div>
          <div><span>Total students</span><h3>{rows.length}</h3></div>
        </div>
        <div className="student-summary">
          <div className="summary-icon"><Users size={20} /></div>
          <div><span>Active</span><h3>{active}</h3></div>
        </div>
        <div className="student-search">
          <Search size={16} />
          <input placeholder="Filter loaded records..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="students-table-card">
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
            <Users size={28} />
            <strong>No students found</strong>
            <p>Add your first student to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th><th>Course</th><th>Room</th><th>Status</th>
                  {role === "Admin" && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="student-name">
                        <div className="student-avatar">{s.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>{s.name}</strong><br />
                          <small>{s.studentCode || `#${s.id}`}{s.email ? ` • ${s.email}` : ""}</small>
                        </div>
                      </div>
                    </td>
                    <td>{s.course || "—"}</td>
                    <td>{s.room || "—"}</td>
                    <td>
                      <span className={`status ${s.status === "Active" ? "status-active" : "status-pending"}`}>
                        {s.status}
                      </span>
                    </td>
                    {role === "Admin" && (
                      <td style={{ textAlign: "right" }}>
                        <button type="button" className="action-btn" onClick={() => openEdit(s)} aria-label="Edit">
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="action-btn" onClick={() => remove(s)} aria-label="Delete">
                          <Trash2 size={16} />
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

      {showModal && (
        <Modal
          title={editing ? "Edit Student" : "Add Student"}
          subtitle={editing ? `Updating ${editing.name}` : "Register a new hostel resident"}
          onClose={() => setShowModal(false)}
        >
          <div className="hub-form">
            <div className="hub-form-grid">
              <div className="hub-field"><label>Full name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" />
              </div>
              <div className="hub-field"><label>Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@mail.com" />
              </div>
              <div className="hub-field"><label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
              </div>
              <div className="hub-field"><label>Course</label>
                <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="B.Tech CSE" />
              </div>
              <div className="hub-field"><label>Room</label>
                <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="101" />
              </div>
              <div className="hub-field"><label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option><option>Pending</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="hub-form-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={save} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Student"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default Students;
