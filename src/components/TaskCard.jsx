import React, { useState } from "react";
import { format } from "date-fns";
import { Check, Pencil, Trash2, Undo2, ChevronDown, ChevronUp } from "lucide-react";

const PRIORITY_STYLES = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-slate-700 text-slate-400 border-slate-600",
};

export default function TaskCard({ task, onComplete, onRestore, onEdit, onDelete }) {
  const [descOpen, setDescOpen] = useState(false);
  const isCompleted = task.status === "completed";
  const isOverdue = !isCompleted && task.dueDate?.toDate && task.dueDate.toDate() < new Date();

  return (
    <div className={`group relative bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 transition-all hover:border-slate-600 animate-fade-in ${ isCompleted ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => isCompleted ? onRestore?.(task.id) : onComplete?.(task.id)}
          className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
            isCompleted ? "bg-green-500/20 border-green-500" : "border-slate-600 hover:border-amber-500/60 hover:bg-amber-500/10"
          }`}
          aria-label={isCompleted ? "Restore task" : "Complete task"}
        >
          {isCompleted && <Check size={10} className="text-green-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${ isCompleted ? "text-slate-500 line-through" : "text-slate-200"}`}>
            {task.title}
          </p>
          {task.description && (
            <button
              onClick={() => setDescOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 mt-1 transition-colors"
            >
              {descOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {descOpen ? "Hide" : "Show"} details
            </button>
          )}
          {descOpen && task.description && (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed animate-slide-in-up">{task.description}</p>
          )}
          {(task.subtasks || []).filter((s) => s.title).length > 0 && (
            <div className="mt-2 space-y-1">
              {task.subtasks.filter((s) => s.title).map((st, i) => (
                <div key={st.id || i} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className={`w-2.5 h-2.5 rounded border ${ st.completed ? "bg-green-500/30 border-green-500/50" : "border-slate-600"}`} />
                  {st.title}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-slate-600">
              {task.createdAt?.toDate ? format(task.createdAt.toDate(), "MMM d") : ""}
            </span>
            {task.dueDate?.toDate && (
              <span className={`text-xs ${ isOverdue ? "text-red-400 font-medium" : "text-slate-500"}`}>
                · Due {format(task.dueDate.toDate(), "MMM d, h:mm a")}
                {isOverdue ? " (overdue)" : ""}
              </span>
            )}
            {isCompleted && task.completedAt?.toDate && (
              <span className="text-xs text-green-500/70">
                · Done {format(task.completedAt.toDate(), "MMM d")}
              </span>
            )}
            {task.priority && (
              <span className={`px-1.5 py-0.5 text-xs rounded border font-medium ${ PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low}`}>
                {task.priority}
              </span>
            )}
            {(task.tags || []).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-xs bg-slate-700/60 text-slate-400 rounded border border-slate-700">
                {tag}
              </span>
            ))}
            {task.recurringSchedule && (
              <span className="text-xs text-blue-400/70">↻ {task.recurringSchedule}</span>
            )}
            {!task.aiProcessed && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-500/10 text-amber-500/70 rounded border border-amber-500/20">raw</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {isCompleted ? (
            <button
              onClick={() => onRestore?.(task.id)}
              className="p-1.5 text-slate-500 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
              title="Restore"
            >
              <Undo2 size={13} />
            </button>
          ) : (
            <button
              onClick={() => onEdit?.(task)}
              className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            onClick={() => onDelete?.(task.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
