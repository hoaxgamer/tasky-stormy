import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

const ICONS = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info };
const COLORS = {
  success: "border-green-500/30 bg-green-500/10 text-green-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

function Toast({ id, message, type = "info", onDismiss }) {
  const Icon = ICONS[type] || Info;
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(t);
  }, [id, onDismiss]);
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border backdrop-blur-sm shadow-lg max-w-sm w-full animate-slide-in-right ${COLORS[type]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <p className="text-xs flex-1 leading-relaxed text-slate-200">{message}</p>
      <button onClick={() => onDismiss(id)} className="text-slate-500 hover:text-slate-300 shrink-0 transition-colors">
        <X size={13} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => <Toast key={t.id} {...t} onDismiss={onDismiss} />)}
    </div>
  );
}
