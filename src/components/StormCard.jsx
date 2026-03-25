import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Expand, Brain } from "lucide-react";

export default function StormCard({ session, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-colors ${
        isSelected
          ? "bg-indigo-500/10 border border-indigo-500/30"
          : "hover:bg-slate-800 border border-transparent"
      }`}
    >
      <p className="text-xs font-semibold text-slate-200 truncate">
        {session.title || "Untitled Storm"}
      </p>
      <p className="text-xs text-slate-500 truncate mt-0.5 leading-relaxed">{session.rawInput}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-xs text-slate-600">
          {session.createdAt?.toDate
            ? formatDistanceToNow(session.createdAt.toDate(), { addSuffix: true })
            : ""}
        </span>
        {session.expandedContent && <Expand size={9} className="text-indigo-400" />}
        {session.sensibleContent && <Brain size={9} className="text-blue-400" />}
      </div>
    </button>
  );
}
