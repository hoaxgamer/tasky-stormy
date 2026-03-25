import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useStormSessions } from "../hooks/useStormSessions";
import { useNotifications } from "../contexts/NotificationsContext";
import StormCard from "../components/StormCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { format } from "date-fns";
import { Layers, Search, Expand, Brain, Pencil, Trash2, ChevronRight, Loader2, FileText, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Stormer() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { sessions, loading, updateSession, deleteSession } = useStormSessions();
  const { addToast } = useNotifications();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("all");
  const [expandLoading, setExpandLoading] = useState(false);
  const [senseLoading, setSenseLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleInputRef = useRef(null);

  useEffect(() => {
    const sid = searchParams.get("session");
    if (sid && sessions.length > 0) {
      const found = sessions.find((s) => s.id === sid);
      if (found) setSelected(found);
    } else if (sessions.length > 0 && !selected) {
      setSelected(sessions[0]);
    }
  }, [sessions, searchParams]);

  useEffect(() => {
    if (selected) {
      const updated = sessions.find((s) => s.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [sessions]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
  }, [editingTitle]);

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (s.title || "").toLowerCase().includes(q) || (s.rawInput || "").toLowerCase().includes(q);
  });

  const handleExpand = async () => {
    if (!selected || expandLoading) return;
    setExpandLoading(true);
    try {
      const fn = httpsCallable(functions, "expandStorm");
      const res = await fn({ sessionId: selected.id, rawInput: selected.rawInput });
      addToast("Storm expanded!", "success");
    } catch (err) {
      addToast("Expansion failed — try again.", "error");
    } finally {
      setExpandLoading(false);
    }
  };

  const handleMakeSense = async () => {
    if (!selected || senseLoading) return;
    setSenseLoading(true);
    try {
      const fn = httpsCallable(functions, "makeSenseStorm");
      await fn({ sessionId: selected.id, rawInput: selected.rawInput });
      addToast("Made sense!", "success");
    } catch (err) {
      addToast("Rewrite failed — try again.", "error");
    } finally {
      setSenseLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!selected || !titleDraft.trim()) return;
    await updateSession(selected.id, { title: titleDraft.trim() });
    setEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteSession(selected.id);
    setConfirmDelete(false);
    setSelected(sessions.find((s) => s.id !== selected.id) || null);
    addToast("Storm deleted.", "info");
  };

  const SkeletonList = () => (
    <div className="space-y-2 p-3">
      {[1,2,3,4].map((i) => (
        <div key={i} className="p-3 rounded-xl bg-slate-800/60 space-y-2">
          <div className="h-3 rounded bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] animate-shimmer w-3/4" />
          <div className="h-2.5 rounded bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] animate-shimmer w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-[280px] shrink-0 border-r border-slate-700/50 flex flex-col bg-slate-900/40">
        <div className="p-3 border-b border-slate-700/50">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter storms…"
              className="w-full bg-slate-800 border border-slate-700/50 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <SkeletonList /> : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <Layers size={28} className="text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">{search ? "No matching storms" : "No storms yet. Go to Stormy!"}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filtered.map((s) => (
                <StormCard key={s.id} session={s} isSelected={selected?.id === s.id} onClick={() => setSelected(s)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Layers size={40} className="text-slate-700 mb-3" />
            <h2 className="text-base font-semibold text-slate-500 mb-1">Select a storm</h2>
            <p className="text-sm text-slate-600">Pick one from the list or capture a new idea in Stormy.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <div className="flex items-center gap-2">
                    <input ref={titleInputRef} type="text" value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                      className="flex-1 bg-slate-800 border border-indigo-500/60 rounded-lg px-3 py-1.5 text-lg font-bold text-slate-100 focus:outline-none"
                    />
                  </div>
                ) : (
                  <button onClick={() => { setTitleDraft(selected.title || ""); setEditingTitle(true); }}
                    className="flex items-center gap-2 group">
                    <h1 className="text-xl font-bold text-slate-100 text-left">{selected.title || "Untitled Storm"}</h1>
                    <Pencil size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </button>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {selected.createdAt?.toDate ? format(selected.createdAt.toDate(), "MMMM d, yyyy 'at' h:mm a") : ""}
                </p>
              </div>
              <button onClick={() => setConfirmDelete(true)}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors">
                <Trash2 size={16} />
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 w-fit">
              {[["all","All"],["raw","Raw"],["sense","Sense"],["expand","Expanded"]].map(([v,l]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    view === v ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
                  }`}>{l}</button>
              ))}
            </div>

            {/* Raw input */}
            {(view === "all" || view === "raw") && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText size={13} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Original Idea</span>
                </div>
                <blockquote className="border-l-2 border-indigo-500/40 pl-4 py-3 bg-indigo-500/5 rounded-r-xl">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.rawInput}</p>
                </blockquote>
              </div>
            )}

            {/* Sensible content */}
            {(view === "all" || view === "sense") && selected.sensibleContent && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain size={13} className="text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Made Sense</span>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.sensibleContent}</p>
                </div>
              </div>
            )}

            {/* Expanded content */}
            {(view === "all" || view === "expand") && selected.expandedContent && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Expand size={13} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Expanded</span>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{selected.expandedContent}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleExpand} disabled={expandLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {expandLoading ? <Loader2 size={14} className="animate-spin" /> : <Expand size={14} />}
                {selected.expandedContent ? "Re-Expand" : "Expand"}
              </button>
              <button onClick={handleMakeSense} disabled={senseLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {senseLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {selected.sensibleContent ? "Re-Make Sense" : "Make Sense"}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Storm Session"
        message="This will permanently delete this storm session and all its content. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
