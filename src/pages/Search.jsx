import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTasks } from "../hooks/useTasks";
import { useStormSessions } from "../hooks/useStormSessions";
import { Search as SearchIcon, CheckSquare, Layers, MessageSquare, Filter, X, Calendar, Tag } from "lucide-react";
import SearchResults from "../components/SearchResults";
import { format } from "date-fns";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { sessions } = useStormSessions();
  const [queryText, setQueryText] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: "", source: "", tags: "" });
  const [taskyChats, setTaskyChats] = useState([]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQueryText(q);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "taskyChats"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setTaskyChats(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const handleSearch = (val) => {
    setQueryText(val);
    if (val.trim()) setSearchParams({ q: val.trim() });
    else setSearchParams({});
  };

  const lq = queryText.toLowerCase();

  const filteredTasks = tasks.filter((t) => {
    if (!lq) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.source && t.source !== filters.source) return false;
    if (filters.tags) {
      const filterTags = filters.tags.split(",").map((x) => x.trim().toLowerCase());
      if (!filterTags.some((ft) => (t.tags || []).some((tag) => tag.toLowerCase().includes(ft)))) return false;
    }
    return (t.title || "").toLowerCase().includes(lq) ||
      (t.description || "").toLowerCase().includes(lq) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(lq));
  });

  const filteredStorms = sessions.filter((s) => {
    if (!lq) return false;
    return (s.title || "").toLowerCase().includes(lq) ||
      (s.rawInput || "").toLowerCase().includes(lq) ||
      (s.expandedContent || "").toLowerCase().includes(lq) ||
      (s.sensibleContent || "").toLowerCase().includes(lq);
  });

  const filteredChats = taskyChats.filter((c) => {
    if (!lq) return false;
    return (c.message || "").toLowerCase().includes(lq);
  });

  const activeTasks = filteredTasks.filter((t) => t.status === "active");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const getTabResults = () => {
    switch (activeTab) {
      case "tasks": return { tasks: activeTasks, storms: [], chats: [] };
      case "completed": return { tasks: completedTasks, storms: [], chats: [] };
      case "storms": return { tasks: [], storms: filteredStorms, chats: [] };
      case "chats": return { tasks: [], storms: [], chats: filteredChats };
      default: return { tasks: filteredTasks, storms: filteredStorms, chats: filteredChats };
    }
  };

  const totalCount = filteredTasks.length + filteredStorms.length + filteredChats.length;
  const tabs = [
    { id: "all", label: "All", count: totalCount },
    { id: "tasks", label: "Tasks", count: activeTasks.length },
    { id: "completed", label: "Completed", count: completedTasks.length },
    { id: "storms", label: "Storms", count: filteredStorms.length },
    { id: "chats", label: "Chats", count: filteredChats.length },
  ];

  const ic = "bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500/40 transition-all";

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-slate-100 mb-4">Search</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" value={queryText}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search tasks, storms, chats…"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/40 transition-all"
            />
            {queryText && (
              <button onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
              showFilters ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "border-slate-700 text-slate-500 hover:text-slate-300"
            }`}>
            <Filter size={14} />Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl grid grid-cols-3 gap-3 animate-slide-in-up">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({...f, status: e.target.value}))}
                className={ic + " w-full"}>
                <option value="">Any</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Source</label>
              <select value={filters.source} onChange={(e) => setFilters((f) => ({...f, source: e.target.value}))}
                className={ic + " w-full"}>
                <option value="">Any</option>
                <option value="tasky">Tasky</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tags</label>
              <input type="text" value={filters.tags} onChange={(e) => setFilters((f) => ({...f, tags: e.target.value}))}
                placeholder="tag1, tag2" className={ic + " w-full"} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-700/50">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}>
            {tab.label}
            {queryText && tab.count > 0 && (
              <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <SearchResults results={getTabResults()} query={queryText} />
    </div>
  );
}
