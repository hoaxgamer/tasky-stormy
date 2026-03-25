import React, { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";

export default function MemoryCard({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.content);

  const handleSave = async () => {
    if (!draft.trim()) return;
    await onUpdate(entry.id, draft.trim());
    setEditing(false);
  };

  return (
    <div className="group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 hover:border-slate-600 transition-colors">
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full bg-slate-700/50 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/15 text-amber-400 rounded-lg text-xs hover:bg-amber-500/25 transition-colors"
            >
              <Check size={12} /> Save
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(entry.content); }}
              className="px-2.5 py-1.5 border border-slate-600 text-slate-400 rounded-lg text-xs hover:bg-slate-700 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-300 leading-relaxed pr-12">{entry.content}</p>
          <p className="text-xs text-slate-600 mt-1.5">
            {entry.createdAt?.toDate ? format(entry.createdAt.toDate(), "MMM d, yyyy") : ""}
          </p>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
