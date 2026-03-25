import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

function toInputDatetime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return "";
  try { return format(d, "yyyy-MM-dd'T'HH:mm"); } catch { return ""; }
}

export default function TaskEditModal({ task, isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    title: "", description: "", dueDate: "", priority: "",
    tags: "", recurringSchedule: "", reminder: "", subtasks: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task)
      setForm({
        title: task.title || "",
        description: task.description || "",
        dueDate: toInputDatetime(task.dueDate),
        priority: task.priority || "",
        tags: (task.tags || []).join(", "),
        recurringSchedule: task.recurringSchedule || "",
        reminder: toInputDatetime(task.reminder),
        subtasks: task.subtasks || [],
      });
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave(task.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
        priority: form.priority || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        recurringSchedule: form.recurringSchedule.trim() || null,
        reminder: form.reminder ? new Date(form.reminder) : null,
        subtasks: form.subtasks.filter((s) => s.title.trim()),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const ic = "w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all";
  const lc = "block text-xs font-medium text-slate-400 mb-1.5";

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto animate-bounce-in">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-semibold text-slate-100">Edit Task</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lc}>Title *</label>
            <input required type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={ic} />
          </div>
          <div>
            <label className={lc}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={ic + " resize-none"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Due Date</label>
              <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={ic} />
            </div>
            <div>
              <label className={lc}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={ic}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lc}>Tags (comma-separated)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className={ic} placeholder="work, personal, urgent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Recurring</label>
              <input type="text" value={form.recurringSchedule} onChange={(e) => setForm((f) => ({ ...f, recurringSchedule: e.target.value }))} className={ic} placeholder="every Monday" />
            </div>
            <div>
              <label className={lc}>Reminder</label>
              <input type="datetime-local" value={form.reminder} onChange={(e) => setForm((f) => ({ ...f, reminder: e.target.value }))} className={ic} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lc}>Subtasks</label>
              <button type="button" onClick={() => setForm((f) => ({ ...f, subtasks: [...f.subtasks, { id: Date.now().toString(), title: "", completed: false }] }))} className="flex items-center gap-1 text-xs text-amber-400 hover:underline">
                <Plus size={11} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {form.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2">
                  <input type="text" value={st.title} onChange={(e) => setForm((f) => ({ ...f, subtasks: f.subtasks.map((s) => s.id === st.id ? { ...s, title: e.target.value } : s) }))} placeholder="Subtask" className={ic + " flex-1"} />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, subtasks: f.subtasks.filter((s) => s.id !== st.id) }))} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-semibold transition-colors">{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
