import React from "react";
import { Link } from "react-router-dom";
import { CheckSquare, Layers, ArrowRight } from "lucide-react";

function hl(text, q) {
  if (!q || !text) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-amber-500/25 text-amber-300 rounded px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function SearchResults({ results, query }) {
  const { tasks = [], storms = [] } = results;
  if (!query)
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">Type to search tasks, storms, and chats</p>
      </div>
    );
  if (!tasks.length && !storms.length)
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">No results for "{query}"</p>
      </div>
    );
  return (
    <div className="space-y-6">
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare size={13} className="text-amber-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks</span>
            <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full ml-1">{tasks.length}</span>
          </div>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <Link
                key={t.id}
                to="/tasker"
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-colors group"
              >
                <CheckSquare size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{hl(t.title, query)}</p>
                  {t.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{hl(t.description, query)}</p>
                  )}
                  <span className={`text-xs ${ t.status === "completed" ? "text-green-500" : "text-slate-500"}`}>
                    {t.status}
                  </span>
                </div>
                <ArrowRight size={13} className="text-slate-600 group-hover:text-amber-400 transition-colors shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
      {storms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storms</span>
            <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full ml-1">{storms.length}</span>
          </div>
          <div className="space-y-1.5">
            {storms.map((s) => (
              <Link
                key={s.id}
                to={`/stormer?session=${s.id}`}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-colors group"
              >
                <Layers size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{hl(s.title, query)}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{hl(s.rawInput, query)}</p>
                </div>
                <ArrowRight size={13} className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
