import React, { useState, useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import { useTasks } from "../hooks/useTasks";
import { useNotifications } from "../contexts/NotificationsContext";
import TaskCard from "../components/TaskCard";
import TaskEditModal from "../components/TaskEditModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { CheckSquare, Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, null: 3 };

export default function Tasker() {
  const { activeTasks, completedTasks, loading, createTask, updateTask, completeTask, restoreTask, deleteTask } = useTasks();
  const { addToast } = useNotifications();
  const [editTask, setEditTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filters, setFilters] = useState({ status: "all", priority: "", tag: "", source: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "", tags: "", dueDate: "", reminder: "" });
  const [addingTask, setAddingTask] = useState(false);

  const filteredActive = useMemo(() => {
    let t = [...activeTasks];
    if (filters.priority) t = t.filter((tk) => tk.priority === filters.priority);
    if (filters.tag) t = t.filter((tk) => (tk.tags||[]).includes(filters.tag));
    if (filters.source) t = t.filter((tk) => tk.source === filters.source);
    return t.sort((a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3));
  }, [activeTasks, filters]);

  const allTags = useMemo(() => {
    const s = new Set();
    [...activeTasks, ...completedTasks].forEach((t) => (t.tags||[]).forEach((tg) => s.add(tg)));
    return [...s];
  }, [activeTasks, completedTasks]);

  const handleComplete = async (id) => {
    setCompletingId(id);
    await new Promise((r) => setTimeout(r, 300));
    try { await completeTask(id); addToast("Task completed! ✓", "success"); }
    catch { addToast("Failed to complete task", "error"); }
    finally { setCompletingId(null); }
  };

  const handleSaveEdit = async (id, updates) => {
    const firestoreUpdates = { ...updates };
    if (updates.dueDate instanceof Date) firestoreUpdates.dueDate = Timestamp.fromDate(updates.dueDate);
    if (updates.reminder instanceof Date) firestoreUpdates.reminder = Timestamp.fromDate(updates.reminder);
    if (!updates.dueDate) firestoreUpdates.dueDate = null;
    if (!updates.reminder) firestoreUpdates.reminder = null;
    try { await updateTask(id, firestoreUpdates); addToast("Task updated", "success"); }
    catch { addToast("Failed to update task", "error"); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteTask(deleteId); addToast("Task deleted", "info"); }
    catch { addToast("Failed to delete task", "error"); }
    finally { setDeleteId(null); }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setAddingTask(true);
    try {
      await createTask({
        rawInput: newTask.title, title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        priority: newTask.priority || null,
        tags: newTask.tags.split(",").map((t) => t.trim()).filter(Boolean),
        dueDate: newTask.dueDate ? Timestamp.fromDate(new Date(newTask.dueDate)) : null,
        reminder: newTask.reminder ? Timestamp.fromDate(new Date(newTask.reminder)) : null,
        source: "manual", subtasks: [], recurringSchedule: null,
      });
      setNewTask({ title: "", description: "", priority: "", tags: "", dueDate: "", reminder: "" });
      setShowAddForm(false);
      addToast("Task added", "success");
    } catch { addToast("Failed to add task", "error"); }
    finally { setAddingTask(false); }
  };

  const ic = "bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all";

  return (
    <div className="px-4 md:px-6 py-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-amber-400" />
          <h1 className="text-base font-semibold text-slate-200">Tasker</h1>
          <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">{activeTasks.length} active</span>
        </div>
        <button onClick={() => setShowAddForm((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold rounded-xl transition-colors">
          <Plus size={13}/> Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="mb-4 p-4 bg-slate-800/60 border border-amber-500/20 rounded-2xl space-y-3 animate-slide-in-up">
          <input required value={newTask.title} onChange={(e) => setNewTask((p) => ({...p,title:e.target.value}))} placeholder="Task title *" className={ic+" w-full"} />
          <textarea value={newTask.description} onChange={(e) => setNewTask((p) => ({...p,description:e.target.value}))} placeholder="Description (optional)" rows={2} className={ic+" w-full resize-none"} />
          <div className="grid grid-cols-2 gap-3">
            <select value={newTask.priority} onChange={(e) => setNewTask((p) => ({...p,priority:e.target.value}))} className={ic+" w-full"}>
              <option value="">Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <input value={newTask.tags} onChange={(e) => setNewTask((p) => ({...p,tags:e.target.value}))} placeholder="Tags (comma-separated)" className={ic+" w-full"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500 block mb-1">Due Date</label><input type="datetime-local" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({...p,dueDate:e.target.value}))} className={ic+" w-full"} /></div>
            <div><label className="text-xs text-slate-500 block mb-1">Reminder</label><input type="datetime-local" value={newTask.reminder} onChange={(e) => setNewTask((p) => ({...p,reminder:e.target.value}))} className={ic+" w-full"} /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2 border border-slate-600 text-slate-400 rounded-xl text-sm hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={addingTask} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-xl text-sm font-semibold transition-colors">{addingTask ? "Adding…" : "Add Task"}</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filters.priority} onChange={(e) => setFilters((p) => ({...p,priority:e.target.value}))} className="bg-slate-800 border border-slate-700/50 text-slate-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
          <option value="">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        {allTags.length > 0 && (
          <select value={filters.tag} onChange={(e) => setFilters((p) => ({...p,tag:e.target.value}))} className="bg-slate-800 border border-slate-700/50 text-slate-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select value={filters.source} onChange={(e) => setFilters((p) => ({...p,source:e.target.value}))} className="bg-slate-800 border border-slate-700/50 text-slate-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
          <option value="">All sources</option><option value="tasky">Tasky</option><option value="manual">Manual</option>
        </select>
        {(filters.priority||filters.tag||filters.source) && (
          <button onClick={() => setFilters({ status:'all', priority:'', tag:'', source:'' })} className="text-xs text-slate-500 hover:text-amber-400 px-2">Clear filters</button>
        )}
      </div>

      {/* Active Tasks */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-16 bg-slate-800/60 rounded-xl animate-pulse"/>)}</div>
      ) : filteredActive.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No active tasks</p>
          <p className="text-xs text-slate-600 mt-1">Use Tasky chat to add tasks conversationally</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActive.map((task) => (
            <TaskCard key={task.id} task={task} animateOut={completingId === task.id}
              onComplete={handleComplete} onEdit={setEditTask} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      {/* Completed Section */}
      {completedTasks.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setCompletedOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left px-3 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/40 rounded-xl transition-colors">
            {completedOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            <span className="text-xs font-medium text-slate-400">Completed Tasks ({completedTasks.length})</span>
          </button>
          {completedOpen && (
            <div className="mt-2 space-y-2">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onRestore={async (id) => { try { await restoreTask(id); addToast("Task restored","success"); } catch { addToast("Failed","error"); } }} onDelete={setDeleteId} />
              ))}
            </div>
          )}
        </div>
      )}

      <TaskEditModal isOpen={!!editTask} task={editTask} onClose={() => setEditTask(null)} onSave={handleSaveEdit} />
      <ConfirmDialog isOpen={!!deleteId} title="Delete Task" message="This will permanently delete this task. This cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
