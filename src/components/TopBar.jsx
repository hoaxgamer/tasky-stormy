import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Bell, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { format } from "date-fns";

const PAGE_TITLES = {
  "/": "Tasky",
  "/tasker": "Tasker",
  "/stormy": "Stormy",
  "/stormer": "Stormer",
  "/search": "Search",
  "/settings": "Settings",
};

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { upcomingReminders } = useNotifications();
  const [searchInput, setSearchInput] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3 bg-slate-900/95 border-b border-slate-800 backdrop-blur-sm">
      <span className="text-sm font-semibold text-slate-400 hidden md:block min-w-[80px]">
        {PAGE_TITLES[location.pathname] || "Tasky & Stormy"}
      </span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (searchInput.trim()) navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
        }}
        className="flex-1 max-w-md mx-auto hidden md:block"
      >
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks, storms, chats…"
            className="w-full bg-slate-800 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 transition-all"
          />
        </div>
      </form>
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-medium rounded-lg border border-amber-500/30 transition-colors"
        >
          <Plus size={13} /> Quick Add
        </button>
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {upcomingReminders.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 animate-slide-in-up overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="text-xs font-semibold text-slate-300">Upcoming Reminders (24h)</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {upcomingReminders.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    <Bell size={20} className="mx-auto mb-2 opacity-40" />
                    No upcoming reminders in 24h
                  </div>
                ) : (
                  upcomingReminders.map((t) => (
                    <div key={t.id} className="px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <p className="text-xs font-medium text-slate-200 truncate">{t.title}</p>
                      <p className="text-xs text-amber-400 mt-0.5">
                        {t.reminder?.toDate ? format(t.reminder.toDate(), "MMM d, h:mm a") : ""}
                      </p>
                      <button
                        onClick={() => { navigate("/tasker"); setBellOpen(false); }}
                        className="text-xs text-slate-500 hover:text-amber-400 mt-1 transition-colors"
                      >
                        View task →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full ring-1 ring-slate-700" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
            {(user?.displayName || "U")[0].toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
