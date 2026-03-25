import React from "react";
import { NavLink } from "react-router-dom";
import { Zap, CheckSquare, Layers, Search, Settings, LogOut, Home, CloudLightning } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Tasky", exact: true, color: "text-amber-400" },
  { to: "/tasker", icon: CheckSquare, label: "Tasker", color: "text-amber-400" },
  { to: "/stormy", icon: CloudLightning, label: "Stormy", color: "text-indigo-400" },
  { to: "/stormer", icon: Layers, label: "Stormer", color: "text-indigo-400" },
  { to: "/search", icon: Search, label: "Search", color: "text-slate-400" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-slate-800 bg-slate-900/80 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow">
          <Zap size={16} className="text-slate-900 fill-slate-900" />
        </div>
        <div>
          <span className="text-sm font-bold text-slate-100 block leading-none">Tasky &amp; Stormy</span>
          <span className="text-[10px] text-slate-500 leading-none">AI Productivity</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact, color }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? color : "text-slate-500"} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
            }`
          }
        >
          <Settings size={16} /> Settings
        </NavLink>
        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full ring-1 ring-slate-700" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
              {(user?.displayName || "U")[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
            {user?.displayName || user?.email}
          </span>
          <button
            onClick={logout}
            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex items-center safe-bottom">
      {NAV_ITEMS.map(({ to, icon: Icon, label, exact, color }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? "text-slate-100" : "text-slate-600"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={18} className={isActive ? color : "text-slate-600"} />
              <span className="text-[10px]">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
